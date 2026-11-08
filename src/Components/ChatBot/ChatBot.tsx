import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { sendMessage, TRANSLATIONS } from '../../utils/aboutChat';
import './chatBotStyles.css';
import { LanguageType, MessagesType } from '../../utils/Types';
import typingGif from '../../assets/typing.gif';

type ChatBotProps = {
  lang?: LanguageType;
  externalPrompt?: string | null;
  onPromptHandled?: () => void;
};

const formatBotText = (text: string) => {
  const normalized = text
    .replace(/^---+$/gm, '')
    .replace(/^#{1,4}\s+(.*)$/gm, '**$1**')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const parts = normalized.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

function ChatBot({ lang = 'en', externalPrompt, onPromptHandled }: ChatBotProps) {
  const t = TRANSLATIONS[lang];
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [messages, setMessages] = useState<MessagesType[]>([
    {
      bot: t.initialBotGreeting,
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  // Update the initial greeting message when switching languages if no user messages yet
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && 'bot' in prev[0]) {
        return [{ bot: TRANSLATIONS[lang].initialBotGreeting }];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (externalPrompt && !buttonDisabled) {
      sendMessage({
        setLoading,
        currentMessage: externalPrompt,
        setMessages,
        setCurrentMessage,
        setButtonDisabled,
        lang,
      });
      if (onPromptHandled) {
        onPromptHandled();
      }
    }
  }, [externalPrompt, buttonDisabled, onPromptHandled, lang]);

  const handleSendMessage = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentMessage.trim()) return;

    await sendMessage({
      setLoading,
      currentMessage,
      setMessages,
      setCurrentMessage,
      setButtonDisabled,
      lang,
    });
  };

  const handleQuickPrompt = async (promptText: string) => {
    if (buttonDisabled) return;
    await sendMessage({
      setLoading,
      currentMessage: promptText,
      setMessages,
      setCurrentMessage,
      setButtonDisabled,
      lang,
    });
  };

  return (
    <section className="chatBotMainSection">
      <div className="chatTitleDiv">
        <div className="popBrandBadge" aria-hidden="true">
          <span>🎵</span>
          <span>🎮</span>
          <span>🎬</span>
        </div>
        <div>
          <h2 className="chatBotTitle">POP PULSE AI</h2>
          <p className="chatBotSubtitle">{t.chatSubtitle}</p>
        </div>
      </div>

      <div className="chatsDiv">
        <div className="paragraphsDiv" ref={endOfMessagesRef}>
          {messages.map((message, index) =>
            'user' in message ? (
              <div className="userParagraphDiv" key={index}>
                <p className="userParagraph">{message.user}</p>
              </div>
            ) : (
              <div className="botParagraphDiv" key={index}>
                <div className="botAvatarHeader">{t.botHeader}</div>
                <p className="botParagraph">{formatBotText(message.bot)}</p>
              </div>
            )
          )}
        </div>

        <div
          className="botParagraphDiv"
          id="dotsDiv"
          style={{ display: loading ? 'flex' : 'none' }}
        >
          <img src={typingGif} className="typingDots" alt="Aria is typing" />
        </div>

        <div className="quickPromptsRow">
          {t.suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              className="quickPromptChip"
              disabled={buttonDisabled}
              onClick={() => handleQuickPrompt(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event: ChangeEvent<HTMLFormElement>) => {
            if (!buttonDisabled) {
              handleSendMessage(event);
            } else {
              event.preventDefault();
            }
          }}
        >
          <input
            type="text"
            value={currentMessage}
            className="inputForm"
            onChange={(event) => setCurrentMessage(event.target.value)}
            placeholder={t.inputPlaceholder}
          />
          <button
            className="formButton"
            disabled={buttonDisabled}
            title={t.sendTitle}
            style={{
              filter: buttonDisabled ? 'grayscale(100%)' : 'none',
              cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}

export default ChatBot;
