import { TRANSLATIONS } from '../../utils/aboutChat';
import { LanguageType } from '../../utils/Types';
import './loader.css';

type LoaderProps = {
  lang?: LanguageType;
};

function Loader({ lang = 'en' }: LoaderProps) {
  return (
    <div className="loaderDiv">
      <h2 className="loaderTitle">{TRANSLATIONS[lang].loadingFeed}</h2>
      <span className="loader"></span>
    </div>
  );
}

export default Loader;
