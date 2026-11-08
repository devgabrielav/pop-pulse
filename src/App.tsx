import { useCallback, useState } from 'react';
import AboutContact from './Components/AboutContact/AboutContact';
import ChatBot from './Components/ChatBot/ChatBot';
import MatchInfo from './Components/MatchInfo/MatchInfo';
import { LanguageType } from './utils/Types';
import './styles.css';

function App() {
  const [lang, setLang] = useState<LanguageType>('en');
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);

  const handleAskAi = useCallback((prompt: string) => {
    setExternalPrompt(prompt);
  }, []);

  const handlePromptHandled = useCallback(() => {
    setExternalPrompt(null);
  }, []);

  return (
    <div className="mainPage">
      <MatchInfo lang={lang} onAskAi={handleAskAi} />
      <ChatBot
        lang={lang}
        externalPrompt={externalPrompt}
        onPromptHandled={handlePromptHandled}
      />
      <AboutContact lang={lang} onChangeLang={setLang} onAskAi={handleAskAi} />
    </div>
  );
}

export default App;
