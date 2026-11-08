export type LanguageType = 'en' | 'pt' | 'es';

export type MessagesType = { user: string } | { bot: string };

export type SendMessageType = {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setButtonDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  currentMessage: string;
  setMessages: React.Dispatch<React.SetStateAction<MessagesType[]>>;
  setCurrentMessage: React.Dispatch<React.SetStateAction<string>>;
  lang?: LanguageType;
};

export type PopCultureCategory = 'all' | 'music' | 'games' | 'movies' | 'news';

export type PopCultureItemType = {
  id: string;
  category: 'music' | 'games' | 'movies';
  type: 'release' | 'news';
  title: string;
  subtitle: string;
  genre: string;
  releaseDate: string;
  image: string;
  url: string;
  source: string;
  badge: string;
  summary: string;
};

export type PopCultureFeedType = {
  updatedAt: string;
  items: PopCultureItemType[];
  music: PopCultureItemType[];
  games: PopCultureItemType[];
  movies: PopCultureItemType[];
  news: PopCultureItemType[];
};
