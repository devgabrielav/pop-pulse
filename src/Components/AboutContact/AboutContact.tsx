import { TRANSLATIONS } from '../../utils/aboutChat';
import { LanguageType } from '../../utils/Types';
import './aboutContactStyles.css';

type AboutContactProps = {
  lang?: LanguageType;
  onChangeLang?: (lang: LanguageType) => void;
  onAskAi?: (prompt: string) => void;
};

const LANGUAGES: { id: LanguageType; label: string; flag: string }[] = [
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'pt', label: 'PT-BR', flag: '🇧🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

function AboutContact({ lang = 'en', onChangeLang, onAskAi }: AboutContactProps) {
  const t = TRANSLATIONS[lang];

  return (
    <section className="mainAboutContactSection">
      <div className="langSwitcherBar" aria-label={t.languageLabel}>
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`langSwitchBtn ${lang === l.id ? 'active' : ''}`}
            onClick={() => onChangeLang && onChangeLang(l.id)}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      <h2 className="sectionTitle">{t.hubTitle}</h2>

      <div className="aboutCardBox">
        {t.aboutParagraphs.map((paragraph, index) => (
          <p className="aboutParagraph" key={index}>
            {paragraph}
          </p>
        ))}

        <div className="coverageGrid">
          {t.coveragePills.map((pill) => (
            <div
              className="coverageItem"
              key={pill.category}
              onClick={() => onAskAi && onAskAi(pill.prompt)}
              style={{ cursor: onAskAi ? 'pointer' : 'default' }}
            >
              <span className="coverageIcon">{pill.icon}</span>
              <div className="coverageText">
                <strong>{pill.title}</strong>
                <span>{pill.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AboutContact;
