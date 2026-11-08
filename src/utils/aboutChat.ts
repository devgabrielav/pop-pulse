import { LanguageType, PopCultureCategory, SendMessageType } from './Types';
import { API_URL } from '../../config';

type TranslationContent = {
  feedTitle: string;
  liveBtn: string;
  loadingFeed: string;
  emptyFeed: string;
  askAiBtn: string;
  tabs: Record<PopCultureCategory, string>;
  categories: {
    music: string;
    games: string;
    movies: string;
    news: string;
  };
  actions: {
    listen: string;
    steam: string;
    details: string;
    readArticle: string;
  };
  chatSubtitle: string;
  botHeader: string;
  initialBotGreeting: string;
  inputPlaceholder: string;
  sendTitle: string;
  errorReply: string;
  serverErrorReply: string;
  suggestedQuestions: string[];
  hubTitle: string;
  languageLabel: string;
  aboutParagraphs: string[];
  coveragePills: {
    category: 'music' | 'games' | 'movies';
    icon: string;
    title: string;
    desc: string;
    prompt: string;
  }[];
  askCardPrompt: (title: string, subtitle: string, isNews: boolean) => string;
};

export const TRANSLATIONS: Record<LanguageType, TranslationContent> = {
  en: {
    feedTitle: 'RELEASES & NEWS',
    liveBtn: '↻ Live',
    loadingFeed: 'Loading live releases & news...',
    emptyFeed: 'No items found for this category right now.',
    askAiBtn: '✨ Ask AI',
    tabs: {
      all: 'All',
      music: 'Music',
      games: 'Games',
      movies: 'Movies',
      news: 'News',
    },
    categories: {
      music: 'MUSIC',
      games: 'GAMES',
      movies: 'MOVIES',
      news: 'NEWS',
    },
    actions: {
      listen: 'Listen',
      steam: 'Steam Store',
      details: 'Details',
      readArticle: 'Read Article',
    },
    chatSubtitle: 'Ask Aria about Music, Games & Movies',
    botHeader: '✨ Aria • Pop Culture AI',
    initialBotGreeting:
      "Hi! I'm **Aria**, your Pop Culture AI Assistant! 🎵🎮🎬\nAsk me anything about **Music**, **Video Games**, **Movies**, or the latest releases and breaking news!",
    inputPlaceholder: 'Ask about music, games, movies, or recent news...',
    sendTitle: 'Send message',
    errorReply: 'Sorry, I could not process that request right now.',
    serverErrorReply:
      'Could not reach the Pop Culture server. Make sure the backend is running on port 3001!',
    suggestedQuestions: [
      '🎵 Top albums right now?',
      '🎮 New games on Steam?',
      '🎬 #1 movies out now?',
      '📰 Breaking pop culture news?',
    ],
    hubTitle: 'POP CULTURE HUB',
    languageLabel: 'Language',
    aboutParagraphs: [
      'PopPulse is your real-time Pop Culture & Entertainment hub bringing together the latest in Music, Video Games, and Movies — powered by an interactive AI assistant.',
      'Our live feed tracks chart-topping albums on Apple Music, newly released and trending PC games on Steam, box-office hits, and breaking headlines from Billboard, Variety, and IGN.',
      "Ask Aria, our Pop Culture AI, anything about your favorite artists, upcoming blockbusters, game recommendations, or today's top entertainment news!",
    ],
    coveragePills: [
      {
        category: 'music',
        icon: '🎵',
        title: 'Music',
        desc: 'Top Albums, Songs & Billboard News',
        prompt: 'What are the top music releases and news right now?',
      },
      {
        category: 'games',
        icon: '🎮',
        title: 'Games',
        desc: 'New Steam Releases & IGN Updates',
        prompt: 'What are the trending games on Steam right now?',
      },
      {
        category: 'movies',
        icon: '🎬',
        title: 'Movies',
        desc: 'Box Office Charts & Variety Headlines',
        prompt: 'What are the top movies and cinema news right now?',
      },
    ],
    askCardPrompt: (title, subtitle, isNews) =>
      isNews
        ? `Tell me more about this news: "${title}"`
        : `Tell me about ${title} (${subtitle})`,
  },
  pt: {
    feedTitle: 'LANÇAMENTOS E NOTÍCIAS',
    liveBtn: '↻ Ao Vivo',
    loadingFeed: 'Carregando lançamentos e notícias...',
    emptyFeed: 'Nenhum item encontrado para esta categoria no momento.',
    askAiBtn: '✨ Perguntar à IA',
    tabs: {
      all: 'Todos',
      music: 'Música',
      games: 'Jogos',
      movies: 'Filmes',
      news: 'Notícias',
    },
    categories: {
      music: 'MÚSICA',
      games: 'JOGOS',
      movies: 'FILMES',
      news: 'NOTÍCIAS',
    },
    actions: {
      listen: 'Ouvir',
      steam: 'Loja Steam',
      details: 'Detalhes',
      readArticle: 'Ler Artigo',
    },
    chatSubtitle: 'Pergunte à Aria sobre Música, Jogos e Filmes',
    botHeader: '✨ Aria • IA de Cultura Pop',
    initialBotGreeting:
      'Olá! Eu sou a **Aria**, sua Assistente de IA de Cultura Pop! 🎵🎮🎬\nPergunte-me qualquer coisa sobre **Música**, **Videogames**, **Filmes** ou os últimos lançamentos e notícias!',
    inputPlaceholder: 'Pergunte sobre música, jogos, filmes ou notícias recentes...',
    sendTitle: 'Enviar mensagem',
    errorReply: 'Desculpe, não consegui processar seu pedido agora.',
    serverErrorReply:
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001!',
    suggestedQuestions: [
      '🎵 Álbuns no topo agora?',
      '🎮 Novos jogos na Steam?',
      '🎬 Filmes #1 em alta?',
      '📰 Últimas notícias da cultura pop?',
    ],
    hubTitle: 'CENTRAL POP CULTURE',
    languageLabel: 'Idioma',
    aboutParagraphs: [
      'O PopPulse é a sua central de Cultura Pop e Entretenimento em tempo real, reunindo o que há de mais recente em Música, Videogames e Filmes no Brasil — com uma assistente de IA interativa.',
      'Nosso feed ao vivo acompanha os álbuns no topo do Apple Music Brasil, novos jogos em alta na Steam (em R$), sucessos do cinema e notícias em português da IGN Brasil, Rolling Stone Brasil e TMDQA!.',
      'Pergunte à Aria, nossa IA de Cultura Pop, sobre seus artistas favoritos, próximos lançamentos, história, plataformas ou preços — ela mantém o contexto da conversa!',
    ],
    coveragePills: [
      {
        category: 'music',
        icon: '🎵',
        title: 'Música',
        desc: 'Top Álbuns Brasil e Notícias do TMDQA!',
        prompt: 'Quais são os principais lançamentos e notícias de música agora?',
      },
      {
        category: 'games',
        icon: '🎮',
        title: 'Jogos',
        desc: 'Steam Brasil (R$) e Notícias da IGN Brasil',
        prompt: 'Quais são os jogos em alta na Steam agora?',
      },
      {
        category: 'movies',
        icon: '🎬',
        title: 'Filmes',
        desc: 'Filmes em Alta e Rolling Stone Brasil',
        prompt: 'Quais são os principais filmes e notícias de cinema agora?',
      },
    ],
    askCardPrompt: (title, subtitle, isNews) =>
      isNews
        ? `Me fale mais sobre esta notícia: "${title}"`
        : `Me fale sobre ${title} (${subtitle})`,
  },
  es: {
    feedTitle: 'LANZAMIENTOS Y NOTICIAS',
    liveBtn: '↻ En Vivo',
    loadingFeed: 'Cargando lanzamientos y noticias...',
    emptyFeed: 'No se encontraron elementos para esta categoría en este momento.',
    askAiBtn: '✨ Preguntar a la IA',
    tabs: {
      all: 'Todos',
      music: 'Música',
      games: 'Juegos',
      movies: 'Películas',
      news: 'Noticias',
    },
    categories: {
      music: 'MÚSICA',
      games: 'JUEGOS',
      movies: 'PELÍCULAS',
      news: 'NOTICIAS',
    },
    actions: {
      listen: 'Escuchar',
      steam: 'Tienda Steam',
      details: 'Detalles',
      readArticle: 'Leer Artículo',
    },
    chatSubtitle: 'Pregúntale a Aria sobre Música, Juegos y Películas',
    botHeader: '✨ Aria • IA de Cultura Pop',
    initialBotGreeting:
      '¡Hola! Soy **Aria**, tu Asistente de IA de Cultura Pop. 🎵🎮🎬\n¡Pregúntame lo que quieras sobre **Música**, **Videojuegos**, **Películas** o los últimos lanzamientos y noticias!',
    inputPlaceholder: 'Pregunta sobre música, juegos, películas o noticias recientes...',
    sendTitle: 'Enviar mensaje',
    errorReply: 'Lo siento, no pude procesar esa solicitud en este momento.',
    serverErrorReply:
      'No se pudo conectar con el servidor de Cultura Pop. ¡Asegúrate de que el backend esté activo en el puerto 3001!',
    suggestedQuestions: [
      '🎵 ¿Álbumes número 1 ahora?',
      '🎮 ¿Nuevos juegos en Steam?',
      '🎬 ¿Películas #1 del momento?',
      '📰 ¿Últimas noticias de cultura pop?',
    ],
    hubTitle: 'CENTRO DE CULTURA POP',
    languageLabel: 'Idioma',
    aboutParagraphs: [
      'PopPulse es tu centro de Cultura Pop y Entretenimiento en tiempo real que reúne lo último en Música, Videojuegos y Películas, impulsado por una asistente de IA interactiva.',
      'Nuestro feed en vivo sigue los álbumes más escuchados en Apple Music, lanzamientos y tendencias de PC en Steam, éxitos de taquilla y titulares de Billboard, Variety e IGN.',
      '¡Pregúntale a Aria, nuestra IA de Cultura Pop, sobre tus artistas favoritos, próximos estrenos de cine, recomendaciones de videojuegos o las noticias del día!',
    ],
    coveragePills: [
      {
        category: 'music',
        icon: '🎵',
        title: 'Música',
        desc: 'Top Álbumes, Canciones y Noticias de Billboard',
        prompt: '¿Cuáles son los principales lanzamientos y noticias de música ahora?',
      },
      {
        category: 'games',
        icon: '🎮',
        title: 'Juegos',
        desc: 'Nuevos Lanzamientos en Steam y Noticias de IGN',
        prompt: '¿Cuáles son los juegos en tendencia en Steam ahora?',
      },
      {
        category: 'movies',
        icon: '🎬',
        title: 'Películas',
        desc: 'Taquilla y Titulares de Variety',
        prompt: '¿Cuáles son las principales películas y noticias de cine ahora?',
      },
    ],
    askCardPrompt: (title, subtitle, isNews) =>
      isNews
        ? `Cuéntame más sobre esta noticia: "${title}"`
        : `Háblame sobre ${title} (${subtitle})`,
  },
};

const chatId = `pop_culture_${Math.random().toString(36).slice(2, 10)}`;

export const sendMessage = async ({
  setLoading,
  currentMessage,
  setMessages,
  setCurrentMessage,
  setButtonDisabled,
  lang = 'en',
}: SendMessageType) => {
  const trimmed = currentMessage.trim();
  if (!trimmed) return;

  const t = TRANSLATIONS[lang];

  setButtonDisabled(true);
  setMessages((prevMessages) => [...prevMessages, { user: trimmed }]);
  setCurrentMessage('');
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        message: trimmed,
        lang,
      }),
    });

    const data = await response.json();

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        bot: data.success ? data.reply : t.errorReply,
      },
    ]);
  } catch (error) {
    console.error('Error sending message:', error);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        bot: t.serverErrorReply,
      },
    ]);
  }
  setLoading(false);
  setButtonDisabled(false);
};
