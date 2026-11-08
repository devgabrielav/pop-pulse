import dns from 'dns';
import https from 'https';
import net from 'net';
import { config } from 'dotenv';
import nodeFetch from 'node-fetch';
import {
  extractAspectKeywords,
  extractSearchSubject,
  findRelevantWikiParagraphs,
  getPopCultureFeed,
  searchGoogleNews,
  searchTopicInfo,
  stripAccents,
} from './scraping.js';

const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: true });

if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}
dns.setDefaultResultOrder('ipv4first');
const origDnsLookup = dns.lookup.bind(dns);
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: 4 };
  } else {
    options = { ...options, family: 4 };
  }
  return origDnsLookup(hostname, options, callback);
};

config();

// In-memory conversation store keyed by chatId
const chatSessions = new Map();

const getSession = (chatId = 'default_chat') => {
  if (!chatSessions.has(chatId)) {
    chatSessions.set(chatId, {
      lastSubject: null,
      lastTitle: null,
      lastSearchData: null,
      lastLang: null,
      turnCountOnTopic: 0,
      history: [],
    });
  }
  return chatSessions.get(chatId);
};

const detectLanguage = (text = '', defaultLang = 'en') => {
  const q = stripAccents(text.toLowerCase());
  if (
    /[¿¡ñ]|(\b(cuales|peliculas|juegos|hablame|cuentame|noticias|lanzamientos|hola|quien|cuando|fecha|estreno|cuesta|precio)\b)/i.test(
      text.toLowerCase()
    )
  ) {
    return 'es';
  }
  if (
    /[ãõç]|(\b(quais|qual|quando|quanto|custa|preco|lancamento|lacamento|data|sai|saiu|vai|filme|filmes|jogos|jogo|noticias|lancamentos|ola|oi|fale|sobre|historia|personagens|plataformas|certeza|nao|entendi|cantora|protagonista)\b)/i.test(
      q
    )
  ) {
    return 'pt';
  }
  if (
    /\b(what|when|tell|movies|games|news|releases|release|date|trending|right now|who|hello|hi|how much|price|know|about)\b/i.test(
      q
    )
  ) {
    return 'en';
  }
  return defaultLang || 'en';
};

const isGlobalChartQuery = (q = '') => {
  const norm = stripAccents(q.toLowerCase());
  return /\b(top|melhores|em alta|no topo|trending|chart|charting|novos jogos na steam|new games on steam|nuevos juegos en steam|ultimas noticias|breaking.*news)\b/i.test(
    norm
  );
};

const extractInstallmentNumber = (str = '') => {
  const romanMap = {
    i: '1',
    ii: '2',
    iii: '3',
    iv: '4',
    v: '5',
    vi: '6',
    vii: '7',
    viii: '8',
    ix: '9',
    x: '10',
  };
  const m = str.toLowerCase().match(/\b(\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/);
  if (!m) return null;
  return romanMap[m[1]] || m[1];
};

const isAliasOfCurrentTopic = (newSubj = '', session) => {
  if (!newSubj || !session?.lastSubject) return false;
  const normNew = stripAccents(newSubj.toLowerCase()).trim();
  const normLastSubj = stripAccents((session.lastSubject || '').toLowerCase()).trim();
  const normLastTitle = stripAccents((session.lastTitle || '').toLowerCase()).trim();

  // If both have installment numbers (e.g. "gta 6" vs "gta iv") and the numbers differ, it is NOT an alias!
  const newNum = extractInstallmentNumber(normNew);
  const lastNum =
    extractInstallmentNumber(normLastSubj) || extractInstallmentNumber(normLastTitle);
  if (newNum && lastNum && newNum !== lastNum) {
    return false;
  }

  if (normNew === normLastSubj || normNew === normLastTitle) return true;

  // If the new subject has no conflicting number and is a prefix/substring of the active subject (e.g. "gta" when active is "gta 6")
  if (!newNum && (normLastSubj.includes(normNew) || normLastTitle.includes(normNew))) {
    return true;
  }

  const acronymMap = {
    gta: 'grand theft auto',
    cod: 'call of duty',
    gow: 'god of war',
    re: 'resident evil',
    tlou: 'the last of us',
    rdr: 'red dead redemption',
    zelda: 'legend of zelda',
  };
  const baseNew = normNew.replace(/\b(\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, '').trim();
  if (
    acronymMap[baseNew] &&
    normLastTitle.includes(acronymMap[baseNew]) &&
    (!newNum || newNum === lastNum)
  ) {
    return true;
  }

  return false;
};

const hasStrongFollowUpSignal = (query = '') => {
  const norm = stripAccents(query.toLowerCase());
  return /\b(ele|ela|dele|dela|nele|nela|isso|disso|nisso|esse|essa|desse|dessa|a cantora|o cantor|o jogo|o filme|a serie|a banda|tem certeza|are you sure|what about now|e agora|nao entendi|como assim)\b/.test(
    norm
  );
};

const buildFocusedTopicReply = (userMessage, searchData, lang = 'en', turnCount = 1) => {
  const q = stripAccents((userMessage || '').toLowerCase());
  const { subject, steamGame, wikiSummary, mediaMatches = [], topicNews = [] } =
    searchData || {};

  const title =
    steamGame?.name || wikiSummary?.title || mediaMatches[0]?.title || subject;
  const releaseDate =
    steamGame?.releaseDate ||
    wikiSummary?.released ||
    mediaMatches[0]?.releaseDate ||
    null;
  const creator =
    steamGame?.developers ||
    wikiSummary?.creator ||
    mediaMatches[0]?.artist ||
    null;
  const publisher = steamGame?.publishers || wikiSummary?.publisher || null;
  const platforms = wikiSummary?.platforms || steamGame?.platforms || null;
  const genre =
    steamGame?.genres || wikiSummary?.genre || mediaMatches[0]?.genre || null;
  const paragraphs = wikiSummary?.paragraphs || [];
  const mainSummary =
    paragraphs[0] ||
    steamGame?.description ||
    mediaMatches[0]?.summary ||
    '';

  const isPersonOrArtist =
    wikiSummary?.extract &&
    /\b(cantor|cantora|compositor|compositora|musico|musicista|ator|atriz|banda|singer|songwriter|musician|rapper|actor|actress)\b/i.test(
      stripAccents(wikiSummary.extract.slice(0, 300))
    );

  const askFilmForArtist =
    isPersonOrArtist &&
    /\b(filme|filmes|movie|movies|film|cinema|protagonista|atriz|ator)\b/i.test(q);

  if (askFilmForArtist && (topicNews.length > 0 || wikiSummary)) {
    const deepFilmParas = findRelevantWikiParagraphs(userMessage, wikiSummary, 4);
    const newsList = topicNews.slice(0, 4).map((n) => `• ${n}`).join('\n');
    const wikiBlock = deepFilmParas.length > 0 ? `\n\n📖 **Filmografia / Atuação:**\n${deepFilmParas.join('\n\n')}` : '';
    if (lang === 'pt') {
      return `🎬 Sobre **${title}** no cinema e TV:\n${newsList ? `\n📰 **Notícias Recentes:**\n${newsList}` : ''}${wikiBlock}`;
    }
    if (lang === 'es') {
      return `🎬 Sobre **${title}** en el cine y TV:\n${newsList ? `\n📰 **Noticias Recientes:**\n${newsList}` : ''}${wikiBlock}`;
    }
    return `🎬 Regarding **${title}** in film & TV:\n${newsList ? `\n📰 **Recent Headlines:**\n${newsList}` : ''}${wikiBlock}`;
  }

  const askSure = /\b(certeza|sure|what about now|e agora|verdade|confirmado)\b/i.test(q);
  if (askSure && releaseDate) {
    if (lang === 'pt') {
      return `✅ Sim! A data oficial confirmada para **${title}** é **${releaseDate}**${
        platforms ? ` (${platforms})` : ''
      }.${
        steamGame?.price
          ? ` O preço na Steam é **${steamGame.price}**.`
          : ' O preço de pré-venda ainda não foi divulgado oficialmente.'
      }`;
    }
    if (lang === 'es') {
      return `✅ ¡Sí! La fecha oficial confirmada para **${title}** es **${releaseDate}**${
        platforms ? ` (${platforms})` : ''
      }.`;
    }
    return `✅ Yes! **${title}** is officially scheduled to release on **${releaseDate}**${
      platforms ? ` (${platforms})` : ''
    }.${
      steamGame?.price
        ? ` Its Steam price is **${steamGame.price}**.`
        : ' Official store pricing has not been announced yet.'
    }`;
  }

  const askDate =
    /\b(release|released|date|when|launch|data|lancamento|lacamento|lanca|lancar|lancado|quando|sai|saiu|sair|estreia|fecha|lanzamiento|estreno|cuando|sale|salio)\b/i.test(
      q
    );
  const askPrice =
    /\b(price|cost|much|quanto|custa|custar|custara|preco|valor|gratis|pago|cuanto|cuesta|precio)\b/i.test(
      q
    );
  const askPlatforms =
    /\b(platform|platforms|console|consoles|pc|windows|ps5|ps4|playstation|xbox|switch|plataforma|plataformas|onde jogar|roda|rodar|consolas)\b/i.test(
      q
    );
  const askCreator =
    /\b(who made|developer|developers|developing|developed|studio|publisher|director|directed|author|quem fez|quem criou|quem desenvolveu|desenvolvendo|desenvolveu|desenvolve|desenvolvedora|desenvolvedor|estudio|publicadora|diretor|dirigiu|criador|quien hizo|desarrollador|desarrollando)\b/i.test(
      q
    );
  const askStoryOrCharacters =
    /\b(story|plot|synopsis|characters|character|protagonist|protagonists|setting|city|map|where|historia|enredo|sinopse|personagens|personagem|protagonista|protagonistas|onde se passa|cidade|mapa|trata|trama|sinopsis|personajes)\b/i.test(
      q
    );
  const askMore =
    /\b(more|else|details|mais|detalhes|curiosidade|curiosidades|outro|outra|mas|detalles)\b/i.test(
      q
    );

  // 1. Specific Intent: Platforms / Consoles / PC
  if (askPlatforms) {
    const asksPc = /\b(pc|windows|steam)\b/i.test(q);
    const knownPlatforms = platforms || (steamGame ? 'PC (Steam)' : null);

    if (knownPlatforms) {
      const hasPc = /pc|windows|microsoft windows/i.test(knownPlatforms) || Boolean(steamGame);
      if (lang === 'pt') {
        if (asksPc && !hasPc) {
          return `🎮 Até o momento, **${title}** foi confirmado apenas para **${knownPlatforms}**${
            releaseDate ? ` (lançamento em ${releaseDate})` : ''
          }. Uma versão para **PC** ainda não teve data anunciada oficialmente.`;
        }
        return `🎮 **${title}** está confirmado para as seguintes plataformas: **${knownPlatforms}**${
          steamGame?.price ? ` (Preço na Steam: ${steamGame.price})` : ''
        }.`;
      }
      if (lang === 'es') {
        if (asksPc && !hasPc) {
          return `🎮 Por ahora, **${title}** está confirmado únicamente para **${knownPlatforms}**. Aún no se ha anunciado oficialmente una fecha para la versión de **PC**.`;
        }
        return `🎮 **${title}** está disponible/confirmado para: **${knownPlatforms}**.`;
      }
      if (asksPc && !hasPc) {
        return `🎮 So far, **${title}** is confirmed only for **${knownPlatforms}**. A **PC** version has not been officially announced yet.`;
      }
      return `🎮 **${title}** is available/confirmed for: **${knownPlatforms}**.`;
    }
  }

  // 2. Specific Intent: Price / Cost
  if (askPrice) {
    if (steamGame?.price && !steamGame.price.includes('Ainda não divulgado')) {
      if (lang === 'pt') {
        return `💰 **${title}** custa atualmente **${steamGame.price}** na Steam${
          releaseDate ? ` (Lançamento: ${releaseDate})` : ''
        }.`;
      }
      if (lang === 'es') {
        return `💰 **${title}** cuesta actualmente **${steamGame.price}** en Steam${
          releaseDate ? ` (Lanzamiento: ${releaseDate})` : ''
        }.`;
      }
      return `💰 **${title}** is currently priced at **${steamGame.price}** on Steam${
        releaseDate ? ` (Release date: ${releaseDate})` : ''
      }.`;
    } else {
      if (lang === 'pt') {
        return `💰 O preço oficial de **${title}** em Real (R$) ainda não foi liberado nas lojas digitais${
          releaseDate ? `, já que o lançamento está previsto para **${releaseDate}**` : ''
        }${platforms ? ` (${platforms})` : ''}.`;
      }
      if (lang === 'es') {
        return `💰 El precio oficial de **${title}** aún no ha sido anunciado en las tiendas digitales${
          releaseDate ? `, ya que su lanzamiento está previsto para el **${releaseDate}**` : ''
        }.`;
      }
      return `💰 The official store price for **${title}** has not been announced yet${
        releaseDate ? `, as it is scheduled to release on **${releaseDate}**` : ''
      }.`;
    }
  }

  // 3. Specific Intent: Developer / Studio / Creator
  if (askCreator && (creator || publisher)) {
    const devParagraph =
      paragraphs.find((p) =>
        /desenvolv|produc|produz|criad|diret|dirig|develop|direct/i.test(stripAccents(p))
      ) || '';
    if (lang === 'pt') {
      return `🏢 **${title}** é desenvolvido por **${creator || publisher}**${
        publisher && publisher !== creator ? ` e publicado por **${publisher}**` : ''
      }.${devParagraph ? `\n\n${devParagraph}` : ''}`;
    }
    if (lang === 'es') {
      return `🏢 **${title}** es desarrollado por **${creator || publisher}**${
        publisher && publisher !== creator ? ` y publicado por **${publisher}**` : ''
      }.${devParagraph ? `\n\n${devParagraph}` : ''}`;
    }
    return `🏢 **${title}** is developed by **${creator || publisher}**${
      publisher && publisher !== creator ? ` and published by **${publisher}**` : ''
    }.${devParagraph ? `\n\n${devParagraph}` : ''}`;
  }

  // 4. Specific Intent: Story / Plot / Characters / Setting
  if (askStoryOrCharacters) {
    const storyParagraphs = paragraphs.filter((p) =>
      /ambientad|historia|seguir|protagonista|personage|mundo|cidade|trama|joga|story|plot|set in|follow|character|player/i.test(
        stripAccents(p)
      )
    );
    const chosenText =
      storyParagraphs.length > 0
        ? storyParagraphs.slice(0, 2).join('\n\n')
        : paragraphs.slice(0, 2).join('\n\n') || mainSummary;

    if (lang === 'pt') {
      return `📖 **Sobre a história e universo de ${title}:**\n\n${chosenText}`;
    }
    if (lang === 'es') {
      return `📖 **Sobre la historia y el universo de ${title}:**\n\n${chosenText}`;
    }
    return `📖 **Story & Setting of ${title}:**\n\n${chosenText}`;
  }

  // 5. Specific Intent: Release Date
  if (askDate) {
    if (releaseDate) {
      if (lang === 'pt') {
        return `📅 **${title}** tem lançamento marcado para **${releaseDate}**${
          platforms ? ` (${platforms})` : ''
        }.${steamGame?.comingSoon ? ' O título ainda está em pré-lançamento.' : ''}`;
      }
      if (lang === 'es') {
        return `📅 **${title}** tiene su lanzamiento previsto para el **${releaseDate}**${
          platforms ? ` (${platforms})` : ''
        }.`;
      }
      return `📅 **${title}** is set to release on **${releaseDate}**${
        platforms ? ` (${platforms})` : ''
      }.`;
    }
  }

  // 6. Follow-up "Tell me more" or subsequent general turn on the same topic
  if ((askMore || turnCount > 1) && paragraphs.length > 1) {
    const extraParagraphs = paragraphs.slice(1, 3).join('\n\n');
    if (lang === 'pt') {
      return `✨ **Mais detalhes sobre ${title}:**\n\n${extraParagraphs}`;
    }
    if (lang === 'es') {
      return `✨ **Más detalles sobre ${title}:**\n\n${extraParagraphs}`;
    }
    return `✨ **More details about ${title}:**\n\n${extraParagraphs}`;
  }

  // 7. Default First-Turn Overview of the Topic
  const bulletLines = [];
  if (releaseDate && !isPersonOrArtist) {
    bulletLines.push(
      lang === 'pt'
        ? `• **Lançamento:** ${releaseDate}`
        : lang === 'es'
        ? `• **Lanzamiento:** ${releaseDate}`
        : `• **Release Date:** ${releaseDate}`
    );
  }
  if (steamGame?.price) {
    bulletLines.push(
      lang === 'pt'
        ? `• **Preço (Steam):** ${steamGame.price}`
        : lang === 'es'
        ? `• **Precio (Steam):** ${steamGame.price}`
        : `• **Price (Steam):** ${steamGame.price}`
    );
  }
  if (creator && !isPersonOrArtist) {
    bulletLines.push(
      lang === 'pt'
        ? `• **Estúdio / Criador:** ${creator}`
        : lang === 'es'
        ? `• **Estudio / Creador:** ${creator}`
        : `• **Studio / Creator:** ${creator}`
    );
  }
  if (platforms && !isPersonOrArtist) {
    bulletLines.push(
      lang === 'pt'
        ? `• **Plataformas:** ${platforms}`
        : lang === 'es'
        ? `• **Plataformas:** ${platforms}`
        : `• **Platforms:** ${platforms}`
    );
  }
  if (genre) {
    bulletLines.push(
      lang === 'pt'
        ? `• **Gênero:** ${genre}`
        : lang === 'es'
        ? `• **Género:** ${genre}`
        : `• **Genre:** ${genre}`
    );
  }

  const newsBlock =
    topicNews.length > 0
      ? `\n\n📰 **${
          lang === 'pt'
            ? 'Notícias Recentes'
            : lang === 'es'
            ? 'Noticias Recientes'
            : 'Recent News'
        }:**\n${topicNews
          .slice(0, 2)
          .map((n) => `• ${n}`)
          .join('\n')}`
      : '';

  return `✨ **${title}**${bulletLines.length ? `\n${bulletLines.join('\n')}` : ''}${
    mainSummary ? `\n\n${mainSummary}` : ''
  }${newsBlock}`;
};

const buildLocalFallbackReply = (
  userMessage,
  feed,
  searchData,
  lang = 'en',
  turnCount = 1
) => {
  const q = (userMessage || '').toLowerCase();
  const resolvedLang = detectLanguage(userMessage, lang);
  const { subject, steamGame, wikiSummary, mediaMatches = [] } = searchData || {};

  if (subject && (steamGame || wikiSummary || mediaMatches.length > 0)) {
    return buildFocusedTopicReply(userMessage, searchData, resolvedLang, turnCount);
  }

  const matchedItem = (feed.items || []).find(
    (item) => item.title && q.includes(item.title.toLowerCase())
  );
  if (matchedItem) {
    if (resolvedLang === 'pt') {
      return `✨ **${matchedItem.title}** (${matchedItem.subtitle})\n• **Categoria:** ${matchedItem.genre} | **Status:** ${matchedItem.badge}\n• **Data:** ${matchedItem.releaseDate} | **Fonte:** ${matchedItem.source}\n\n${matchedItem.summary}`;
    }
    if (resolvedLang === 'es') {
      return `✨ **${matchedItem.title}** (${matchedItem.subtitle})\n• **Categoría:** ${matchedItem.genre} | **Estado:** ${matchedItem.badge}\n• **Fecha:** ${matchedItem.releaseDate} | **Fuente:** ${matchedItem.source}\n\n${matchedItem.summary}`;
    }
    return `✨ **${matchedItem.title}** (${matchedItem.subtitle})\n• **Category:** ${matchedItem.genre} | **Tag:** ${matchedItem.badge}\n• **Date:** ${matchedItem.releaseDate} | **Source:** ${matchedItem.source}\n\n${matchedItem.summary}`;
  }

  const topMusic = (feed.music || [])
    .slice(0, 4)
    .map((m) => `• **${m.title}** — ${m.subtitle} (${m.genre}, ${m.releaseDate})`)
    .join('\n');

  const topGames = (feed.games || [])
    .slice(0, 4)
    .map((g) => `• **${g.title}** — ${g.genre} (${g.releaseDate})`)
    .join('\n');

  const topMovies = (feed.movies || [])
    .slice(0, 4)
    .map((m) => `• **${m.title}** — ${m.subtitle} (${m.genre}, ${m.releaseDate})`)
    .join('\n');

  const topNews = (feed.news || [])
    .slice(0, 4)
    .map((n) => `• [${n.source}] **${n.title}** (${n.releaseDate})`)
    .join('\n');

  if (
    q.includes('music') ||
    q.includes('album') ||
    q.includes('song') ||
    q.includes('música') ||
    q.includes('musica') ||
    q.includes('álbum') ||
    q.includes('álbuns') ||
    q.includes('albuns') ||
    q.includes('álbumes') ||
    q.includes('canción') ||
    q.includes('canciones')
  ) {
    const musicNews = (feed.news || [])
      .filter((n) => n.category === 'music')
      .slice(0, 2)
      .map((n) => `• ${n.title} (${n.source})`)
      .join('\n');
    if (resolvedLang === 'pt') {
      return `🎵 **Destaques de Música no Brasil Agora:**\n${topMusic}\n\n📰 **Notícias da Música:**\n${musicNews}`;
    }
    if (resolvedLang === 'es') {
      return `🎵 **Principales Lanzamientos de Música Ahora:**\n${topMusic}\n\n📰 **Noticias de Música:**\n${musicNews}`;
    }
    return `🎵 **Top Music Releases & Charts Right Now:**\n${topMusic}\n\n📰 **Latest Music News:**\n${musicNews}`;
  }

  if (
    q.includes('game') ||
    q.includes('steam') ||
    q.includes('play') ||
    q.includes('jogo') ||
    q.includes('juego') ||
    q.includes('gamer')
  ) {
    const gameNews = (feed.news || [])
      .filter((n) => n.category === 'games')
      .slice(0, 2)
      .map((n) => `• ${n.title} (${n.source})`)
      .join('\n');
    if (resolvedLang === 'pt') {
      return `🎮 **Lançamentos e Destaques de Jogos (Steam Brasil):**\n${topGames}\n\n📰 **Notícias de Jogos (IGN Brasil):**\n${gameNews}`;
    }
    if (resolvedLang === 'es') {
      return `🎮 **Lanzamientos y Juegos en Tendencia (Steam):**\n${topGames}\n\n📰 **Noticias de Videojuegos (IGN España):**\n${gameNews}`;
    }
    return `🎮 **Trending & New Game Releases (Steam):**\n${topGames}\n\n📰 **Latest Gaming News:**\n${gameNews}`;
  }

  if (
    q.includes('movie') ||
    q.includes('film') ||
    q.includes('cinema') ||
    q.includes('cine') ||
    q.includes('filme') ||
    q.includes('película') ||
    q.includes('pelicula') ||
    q.includes('watch')
  ) {
    const movieNews = (feed.news || [])
      .filter((n) => n.category === 'movies')
      .slice(0, 2)
      .map((n) => `• ${n.title} (${n.source})`)
      .join('\n');
    if (resolvedLang === 'pt') {
      return `🎬 **Filmes em Alta no Brasil:**\n${topMovies}\n\n📰 **Notícias de Cultura Pop e Cinema:**\n${movieNews}`;
    }
    if (resolvedLang === 'es') {
      return `🎬 **Películas #1 y Estrenos Recientes:**\n${topMovies}\n\n📰 **Noticias de Cine y Entretenimiento:**\n${movieNews}`;
    }
    return `🎬 **Top Movies & Recent Releases:**\n${topMovies}\n\n📰 **Cinema & Entertainment News:**\n${movieNews}`;
  }

  if (
    q.includes('news') ||
    q.includes('notícia') ||
    q.includes('noticia') ||
    q.includes('latest') ||
    q.includes('recent') ||
    q.includes('novidade')
  ) {
    if (resolvedLang === 'pt') {
      return `📰 **Últimas Notícias da Cultura Pop no Brasil:**\n${topNews}\n\n🎵 **Música #1:** ${feed.music?.[0]?.title || 'N/A'} (${feed.music?.[0]?.subtitle || ''})\n🎮 **Jogo em Destaque:** ${feed.games?.[0]?.title || 'N/A'}\n🎬 **Filme #1:** ${feed.movies?.[0]?.title || 'N/A'}`;
    }
    if (resolvedLang === 'es') {
      return `📰 **Últimas Noticias de Cultura Pop:**\n${topNews}\n\n🎵 **Álbum #1:** ${feed.music?.[0]?.title || 'N/A'} (${feed.music?.[0]?.subtitle || ''})\n🎮 **Juego Destacado:** ${feed.games?.[0]?.title || 'N/A'}\n🎬 **Película #1:** ${feed.movies?.[0]?.title || 'N/A'}`;
    }
    return `📰 **Breaking Pop Culture News:**\n${topNews}\n\n🎵 **#1 Album:** ${feed.music?.[0]?.title || 'N/A'} by ${feed.music?.[0]?.subtitle || ''}\n🎮 **Featured Game:** ${feed.games?.[0]?.title || 'N/A'}\n🎬 **#1 Movie:** ${feed.movies?.[0]?.title || 'N/A'}`;
  }

  if (resolvedLang === 'pt') {
    return `Olá! Eu sou a **Aria**, sua IA de Cultura Pop! 🎵🎮🎬\n\nAqui está um resumo do que está bombando no Brasil agora:\n• **Música (#1):** ${feed.music?.[0]?.title || 'N/A'} — ${feed.music?.[0]?.subtitle || ''}\n• **Jogos (Steam):** ${feed.games?.[0]?.title || 'N/A'} (${feed.games?.[0]?.genre || ''})\n• **Filmes (#1):** ${feed.movies?.[0]?.title || 'N/A'} (${feed.movies?.[0]?.subtitle || ''})\n\nPergunte-me sobre qualquer jogo, filme ou artista!`;
  }
  if (resolvedLang === 'es') {
    return `¡Hola! Soy **Aria**, tu Asistente de IA de Cultura Pop. 🎵🎮🎬\n\nAquí tienes un resumen de lo que está en tendencia ahora:\n• **Música (#1):** ${feed.music?.[0]?.title || 'N/A'} — ${feed.music?.[0]?.subtitle || ''}\n• **Juegos (Steam):** ${feed.games?.[0]?.title || 'N/A'} (${feed.games?.[0]?.genre || ''})\n• **Películas (#1):** ${feed.movies?.[0]?.title || 'N/A'} (${feed.movies?.[0]?.subtitle || ''})\n\n¡Pregúntame sobre cualquier videojuego, película o artista!`;
  }

  return `Hey there! I'm **Aria**, your Pop Culture AI Assistant! 🎵🎮🎬\n\nHere's a quick pulse on what's trending right now:\n• **Top Music:** ${feed.music?.[0]?.title || 'N/A'} by ${feed.music?.[0]?.subtitle || ''}\n• **New on Steam:** ${feed.games?.[0]?.title || 'N/A'} (${feed.games?.[0]?.genre || ''})\n• **#1 Movie:** ${feed.movies?.[0]?.title || 'N/A'} (${feed.movies?.[0]?.subtitle || ''})\n\nAsk me about any game, movie, or artist!`;
};

const isExplicitTopicSwitch = (query = '') => {
  const norm = stripAccents(query.toLowerCase());
  return /\b(mudando de assunto|mudar de assunto|outro assunto|outro tema|changing the subject|change the subject|different topic|another topic|cambiando de tema|cambiar de tema|otro tema)\b/.test(
    norm
  );
};

const withTimeout = (promise, ms, fallbackValue = null) =>
  Promise.race([
    promise.catch(() => fallbackValue),
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);

export const callGemini = async (
  userMessage,
  lang = 'en',
  chatId = 'default_chat'
) => {
  const resolvedLang = detectLanguage(userMessage, lang);
  const session = getSession(chatId);
  const rawExtracted = extractSearchSubject(userMessage);
  const isGlobalQuery = isGlobalChartQuery(userMessage);
  const isFollowUpPronoun = hasStrongFollowUpSignal(userMessage);
  const wantsTopicSwitch = isExplicitTopicSwitch(userMessage);
  const hasNewEntity =
    Boolean(rawExtracted) && !isAliasOfCurrentTopic(rawExtracted, session);

  let searchData = null;
  let turnCount = 1;

  const topicSearchTask = (async () => {
    if (isGlobalQuery && !rawExtracted) {
      return {
        subject: '',
        contextText: '',
        steamGame: null,
        wikiSummary: null,
        mediaMatches: [],
        topicNews: [],
      };
    }

    if (
      session.lastSearchData &&
      !wantsTopicSwitch &&
      (!rawExtracted ||
        isAliasOfCurrentTopic(rawExtracted, session) ||
        (isFollowUpPronoun && !hasNewEntity && !extractInstallmentNumber(rawExtracted)))
    ) {
      // Follow-up question on the current topic!
      turnCount = session.turnCountOnTopic + 1;
      session.turnCountOnTopic = turnCount;

      let currentData;
      if (session.lastLang !== resolvedLang && session.lastSubject) {
        currentData = await searchTopicInfo(
          userMessage,
          resolvedLang,
          session.lastSubject
        );
      } else {
        currentData = { ...session.lastSearchData };
      }

      const relevantParas = findRelevantWikiParagraphs(
        userMessage,
        currentData.wikiSummary,
        6
      );
      const aspect = extractAspectKeywords(userMessage);
      let extraContext = '';

      if (relevantParas.length > 0) {
        extraContext += `\n\n[WIKIPEDIA SECTIONS MATCHING CURRENT QUESTION]\n${relevantParas.join(
          '\n\n'
        )}`;
      }

      if (aspect || rawExtracted) {
        const subQuery = `${session.lastTitle || session.lastSubject} ${
          aspect || rawExtracted
        }`.trim();
        const freshNews = await searchGoogleNews(subQuery, resolvedLang);
        if (freshNews.length > 0) {
          currentData.topicNews = freshNews;
          extraContext += `\n\n[LIVE NEWS FOR "${subQuery.toUpperCase()}"]\n${freshNews
            .map((n) => `• ${n}`)
            .join('\n')}`;
        }
      }

      if (extraContext) {
        currentData.contextText = `${session.lastSearchData.contextText}${extraContext}`;
      }

      session.lastSearchData = currentData;
      session.lastLang = resolvedLang;
      return currentData;
    }

    if (rawExtracted) {
      const candidateData = await searchTopicInfo(
        userMessage,
        resolvedLang,
        rawExtracted
      );
      if (
        candidateData.steamGame ||
        candidateData.wikiSummary ||
        candidateData.mediaMatches?.length > 0 ||
        candidateData.topicNews?.length > 0
      ) {
        session.lastSubject = rawExtracted;
        session.lastTitle =
          candidateData.steamGame?.name ||
          candidateData.wikiSummary?.title ||
          candidateData.mediaMatches?.[0]?.title ||
          rawExtracted;
        session.lastSearchData = candidateData;
        session.lastLang = resolvedLang;
        session.turnCountOnTopic = 1;
        return candidateData;
      } else if (session.lastSearchData) {
        return session.lastSearchData;
      }
    }

    return null;
  })();

  const emptyFeed = { items: [], music: [], games: [], movies: [], news: [] };
  const [resolvedSearchData, feed] = await Promise.all([
    withTimeout(topicSearchTask, 4500, session.lastSearchData || null),
    withTimeout(getPopCultureFeed(resolvedLang), 4500, emptyFeed),
  ]);
  searchData = resolvedSearchData;

  // Reload .env dynamically
  config({ override: true });
  const geminiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

  const isPlaceholderKey =
    !geminiKey ||
    geminiKey === 'SUA_CHAVE_AQUI' ||
    geminiKey === 'YOUR_GEMINI_API_KEY_HERE' ||
    geminiKey === 'YOUR_API_KEY_HERE' ||
    geminiKey.startsWith('sk-or-');

  if (!isPlaceholderKey) {
    const langName =
      resolvedLang === 'pt'
        ? 'Brazilian Portuguese (Português do Brasil, using R$ for prices)'
        : resolvedLang === 'es'
        ? 'Spanish (Español)'
        : 'English';

    const musicContext = (feed.music || [])
      .slice(0, 5)
      .map((m) => `- ${m.title} by ${m.subtitle} (${m.genre}, Released: ${m.releaseDate})`)
      .join('\n');

    const gamesContext = (feed.games || [])
      .slice(0, 5)
      .map((g) => `- ${g.title} (${g.badge}, Price: ${g.genre}, ${g.subtitle})`)
      .join('\n');

    const moviesContext = (feed.movies || [])
      .slice(0, 5)
      .map((m) => `- ${m.title} (${m.subtitle}, ${m.genre}, Released: ${m.releaseDate}): ${m.summary}`)
      .join('\n');

    const newsContext = (feed.news || [])
      .slice(0, 6)
      .map((n) => `- [${n.source}] ${n.title} (${n.releaseDate})`)
      .join('\n');

    const fullSystemPrompt = `
You are Aria, an enthusiastic, knowledgeable Pop Culture AI Assistant specializing in Music, Video Games, and Movies/TV.
- Always respond in ${langName}.
- Current active topic in conversation: **${session.lastTitle || 'General Pop Culture'}**.
- CRITICAL RULES:
  1. Always answer the user's latest question directly and completely! If the user switches to a new artist, movie, game, or topic (or asks to change the subject), immediately talk about that new topic enthusiastically — NEVER refuse to switch topics or force them to stay on a previous topic.
  2. The section \`=== VERIFIED FACTS & LIVE NEWS FOR ACTIVE TOPIC ===\` below contains encyclopedia data, Steam store data, and live 2026 news fetched for **${
    session.lastTitle || 'the user query'
  }**. Combine those facts with your own broad knowledge of music, movies, games, and pop culture history.
  3. NEVER say "I didn't find it in the current feed" or "it is not in the feed".
  4. If the user asks a short follow-up question (like "are you sure?", "tem certeza disso?", "qual o preço dele?", "e no Brasil?") without naming a new subject, keep answering about the current topic.
  5. Always finish your sentences and provide a complete, well-structured, engaging answer using **bold** for highlights and • for bullet points (do not use markdown # headings or --- dividers).

${
  searchData?.contextText
    ? `=== VERIFIED FACTS & LIVE NEWS FOR ACTIVE TOPIC (${session.lastTitle}) ===\n${searchData.contextText}\n`
    : ''
}
=== GENERAL TRENDING SIDEBAR CHARTS (Use only if user asks what is trending overall) ===
[Music Charts]
${musicContext}
[Steam Games]
${gamesContext}
[Movies]
${moviesContext}
[General News]
${newsContext}
`;

    const rawTurns = [
      ...session.history.slice(-8),
      { role: 'user', content: userMessage },
    ];
    const contents = [];
    for (const turn of rawTurns) {
      const geminiRole =
        turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
      const text = String(turn.content || '').trim();
      if (!text) continue;
      if (contents.length === 0 && geminiRole !== 'user') continue;
      const prev = contents[contents.length - 1];
      if (prev && prev.role === geminiRole) {
        prev.parts[0].text += `\n\n${text}`;
      } else {
        contents.push({
          role: geminiRole,
          parts: [{ text }],
        });
      }
    }

    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
    ];

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await nodeFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            geminiKey
          )}`,
          {
            method: 'POST',
            agent: ipv4HttpsAgent,
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: fullSystemPrompt }],
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
              },
            }),
          }
        );
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
          console.error(
            `Gemini API error with model ${model}:`,
            data?.error?.message || response.statusText
          );
          if (
            response.status === 400 &&
            /API_KEY_INVALID|API key not valid/i.test(data?.error?.message || '')
          ) {
            break;
          }
          continue;
        }

        const parts = data?.candidates?.[0]?.content?.parts || [];
        const visibleParts = parts.filter((part) => !part.thought);
        const content = (visibleParts.length > 0 ? visibleParts : parts)
          .map((part) => part.text || '')
          .join('')
          .trim();

        if (content) {
          session.history.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content }
          );
          return content;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Error calling Gemini with model ${model}:`, err.message);
      }
    }
  }

  const reply = buildLocalFallbackReply(
    userMessage,
    feed,
    searchData,
    resolvedLang,
    turnCount
  );

  session.history.push(
    { role: 'user', content: userMessage },
    { role: 'assistant', content: reply }
  );

  return reply;
};

export const callOpenRouter = callGemini;

export const getLatestPopCulture = async (lang = 'en') => {
  return await getPopCultureFeed(lang);
};

export const getLatestMatches = async (lang = 'en') => {
  const feed = await getPopCultureFeed(lang);
  return feed.items;
};
