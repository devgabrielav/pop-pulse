import { useEffect, useMemo, useState } from 'react';
import { fetchPopCultureFeed, getCategoryMeta, localizeItemText } from '../../utils/matches';
import {
  LanguageType,
  PopCultureCategory,
  PopCultureFeedType,
  PopCultureItemType,
} from '../../utils/Types';
import { TRANSLATIONS } from '../../utils/aboutChat';
import './matchInfoStyles.css';
import Loader from '../Loader/Loader';

type MatchInfoProps = {
  lang?: LanguageType;
  onAskAi?: (prompt: string) => void;
};

const TAB_ICONS: Record<PopCultureCategory, string> = {
  all: '🔥',
  music: '🎵',
  games: '🎮',
  movies: '🎬',
  news: '📰',
};

const TAB_KEYS: PopCultureCategory[] = ['all', 'music', 'games', 'movies', 'news'];

function MatchInfo({ lang = 'en', onAskAi }: MatchInfoProps) {
  const [feed, setFeed] = useState<PopCultureFeedType | null>(null);
  const [activeCategory, setActiveCategory] = useState<PopCultureCategory>('all');
  const [loading, setLoading] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];

  const loadFeed = async () => {
    setLoading(true);
    const data = await fetchPopCultureFeed(lang);
    setFeed(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const displayedItems = useMemo<PopCultureItemType[]>(() => {
    if (!feed) return [];
    if (activeCategory === 'news') {
      return feed.news || [];
    }
    if (activeCategory === 'music') {
      return [
        ...(feed.music || []),
        ...(feed.news || []).filter((n) => n.category === 'music'),
      ];
    }
    if (activeCategory === 'games') {
      return [
        ...(feed.games || []),
        ...(feed.news || []).filter((n) => n.category === 'games'),
      ];
    }
    if (activeCategory === 'movies') {
      return [
        ...(feed.movies || []),
        ...(feed.news || []).filter((n) => n.category === 'movies'),
      ];
    }

    const mixed: PopCultureItemType[] = [];
    const maxLen = Math.max(
      feed.music?.length || 0,
      feed.games?.length || 0,
      feed.movies?.length || 0,
      feed.news?.length || 0
    );
    for (let i = 0; i < maxLen; i++) {
      if (feed.music?.[i]) mixed.push(feed.music[i]);
      if (feed.games?.[i]) mixed.push(feed.games[i]);
      if (feed.movies?.[i]) mixed.push(feed.movies[i]);
      if (feed.news?.[i]) mixed.push(feed.news[i]);
    }
    return mixed;
  }, [feed, activeCategory]);

  return (
    <section className="firstSection">
      <div className="feedHeaderRow">
        <h2 className="matchTitle">{t.feedTitle}</h2>
        <button
          type="button"
          className="refreshFeedBtn"
          onClick={loadFeed}
          disabled={loading}
        >
          {t.liveBtn}
        </button>
      </div>

      <div className="categoryTabs">
        {TAB_KEYS.map((tabId) => (
          <button
            key={tabId}
            type="button"
            className={`categoryTabBtn ${activeCategory === tabId ? 'active' : ''}`}
            onClick={() => setActiveCategory(tabId)}
          >
            <span>{TAB_ICONS[tabId]}</span>
            <span>{t.tabs[tabId]}</span>
          </button>
        ))}
      </div>

      <div className="matchesMainDiv">
        {loading ? (
          <Loader lang={lang} />
        ) : displayedItems.length === 0 ? (
          <div className="emptyFeedState">
            <p>{t.emptyFeed}</p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const meta = getCategoryMeta(item, lang);
            return (
              <article className="popCard" key={item.id}>
                <div className="popCardVisual">
                  {item.image ? (
                    <img
                      className="popCardImage"
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="popCardPlaceholder"
                      style={{ background: meta.bgColor, color: meta.color }}
                    >
                      <span>{meta.icon}</span>
                    </div>
                  )}
                </div>

                <div className="popCardBody">
                  <div className="popCardTopMeta">
                    <span
                      className="popCategoryBadge"
                      style={{ color: meta.color, backgroundColor: meta.bgColor }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <span className="popStatusBadge">
                      {localizeItemText(item.badge, lang)}
                    </span>
                    <span className="popDateSpan">
                      {localizeItemText(item.releaseDate, lang)}
                    </span>
                  </div>

                  <h3 className="popCardTitle">{item.title}</h3>
                  <div className="popCardSubtitleRow">
                    <span className="popCardSubtitle">
                      {localizeItemText(item.subtitle, lang)}
                    </span>
                    <span className="popDot">•</span>
                    <span className="popCardGenre">
                      {localizeItemText(item.genre, lang)}
                    </span>
                  </div>

                  {item.summary && <p className="popCardSummary">{item.summary}</p>}

                  <div className="popCardActions">
                    {onAskAi && (
                      <button
                        type="button"
                        className="askAiCardBtn"
                        onClick={() =>
                          onAskAi(
                            t.askCardPrompt(
                              item.title,
                              item.subtitle,
                              item.type === 'news'
                            )
                          )
                        }
                      >
                        {t.askAiBtn}
                      </button>
                    )}
                    <a
                      className="externalCardLink"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {meta.actionText} ↗
                    </a>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default MatchInfo;
