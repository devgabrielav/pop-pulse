import { LanguageType, PopCultureFeedType, PopCultureItemType } from './Types';
import { API_URL } from '../../config';
import { fallbackPopCultureItems } from './matchExemple';
import { TRANSLATIONS } from './aboutChat';

export const fetchPopCultureFeed = async (
  lang: LanguageType = 'en'
): Promise<PopCultureFeedType> => {
  try {
    const response = await fetch(`${API_URL}/pop-culture?lang=${lang}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pop culture feed');
    }
    const data: PopCultureFeedType = await response.json();
    return data;
  } catch (err) {
    console.error('Error loading pop culture feed:', err);
    return {
      updatedAt: new Date().toISOString(),
      items: fallbackPopCultureItems,
      music: fallbackPopCultureItems.filter((i) => i.category === 'music'),
      games: fallbackPopCultureItems.filter((i) => i.category === 'games'),
      movies: fallbackPopCultureItems.filter((i) => i.category === 'movies'),
      news: [],
    };
  }
};

export const localizeItemText = (text: string, lang: LanguageType): string => {
  if (!text || lang === 'en') return text;

  const mapPt: Record<string, string> = {
    'New Game': 'Novo Jogo',
    'Top Seller': 'Mais Vendido',
    Upcoming: 'Em Breve',
    'Breaking News': 'Últimas Notícias',
    'New Release': 'Novo Lançamento',
    'Trending Now': 'Em Alta',
    'Coming Soon': 'Em Breve',
    'Free to Play': 'Grátis para Jogar',
    'Out Now': 'Disponível Agora',
    Recent: 'Recente',
    'Music News': 'Notícias de Música',
    'Games News': 'Notícias de Jogos',
    'Movies News': 'Notícias de Filmes',
  };

  const mapEs: Record<string, string> = {
    'New Game': 'Nuevo Juego',
    'Top Seller': 'Más Vendido',
    Upcoming: 'Próximamente',
    'Breaking News': 'Última Hora',
    'New Release': 'Nuevo Lanzamiento',
    'Trending Now': 'En Tendencia',
    'Coming Soon': 'Próximamente',
    'Free to Play': 'Gratis para Jugar',
    'Out Now': 'Disponible Ahora',
    Recent: 'Reciente',
    'Music News': 'Noticias de Música',
    'Games News': 'Noticias de Juegos',
    'Movies News': 'Noticias de Películas',
  };

  const dict = lang === 'pt' ? mapPt : mapEs;
  if (dict[text]) return dict[text];

  if (text.endsWith(' Album')) {
    return text.replace(' Album', ' Álbum');
  }
  if (text.endsWith(' Movie')) {
    return text.replace(' Movie', lang === 'pt' ? ' Filme' : ' Película');
  }
  if (text.startsWith('Platforms:')) {
    return text.replace('Platforms:', lang === 'pt' ? 'Plataformas:' : 'Plataformas:');
  }

  if (lang === 'pt' && /^\$\d+(\.\d{2})?$/.test(text)) {
    const usd = parseFloat(text.slice(1));
    const brl = (usd * 5.0).toFixed(2).replace('.', ',');
    return `R$ ${brl}`;
  }

  return text;
};

export const getCategoryMeta = (item: PopCultureItemType, lang: LanguageType = 'en') => {
  const t = TRANSLATIONS[lang];

  if (item.type === 'news') {
    return {
      label: t.categories.news,
      icon: '📰',
      color: '#FF5E97',
      bgColor: 'rgba(255, 94, 151, 0.16)',
      actionText: t.actions.readArticle,
    };
  }

  switch (item.category) {
    case 'music':
      return {
        label: t.categories.music,
        icon: '🎵',
        color: '#A855F7',
        bgColor: 'rgba(168, 85, 247, 0.16)',
        actionText: t.actions.listen,
      };
    case 'games':
      return {
        label: t.categories.games,
        icon: '🎮',
        color: '#22D3EE',
        bgColor: 'rgba(34, 211, 238, 0.16)',
        actionText: t.actions.steam,
      };
    case 'movies':
    default:
      return {
        label: t.categories.movies,
        icon: '🎬',
        color: '#FBBF24',
        bgColor: 'rgba(251, 191, 36, 0.16)',
        actionText: t.actions.details,
      };
  }
};
