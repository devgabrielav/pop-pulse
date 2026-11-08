import http from 'http';
import https from 'https';
import nodeFetch from 'node-fetch';

const httpAgent = new http.Agent({ family: 4, keepAlive: true });
const httpsAgent = new https.Agent({ family: 4, keepAlive: true });
const ipv4AgentSelector = (parsedURL) =>
  parsedURL.protocol === 'http:' ? httpAgent : httpsAgent;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cachedFeeds = {};

const decodeHtmlEntities = (str = '') => {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '—')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
};

export const stripAccents = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const fetchWithTimeout = async (url, options = {}, timeoutMs = 4500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await nodeFetch(url, {
      ...options,
      agent: ipv4AgentSelector,
      headers: {
        'User-Agent': USER_AGENT,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

export const localizeDateString = (dateStr = '', lang = 'en') => {
  if (!dateStr || lang === 'en') return dateStr;

  const monthsPt = {
    january: 'janeiro',
    february: 'fevereiro',
    march: 'março',
    april: 'abril',
    may: 'maio',
    june: 'junho',
    july: 'julho',
    august: 'agosto',
    september: 'setembro',
    october: 'outubro',
    november: 'novembro',
    december: 'dezembro',
  };

  const monthsEs = {
    january: 'enero',
    february: 'febrero',
    march: 'marzo',
    april: 'abril',
    may: 'mayo',
    june: 'junio',
    july: 'julio',
    august: 'agosto',
    september: 'septiembre',
    october: 'octubre',
    november: 'noviembre',
    december: 'diciembre',
  };

  const dict = lang === 'pt' ? monthsPt : monthsEs;
  let result = dateStr;

  result = result.replace(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
    (_m, day, month, year) => `${day} de ${dict[month.toLowerCase()] || month} de ${year}`
  );

  result = result.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    (_m, month, day, year) => `${day} de ${dict[month.toLowerCase()] || month} de ${year}`
  );

  return result;
};

const formatSteamPrice = (finalPrice, currency, lang = 'en') => {
  if (finalPrice === 0) {
    return lang === 'pt'
      ? 'Grátis para Jogar'
      : lang === 'es'
      ? 'Gratis para Jugar'
      : 'Free to Play';
  }
  if (!finalPrice) {
    return lang === 'pt'
      ? 'Disponível Agora'
      : lang === 'es'
      ? 'Disponible Ahora'
      : 'Out Now';
  }
  if (currency === 'BRL' || lang === 'pt') {
    return `R$ ${(finalPrice / 100).toFixed(2).replace('.', ',')}`;
  }
  return `$${(finalPrice / 100).toFixed(2)}`;
};

export const getMusicReleases = async (lang = 'en') => {
  const country = lang === 'pt' ? 'br' : lang === 'es' ? 'es' : 'us';
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/${country}/rss/topalbums/limit=8/json`
    );
    const data = await res.json();
    const entries = Array.isArray(data?.feed?.entry)
      ? data.feed.entry
      : data?.feed?.entry
      ? [data.feed.entry]
      : [];

    return entries.map((entry, idx) => {
      const images = entry['im:image'] || [];
      const highResImage =
        images[images.length - 1]?.label?.replace('170x170bb', '300x300bb') || '';
      const link = Array.isArray(entry.link)
        ? entry.link[0]?.attributes?.href
        : entry.link?.attributes?.href || entry.id?.label || 'https://music.apple.com';

      const title = entry['im:name']?.label || 'Unknown Album';
      const artist = entry['im:artist']?.label || 'Various Artists';
      const genre = entry.category?.attributes?.label || 'Music';
      const relDate = localizeDateString(
        entry['im:releaseDate']?.attributes?.label || 'Recent',
        lang
      );

      const summary =
        lang === 'pt'
          ? `${title} de ${artist} (${genre}). Lançado em ${relDate}.`
          : lang === 'es'
          ? `${title} de ${artist} (${genre}). Lanzado el ${relDate}.`
          : `${title} by ${artist} (${genre}). Released ${relDate}.`;

      return {
        id: `music-${entry.id?.attributes?.['im:id'] || idx}`,
        category: 'music',
        type: 'release',
        title,
        subtitle: artist,
        genre,
        releaseDate: relDate,
        image: highResImage,
        url: link,
        source: 'Apple Music Charts',
        badge: lang === 'en' ? `#${idx + 1} Album` : `#${idx + 1} Álbum`,
        summary,
      };
    });
  } catch (err) {
    console.error('Error fetching music releases:', err.message);
    return [];
  }
};

export const getMovieReleases = async (lang = 'en') => {
  const country = lang === 'pt' ? 'br' : lang === 'es' ? 'es' : 'us';
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/${country}/rss/topmovies/limit=8/json`
    );
    const data = await res.json();
    const entries = Array.isArray(data?.feed?.entry)
      ? data.feed.entry
      : data?.feed?.entry
      ? [data.feed.entry]
      : [];

    return entries.map((entry, idx) => {
      const images = entry['im:image'] || [];
      const highResImage =
        images[images.length - 1]?.label?.replace('115x170bb', '300x450bb') || '';
      const link = Array.isArray(entry.link)
        ? entry.link[0]?.attributes?.href
        : entry.link?.attributes?.href || entry.id?.label || 'https://itunes.apple.com';
      const summaryText = decodeHtmlEntities(entry.summary?.label || '');
      const relDate = localizeDateString(
        entry['im:releaseDate']?.attributes?.label || 'Recent',
        lang
      );

      return {
        id: `movie-${entry.id?.attributes?.['im:id'] || idx}`,
        category: 'movies',
        type: 'release',
        title: entry['im:name']?.label || 'Untitled Movie',
        subtitle: entry['im:artist']?.label ? `Dir. ${entry['im:artist'].label}` : 'Cinema',
        genre: entry.category?.attributes?.label || 'Cinema',
        releaseDate: relDate,
        image: highResImage,
        url: link,
        source: 'Apple TV / Box Office',
        badge:
          lang === 'pt'
            ? `#${idx + 1} Filme`
            : lang === 'es'
            ? `#${idx + 1} Película`
            : `#${idx + 1} Movie`,
        summary:
          summaryText.slice(0, 220) + (summaryText.length > 220 ? '...' : '') ||
          (lang === 'pt'
            ? `Filme em alta dirigido por ${entry['im:artist']?.label || 'grandes cineastas'}.`
            : lang === 'es'
            ? `Película en tendencia dirigida por ${entry['im:artist']?.label || 'grandes cineastas'}.`
            : `Trending movie directed by ${entry['im:artist']?.label || 'acclaimed filmmakers'}.`),
      };
    });
  } catch (err) {
    console.error('Error fetching movie releases:', err.message);
    return [];
  }
};

export const getGameReleases = async (lang = 'en') => {
  const cc = lang === 'pt' ? 'br' : 'us';
  const steamLang = lang === 'pt' ? 'brazilian' : lang === 'es' ? 'spanish' : 'en';
  try {
    const res = await fetchWithTimeout(
      `https://store.steampowered.com/api/featuredcategories?cc=${cc}&l=${steamLang}`
    );
    const data = await res.json();
    const topSellers = data?.top_sellers?.items || [];
    const newReleases = data?.new_releases?.items || [];
    const comingSoon = data?.coming_soon?.items || [];

    const nsfwPattern = /\b(lust|sex|hentai|nsfw|brothel|succubus|nude|erotic|mom 2)\b/i;
    const combined = [...topSellers, ...newReleases, ...comingSoon];
    const seenIds = new Set();
    const uniqueGames = [];

    for (const item of combined) {
      if (!item?.id || !item?.name || seenIds.has(item.id)) continue;
      if (nsfwPattern.test(item.name)) continue;
      seenIds.add(item.id);

      const isNew = newReleases.some((r) => r.id === item.id);
      const isComingSoon = comingSoon.some((c) => c.id === item.id);
      const priceStr = formatSteamPrice(item.final_price, item.currency, lang);

      const platforms = [
        item.windows_available ? 'Win' : null,
        item.mac_available ? 'Mac' : null,
        item.linux_available ? 'Linux' : null,
      ]
        .filter(Boolean)
        .join(' / ');

      const summary =
        lang === 'pt'
          ? `${item.name} na Steam (${priceStr}${item.discount_percent ? `, -${item.discount_percent}% OFF` : ''}). Disponível para ${platforms || 'PC'}.`
          : lang === 'es'
          ? `${item.name} en Steam (${priceStr}${item.discount_percent ? `, -${item.discount_percent}% OFF` : ''}). Disponible en ${platforms || 'PC'}.`
          : `${item.name} on Steam (${priceStr}${item.discount_percent ? `, -${item.discount_percent}% off` : ''}). Available on ${platforms || 'PC'}.`;

      uniqueGames.push({
        id: `game-${item.id}`,
        category: 'games',
        type: 'release',
        title: item.name,
        subtitle: platforms ? `Platforms: ${platforms}` : 'PC / Steam',
        genre: priceStr,
        releaseDate: isNew ? 'New Release' : isComingSoon ? 'Coming Soon' : 'Trending Now',
        image: item.large_capsule_image || item.header_image || item.small_capsule_image || '',
        url: `https://store.steampowered.com/app/${item.id}`,
        source: 'Steam Store',
        badge: isNew ? 'New Game' : isComingSoon ? 'Upcoming' : 'Top Seller',
        summary,
      });
    }

    return uniqueGames.slice(0, 8);
  } catch (err) {
    console.error('Error fetching game releases:', err.message);
    return [];
  }
};

const parseRssFeed = async (url, category, sourceName, lang = 'en', limit = 4) => {
  try {
    const res = await fetchWithTimeout(url);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const results = [];

    const localeCode = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';

    for (let i = 0; i < Math.min(itemMatches.length, limit); i++) {
      const raw = itemMatches[i];
      const title = decodeHtmlEntities((raw.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
      const link = decodeHtmlEntities((raw.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
      const pubDateRaw = decodeHtmlEntities(
        (raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || ''
      );
      const description = decodeHtmlEntities(
        (raw.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || ''
      );
      const mediaMatch = raw.match(
        /(?:url|src)="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      );

      let formattedDate = lang === 'pt' ? 'Recente' : lang === 'es' ? 'Reciente' : 'Recent';
      if (pubDateRaw) {
        const parsed = new Date(pubDateRaw);
        if (!isNaN(parsed.getTime())) {
          formattedDate = parsed.toLocaleDateString(localeCode, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }

      if (title) {
        results.push({
          id: `news-${lang}-${category}-${i}-${Date.now()}`,
          category,
          type: 'news',
          title,
          subtitle: sourceName,
          genre: `${category.charAt(0).toUpperCase() + category.slice(1)} News`,
          releaseDate: formattedDate,
          image: mediaMatch ? mediaMatch[1] : '',
          url: link || '#',
          source: sourceName,
          badge: 'Breaking News',
          summary: description.slice(0, 220) + (description.length > 220 ? '...' : ''),
        });
      }
    }
    return results;
  } catch (err) {
    console.error(`Error parsing RSS feed from ${sourceName}:`, err.message);
    return [];
  }
};

export const getPopCultureNews = async (lang = 'en') => {
  if (lang === 'pt') {
    const [musicNews, movieNews, gameNews] = await Promise.all([
      parseRssFeed(
        'https://www.tenhomaisdiscosqueamigos.com/feed/',
        'music',
        'Tenho Mais Discos Que Amigos!',
        'pt',
        4
      ),
      parseRssFeed(
        'https://rollingstone.com.br/feed/',
        'movies',
        'Rolling Stone Brasil',
        'pt',
        4
      ),
      parseRssFeed('https://br.ign.com/feed.xml', 'games', 'IGN Brasil', 'pt', 4),
    ]);
    return [...musicNews, ...movieNews, ...gameNews];
  }

  if (lang === 'es') {
    const [musicNews, movieNews, gameNews] = await Promise.all([
      parseRssFeed('https://www.mondosonoro.com/feed/', 'music', 'MondoSonoro', 'es', 4),
      parseRssFeed('https://www.hobbyconsolas.com/rss', 'movies', 'HobbyConsolas', 'es', 4),
      parseRssFeed('https://es.ign.com/feed.xml', 'games', 'IGN España', 'es', 4),
    ]);
    return [...musicNews, ...movieNews, ...gameNews];
  }

  const [musicNews, movieNews, gameNews] = await Promise.all([
    parseRssFeed('https://www.billboard.com/feed/', 'music', 'Billboard', 'en', 4),
    parseRssFeed('https://variety.com/feed/', 'movies', 'Variety', 'en', 4),
    parseRssFeed('https://feeds.ign.com/ign/all', 'games', 'IGN', 'en', 4),
  ]);

  return [...musicNews, ...movieNews, ...gameNews];
};

export const getPopCultureFeed = async (lang = 'en') => {
  const key = ['en', 'pt', 'es'].includes(lang) ? lang : 'en';
  const now = Date.now();
  if (cachedFeeds[key] && now - cachedFeeds[key].timestamp < CACHE_TTL_MS) {
    return cachedFeeds[key].data;
  }

  const [musicReleases, movieReleases, gameReleases, newsItems] = await Promise.all([
    getMusicReleases(key),
    getMovieReleases(key),
    getGameReleases(key),
    getPopCultureNews(key),
  ]);

  const items = [...musicReleases, ...gameReleases, ...movieReleases, ...newsItems];

  const feedData = {
    updatedAt: new Date().toISOString(),
    items,
    music: musicReleases,
    games: gameReleases,
    movies: movieReleases,
    news: newsItems,
  };

  cachedFeeds[key] = {
    timestamp: now,
    data: feedData,
  };

  return feedData;
};

// Accent-stripped stopwords & conversational tokens (English, Portuguese + typos, Spanish)
const RAW_STOP_WORDS = [
  // English
  'what','who','when','where','why','how','which','is','are','was','were','will','would','could','should','does','do','did','can','may','might','have','has','had','been','being','you','your','yours','i','me','my','we','us','he','him','his','she','her','hers','it','its','they','them','their','this','that','these','those','there','here','tell','show','give','talk','ask','know','think','mean','understand','sure','certain','really','actually','about','into','onto','from','with','without','within','for','of','to','in','on','at','by','up','out','off','over','under','again','further','then','once','right','now','today','yesterday','tomorrow','week','month','year','recently','lately','soon','already','still','yet','just','only','also','too','very','much','many','more','most','other','another','some','any','no','not','nor','none','all','both','each','few','such','own','same','so','than','and','but','or','because','as','until','while','if','though','although','top','best','latest','recent','new','newest','trending','popular','charting','release','releases','released','date','launch','launching','come','comes','coming','price','cost','costs','worth','story','plot','synopsis','characters','character','protagonist','protagonists','main','lead','role','star','starring','developer','developers','developing','developed','made','making','maker','created','creating','creator','studio','publisher','director','directed','directing','cast','actors','actor','actress','singer','musician','artist','band','platforms','platform','console','consoles','pc','ps5','ps4','playstation','xbox','switch','gameplay','news','updates','update','movies','movie','films','film','cinema','series','show','music','albums','album','songs','song','track','tracks','games','game','videogames','videogame','stream','streaming','steam','breaking','pop','culture','thing','things','something','anything','nothing','everything',
  // Portuguese (accent-stripped + common typos like lacamento, nao, preco)
  'ok','okay','ola','oi','opa','ei','bom','dia','tarde','noite','mudar','mudando','muda','mudei','trocar','trocando','assunto','topico','tema','conversar','conversa','pergunta','perguntar','conta','conte','diga','alias','inclusive','enfim','e','qual','quais','quem','quando','onde','como','quanto','quantos','quantas','por','porque','pq','que','q','o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas','para','pra','pro','pelos','pelas','pelo','pela','com','sem','sobre','entre','ate','apos','desde','contra','perante','segundo','eu','tu','voce','vc','ele','ela','eles','elas','vos','meu','minha','meus','minhas','teu','tua','seu','sua','seus','suas','dele','dela','deles','delas','nele','nela','neles','nelas','este','esta','estes','estas','esse','essa','esses','essas','aquele','aquela','aqueles','aquelas','isto','isso','aquilo','deste','desta','desse','dessa','daquele','daquela','disto','disso','daquilo','nisto','nisso','ai','ali','la','ca','aqui','agora','hoje','ontem','amanha','sempre','nunca','ja','ainda','so','somente','apenas','tambem','tbm','muito','muita','muitos','muitas','pouco','pouca','mais','menos','melhor','melhores','pior','piores','ultimo','ultimos','ultima','ultimas','reciente','recente','recentes','recentemente','novo','novos','nova','novas','novidade','novidades','bom','boa','bons','boas','grande','grandes','certo','certa','certeza','absoluta','verdade','serio','mesmo','mesma','outro','outros','outra','outras','algum','alguma','alguns','algumas','nenhum','nenhuma','todo','toda','todos','todas','tudo','nada','algo','alguem','ninguem','cada','qualquer','tanto','tanta','nao','sim','ou','mas','porem','contudo','todavia','entao','portanto','pois','se','caso','embora','ser','sou','eh','foi','era','eram','foram','sera','serao','seria','seriam','estar','estou','estao','estava','estavam','esteve','estara','ter','tenho','tem','tinha','teve','tera','terao','teria','haver','ha','houve','havera','ir','vou','vai','vao','ia','ira','irao','vir','vem','veio','vira','poder','posso','pode','podem','podia','podera','poderia','dever','deve','devem','devia','devera','querer','quero','quer','querem','queria','quis','saber','sei','sabe','sabem','sabia','soube','dizer','digo','diz','dizem','disse','dira','falar','falo','fala','falam','falou','fale','te','me','lhe','conhecer','conheco','conhece','conhecido','conhecida','ficar','fico','ficou','fica','ficara','entender','entendo','entende','entendi','entendeu','achar','acho','acha','achou','ver','vejo','ve','viu','vera','dar','dou','deu','dara','fazer','faco','faz','fez','fara','fazendo','feito','criar','criou','criado','criando','criador','criadores','desenvolver','desenvolve','desenvolveu','desenvolvido','desenvolvendo','desenvolvedor','desenvolvedora','produzir','produziu','produzido','produzindo','produtor','produtora','dirigir','dirigiu','dirigido','dirigindo','diretor','diretora','atuar','atuou','atuando','ator','atriz','atores','elenco','cantar','cantou','cantando','cantor','cantora','banda','grupo','artista','artistas','lancar','lanca','lancou','lancado','lancada','lancando','lancamento','lancamentos','lacamento','lacamentos','sair','sai','saiu','saira','saindo','estrear','estreia','estreou','estreara','custar','custa','custou','custara','preco','precos','valor','valores','gratis','gratuito','pago','pagar','valer','vale','pena','jogar','jogo','jogos','jogador','jogadores','jogabilidade','rodar','roda','funcionar','funciona','passar','passa','acontecer','acontece','tratar','trata','filme','filmes','cinema','serie','series','tv','musica','musicas','album','albuns','cancao','cancoes','faixa','faixas','show','shows','turne','noticia','noticias','informacao','informacoes','info','detalhe','detalhes','historia','enredo','sinopse','trama','personagem','personagens','protagonista','protagonistas','principal','principais','papel','mundo','mapa','cidade','estado','lugar','estudio','publicadora','plataforma','plataformas','console','consoles','alta','topo','relacao','respeito','data','dia','ano','mes','coisa','coisas','curiosidade','curiosidades',
  // Spanish (accent-stripped)
  'cual','cuales','quien','quienes','cuando','donde','como','cuanto','cuantos','cuantas','por','porque','para','el','los','las','un','una','unos','unas','del','al','con','sin','hasta','desde','yo','tu','usted','ella','ellos','ellas','nosotros','mi','mis','tus','su','sus','estos','estas','esos','esas','aquel','aquella','esto','eso','aquello','aqui','ahi','alli','ahora','hoy','ayer','manana','siempre','nunca','ya','todavia','aun','solo','tambien','muy','mucho','mucha','muchos','muchas','poco','poca','mas','menos','mejor','mejores','peor','peores','ultimo','ultimos','ultima','ultimas','recientes','recientemente','nuevo','nuevos','nueva','nuevas','novedad','novedades','seguro','segura','verdad','serio','mismo','misma','otro','otra','otros','otras','algun','alguna','algunos','algumas','ningun','ninguna','todo','toda','todos','todas','nada','algo','alguien','nadie','cada','cualquier','y','pero','sino','entonces','pues','si','aunque','soy','eres','es','somos','son','fue','estoy','estan','estaba','estuvo','haber','hay','hubo','habra','tener','tengo','tiene','tienen','tenia','tuvo','tendra','voy','va','van','ira','puedo','puede','pueden','podia','podra','quiero','quiere','quieren','sabe','saben','sabia','digo','dice','dicen','dijo','dime','habla','hablame','cuenta','cuentame','entiendo','entendi','hago','hace','hizo','hara','haciendo','creo','desarrolla','desarrollo','desarrollando','desarrollador','dirigio','actuar','cantante','lanza','lanzo','lanzamiento','lanzamientos','sale','salio','saldra','estrenar','estrena','cuesta','costo','costara','precios','jugar','juegos','videojuego','videojuegos','jugabilidad','pelicula','peliculas','cine','albumes','cancion','canciones','informacion','detalles','personajes','ciudad','consola','consolas','tendencia','momento','numero','fecha'
];

const STOP_SET = new Set(RAW_STOP_WORDS.map((w) => stripAccents(w.toLowerCase()).trim()));

export const extractSearchSubject = (query = '') => {
  const tokens = query
    .replace(/[?!¡¿.,;:"'()[\]🎵🎮🎬📰✨#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const kept = [];
  for (const tok of tokens) {
    const norm = stripAccents(tok.toLowerCase());
    if (!STOP_SET.has(norm)) {
      kept.push(tok);
    }
  }
  const res = kept.join(' ').trim();
  return res.length >= 2 ? res : '';
};

export const extractAspectKeywords = (query = '') => {
  const norm = stripAccents(query.toLowerCase());
  const aspects = [];
  if (
    /\b(filme|filmes|movie|movies|film|films|cinema|atriz|ator|protagonista|atuar|atuou|participou|fez parte|actress|actor|acting|starring|role|cast|serie|series|tv|documentario|documentary)\b/.test(
      norm
    )
  ) {
    aspects.push('filme movie acting filmography');
  }
  if (/\b(lancamento|lacamento|data|quando|sai|estreia|release|date)\b/.test(norm)) {
    aspects.push('lançamento release date');
  }
  if (/\b(preco|custa|valor|price|cost)\b/.test(norm)) {
    aspects.push('preço price');
  }
  if (/\b(turne|show|shows|tour|concert)\b/.test(norm)) {
    aspects.push('turnê tour concert');
  }
  if (/\b(album|albuns|musica|musicas|song|songs|discografia|discography)\b/.test(norm)) {
    aspects.push('álbum música discography');
  }
  if (/\b(premio|premios|oscar|grammy|award|awards)\b/.test(norm)) {
    aspects.push('awards grammy oscar');
  }
  if (/\b(historia|enredo|sinopse|protagonista|personagens|personagem|story|plot|characters)\b/.test(norm)) {
    aspects.push('plot story characters');
  }
  return aspects.join(' ');
};

export const findRelevantWikiParagraphs = (query = '', wikiSummary = null, maxCount = 6) => {
  if (!wikiSummary) return [];
  const allParas = [
    ...(wikiSummary.enParagraphs || []),
    ...(wikiSummary.paragraphs || []),
  ];
  if (allParas.length === 0) return [];

  const normQ = stripAccents(query.toLowerCase());
  const keywords = new Set(
    normQ
      .replace(/[?!¡¿.,;:"'()[\]]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_SET.has(w))
  );

  // Add expanded semantic terms based on what the user is asking about
  if (
    /\b(filme|filmes|movie|movies|film|films|cinema|atriz|ator|protagonista|atuar|atuou|participou|fez parte|actress|actor|acting|starring|role|serie|series|documentario|documentary)\b/.test(
      normQ
    )
  ) {
    [
      'film',
      'films',
      'movie',
      'movies',
      'acting',
      'actress',
      'actor',
      'starred',
      'starring',
      'debut',
      'series',
      'documentary',
      'role',
      'character',
      'directed',
      'adaptation',
      'filme',
      'atriz',
      'atuou',
      'protagonista',
      'documentario',
      'serie',
    ].forEach((k) => keywords.add(k));
  }

  if (/\b(historia|enredo|sinopse|personagens|personagem|protagonista|story|plot|characters|setting|mapa|cidade)\b/.test(normQ)) {
    ['story', 'plot', 'set', 'protagonist', 'character', 'world', 'city', 'historia', 'ambientado', 'protagonista', 'personagens', 'cidade'].forEach((k) =>
      keywords.add(k)
    );
  }

  if (/\b(premio|premios|oscar|grammy|award|awards|recorde)\b/.test(normQ)) {
    ['award', 'awards', 'grammy', 'oscar', 'academy', 'golden globe', 'premio', 'oscar'].forEach(
      (k) => keywords.add(k)
    );
  }

  if (/\b(desenvolv|estudio|criou|fez|diretor|developer|studio|development)\b/.test(normQ)) {
    ['development', 'developed', 'production', 'studio', 'rockstar', 'desenvolvimento', 'produção'].forEach(
      (k) => keywords.add(k)
    );
  }

  if (keywords.size === 0) {
    return (wikiSummary.paragraphs || []).slice(0, 3);
  }

  const scored = allParas.map((p) => {
    const normP = stripAccents(p.toLowerCase());
    let score = 0;
    for (const kw of keywords) {
      if (new RegExp(`\\b${kw}`, 'i').test(normP)) {
        score += 2;
      }
    }
    return { p, score };
  });

  const matching = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((item) => item.p);

  return matching;
};

export const searchGoogleNews = async (topicQuery, lang = 'en') => {
  if (!topicQuery || topicQuery.trim().length < 2) return [];
  const hlLocal =
    lang === 'pt'
      ? 'pt-BR&gl=BR&ceid=BR:pt-419'
      : lang === 'es'
      ? 'es-419&gl=ES&ceid=ES:es'
      : 'en-US&gl=US&ceid=US:en';

  const fetchRss = async (qStr, hlParam) => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        qStr
      )}&hl=${hlParam}`;
      const res = await fetchWithTimeout(url, {}, 4500);
      const xml = await res.text();
      const items = (xml.match(/<item>([\s\S]*?)<\/item>/g) || []).slice(0, 4);

      return items
        .map((raw) => {
          const title = decodeHtmlEntities(
            (raw.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''
          );
          const pubDate = decodeHtmlEntities(
            (raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || ''
          );
          return title ? `${title} (${pubDate.slice(0, 16)})` : null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  if (lang === 'en') {
    return await fetchRss(topicQuery, hlLocal);
  }

  // Fetch both local-language news and English global news in parallel so nothing is missed
  const [localNews, enNews] = await Promise.all([
    fetchRss(topicQuery, hlLocal),
    fetchRss(topicQuery, 'en-US&gl=US&ceid=US:en'),
  ]);

  return [...localNews, ...enNews].slice(0, 8);
};

const parseWikiInfobox = (wikitext = '', lang = 'en') => {
  const cleanWikiValue = (val = '') => {
    return val
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<ref[\s\S]*?<\/ref>/gi, '')
      .replace(/<ref[^>]*\/>/gi, '')
      .replace(
        /\{\{(?:Start date|Film date|release date|dts)[^}]*?\|(\d{4})\|(\d{1,2})\|(\d{1,2})[^}]*\}\}/gi,
        '$1-$2-$3'
      )
      .replace(/\{\{(?:ubl|Plainlist|Flatlist|unbulleted list|hlist)\|/gi, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/'''/g, '')
      .replace(/\}\}/g, '')
      .replace(/\|/g, ' • ')
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^[•,\s]+|[•,\s]+$/g, '')
      .trim();
  };

  const relMatch = wikitext.match(
    /\|\s*(?:released|release_date|pub_date)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/i
  );
  const devMatch = wikitext.match(
    /\|\s*(?:developer|director|artist)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/i
  );
  const pubMatch = wikitext.match(
    /\|\s*(?:publisher|studio|label|distributor)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/i
  );
  const platMatch = wikitext.match(
    /\|\s*(?:platforms|computing_platform)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/i
  );
  const genreMatch = wikitext.match(/\|\s*genre\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/i);

  const rawReleased = relMatch ? cleanWikiValue(relMatch[1]) : null;

  return {
    released: rawReleased ? localizeDateString(rawReleased, lang) : null,
    creator: devMatch ? cleanWikiValue(devMatch[1]) : null,
    publisher: pubMatch ? cleanWikiValue(pubMatch[1]) : null,
    platforms: platMatch ? cleanWikiValue(platMatch[1]) : null,
    genre: genreMatch ? cleanWikiValue(genreMatch[1]) : null,
  };
};

const expandCommonAcronyms = (subj = '') => {
  return subj
    .replace(/\bgta\s*6\b/gi, 'Grand Theft Auto VI')
    .replace(/\bgta\s*vi\b/gi, 'Grand Theft Auto VI')
    .replace(/\bgta\s*5\b/gi, 'Grand Theft Auto V')
    .replace(/\bgta\s*v\b/gi, 'Grand Theft Auto V')
    .replace(/\bgta\s*4\b/gi, 'Grand Theft Auto IV')
    .replace(/\bgta\s*iv\b/gi, 'Grand Theft Auto IV')
    .trim();
};

export const searchTopicInfo = async (query, lang = 'en', explicitSubject = null) => {
  const rawSubject = explicitSubject || extractSearchSubject(query);
  const subject = expandCommonAcronyms(rawSubject);
  if (!subject) {
    return {
      subject: '',
      contextText: '',
      steamGame: null,
      wikiSummary: null,
      mediaMatches: [],
      topicNews: [],
    };
  }

  const wikiSubdomain = lang === 'pt' ? 'pt' : lang === 'es' ? 'es' : 'en';
  const cc = lang === 'pt' ? 'br' : 'us';
  const steamLang = lang === 'pt' ? 'brazilian' : lang === 'es' ? 'spanish' : 'english';
  const aspectKeywords = extractAspectKeywords(query);
  const newsSearchQuery = aspectKeywords ? `${subject} ${aspectKeywords}` : subject;

  const [rawSteamGame, wikiSummary, mediaMatches, topicNews] = await Promise.all([
    // 1. Steam Store Search + AppDetails
    (async () => {
      try {
        const searchRes = await fetchWithTimeout(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
            subject
          )}&l=${steamLang}&cc=${cc}`,
          {},
          6000
        );
        const searchData = await searchRes.json();
        const firstHit = searchData?.items?.[0];
        if (!firstHit?.id) return null;

        const normSubj = stripAccents(subject.toLowerCase()).replace(/[^a-z0-9]/g, '');
        const normHit = stripAccents((firstHit.name || '').toLowerCase()).replace(
          /[^a-z0-9]/g,
          ''
        );

        if (normSubj.length >= 3 && !normHit.startsWith(normSubj) && !normSubj.startsWith(normHit)) {
          return null;
        }

        const subjNumMatch = subject.match(/\b(\d+|iv|vi|vii|viii|ix|x|ii|iii)\b/i);
        if (subjNumMatch) {
          const numToken = subjNumMatch[1].toLowerCase();
          const romanToArab = { ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
          const arabToRoman = { '2': 'ii', '3': 'iii', '4': 'iv', '6': 'vi', '7': 'vii', '8': 'viii', '9': 'ix', '10': 'x' };
          const altToken = romanToArab[numToken] || arabToRoman[numToken] || numToken;
          const hitLower = (firstHit.name || '').toLowerCase();
          if (!new RegExp(`\\b(${numToken}|${altToken})\\b`, 'i').test(hitLower)) {
            return null;
          }
        }

        const detailsRes = await fetchWithTimeout(
          `https://store.steampowered.com/api/appdetails?appids=${firstHit.id}&cc=${cc}&l=${steamLang}`,
          {},
          6000
        );
        const detailsData = await detailsRes.json();
        const info = detailsData?.[firstHit.id]?.data;
        if (!info || info.type === 'dlc' || info.type === 'music') return null;

        const platformsList = [
          info.platforms?.windows ? 'PC (Windows)' : null,
          info.platforms?.mac ? 'macOS' : null,
          info.platforms?.linux ? 'Linux' : null,
        ]
          .filter(Boolean)
          .join(', ');

        return {
          name: info.name,
          releaseDate: info.release_date?.date || 'TBA',
          comingSoon: Boolean(info.release_date?.coming_soon),
          price:
            info.is_free
              ? lang === 'pt'
                ? 'Grátis para Jogar'
                : lang === 'es'
                ? 'Gratis para Jugar'
                : 'Free to Play'
              : info.price_overview?.final_formatted ||
                (info.release_date?.coming_soon
                  ? lang === 'pt'
                    ? 'Ainda não divulgado (Pré-venda em breve)'
                    : lang === 'es'
                    ? 'Aún no anunciado (Próximamente)'
                    : 'Not announced yet (Coming Soon)'
                  : 'N/A'),
          developers: (info.developers || []).join(', '),
          publishers: (info.publishers || []).join(', '),
          platforms: platformsList || 'PC',
          genres: (info.genres || []).map((g) => g.description).join(', '),
          description: decodeHtmlEntities(info.short_description || ''),
          url: `https://store.steampowered.com/app/${firstHit.id}`,
        };
      } catch {
        return null;
      }
    })(),

    // 2. Wikipedia Full-Article Extract (Local + English) + English Infobox
    (async () => {
      try {
        const [localExtractData, enExtractData] = await Promise.all([
          fetchWithTimeout(
            `https://${wikiSubdomain}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
              subject
            )}&gsrlimit=1&prop=extracts&explaintext=1&format=json`,
            {},
            6500
          ).then((r) => r.json()),
          wikiSubdomain === 'en'
            ? Promise.resolve(null)
            : fetchWithTimeout(
                `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
                  subject
                )}&gsrlimit=1&prop=extracts&explaintext=1&format=json`,
                {},
                6500
              ).then((r) => r.json()),
        ]);

        const localPage = Object.values(localExtractData?.query?.pages || {})[0];
        const enPage =
          wikiSubdomain === 'en'
            ? localPage
            : Object.values(enExtractData?.query?.pages || {})[0];

        const localTitle = localPage?.title;
        const fullExtractText = localPage?.extract || '';
        const enTitle = enPage?.title || localTitle;
        const enExtractText = enPage?.extract || '';

        const infoboxData = enTitle
          ? await fetchWithTimeout(
              `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
                enTitle
              )}&prop=wikitext&section=0&format=json`,
              {},
              6500
            )
              .then((r) => r.json())
              .then((d) => parseWikiInfobox(d?.parse?.wikitext?.['*'] || '', lang))
              .catch(() => null)
          : null;

        if (!fullExtractText && !enExtractText && !infoboxData?.released) return null;

        const paragraphs = (fullExtractText || enExtractText)
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 45 && !p.startsWith('=='));

        const enParagraphs = enExtractText
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 45 && !p.startsWith('=='));

        return {
          title: localTitle || enTitle,
          enTitle: enTitle || localTitle,
          extract: paragraphs[0] || (fullExtractText || enExtractText).slice(0, 600),
          paragraphs,
          enParagraphs,
          fullExtract: fullExtractText || enExtractText,
          released: infoboxData?.released || null,
          creator: infoboxData?.creator || null,
          publisher: infoboxData?.publisher || null,
          platforms: infoboxData?.platforms || null,
          genre: infoboxData?.genre || null,
        };
      } catch {
        return null;
      }
    })(),

    // 3. Apple Media / iTunes Search (strictly filtered so title or artist matches subject)
    (async () => {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
          subject
        )}&country=${cc}&entity=song,album,movie&limit=4`;
        const itunesRes = await fetchWithTimeout(itunesUrl, {}, 5000);
        const itunesData = await itunesRes.json();
        const normSubj = stripAccents(subject.toLowerCase()).replace(/[^a-z0-9]/g, '');

        return (itunesData?.results || [])
          .filter((r) => {
            const normTitle = stripAccents(
              (r.trackName || r.collectionName || '').toLowerCase()
            ).replace(/[^a-z0-9]/g, '');
            const normArtist = stripAccents((r.artistName || '').toLowerCase()).replace(
              /[^a-z0-9]/g,
              ''
            );
            return normTitle.includes(normSubj) || normArtist.includes(normSubj);
          })
          .map((r) => ({
            title: r.trackName || r.collectionName,
            artist: r.artistName,
            type: r.kind || r.wrapperType,
            genre: r.primaryGenreName || '',
            releaseDate: r.releaseDate ? r.releaseDate.slice(0, 10) : 'N/A',
            summary: r.longDescription || r.shortDescription || '',
          }));
      } catch {
        return [];
      }
    })(),

    // 4. Live Google News Search for this specific topic + question aspect
    searchGoogleNews(newsSearchQuery, lang),
  ]);

  // If Wikipedia says the topic is a singer/musician/actor/person, discard any accidental Steam game match
  const isPersonOrArtist =
    wikiSummary?.extract &&
    /\b(cantor|cantora|compositor|compositora|músico|musicista|ator|atriz|banda|singer|songwriter|musician|rapper|actor|actress|filmmaker|cantante)\b/i.test(
      wikiSummary.extract.slice(0, 300)
    );
  const steamGame = isPersonOrArtist ? null : rawSteamGame;

  const parts = [];
  if (steamGame) {
    parts.push(
      `[VERIFIED STEAM GAME DATA]\nTitle: ${steamGame.name} | Release Date: ${
        steamGame.releaseDate
      } (${steamGame.comingSoon ? 'Upcoming' : 'Released'}) | Official Price: ${
        steamGame.price
      } | Developer: ${steamGame.developers} | Publisher: ${
        steamGame.publishers
      } | Platforms: ${steamGame.platforms} | Genres: ${steamGame.genres}\nDescription: ${
        steamGame.description
      }`
    );
  }
  if (wikiSummary) {
    const matchedParas = findRelevantWikiParagraphs(query, wikiSummary, 6);
    const introParas = wikiSummary.paragraphs.slice(0, 2);
    const combinedParas = Array.from(new Set([...introParas, ...matchedParas]));
    parts.push(
      `[VERIFIED WIKIPEDIA ENCYCLOPEDIA DATA]\nTitle: ${wikiSummary.title} | Official Release Date: ${
        wikiSummary.released || 'See biography/summary'
      } | Creator/Developer/Director: ${wikiSummary.creator || 'N/A'} | Publisher/Studio: ${
        wikiSummary.publisher || 'N/A'
      } | Platforms: ${wikiSummary.platforms || 'N/A'} | Genre: ${
        wikiSummary.genre || 'N/A'
      }\nSummary & Relevant Article Sections:\n${combinedParas.join('\n\n')}`
    );
  }
  if (topicNews.length > 0) {
    parts.push(
      `[LIVE RECENT NEWS HEADLINES ABOUT "${subject.toUpperCase()}"]\n${topicNews
        .map((n) => `• ${n}`)
        .join('\n')}`
    );
  }
  if (mediaMatches.length > 0 && !steamGame) {
    parts.push(
      `[APPLE MUSIC / MOVIE CATALOG MATCHES]\n${mediaMatches
        .map(
          (m) =>
            `• ${m.title} by ${m.artist} (${m.type}, ${m.genre}, Release Date: ${m.releaseDate})${
              m.summary ? ` - ${m.summary}` : ''
            }`
        )
        .join('\n')}`
    );
  }

  return {
    subject,
    contextText: parts.join('\n\n'),
    steamGame,
    wikiSummary,
    mediaMatches,
    topicNews,
  };
};
