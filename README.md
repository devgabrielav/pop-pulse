# PopPulse ✨

A live pop culture hub for music, games, movies, and entertainment news — with an AI assistant that helps users discover, compare, and understand what is trending.

## 🌍 Project overview

PopPulse is a real-time entertainment discovery app designed to keep users informed about the latest releases, charts, and breaking stories across music, games, and movies. Instead of browsing multiple sources separately, the app brings together live feeds from major entertainment platforms and presents them in one unified experience.

The platform also includes Aria, an AI-powered pop culture assistant, which can answer questions, explain titles, compare releases, and provide contextual insights based on live information from music, game, movie, and news sources.

## ✨ Main features

- AI-powered pop culture chatbot with context-aware answers
- Live feed for music, games, movies, and entertainment news
- Category filters for all content types
- Quick AI prompts from cards and feed entries
- Multilingual interface and content experience
- Automatic live fallback search when no API key is configured
- Real-time updates from public sources without requiring paid data access

## 🧩 Tech stack

### Frontend
- React 19
- TypeScript
- Vite
- Custom CSS and responsive UI styling

### Backend
- Node.js
- Express
- CORS and dotenv for environment configuration
- REST API routes for feed and chatbot endpoints

### AI & data layer
- Google Gemini API
- Wikipedia REST and MediaWiki parsing
- Steam Store API
- Apple Music / iTunes metadata and RSS feeds
- Google News, Billboard, IGN, Variety, Rolling Stone, and other public RSS sources
- Custom scraping and caching layer

## ⚙️ Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables (optional)

The app can run without a `.env` file for the live feed content and fallback search behaviors. To enable full Gemini-powered conversational responses, create a `.env` file in the project root:

```env
GEMINI_API_KEY='your_gemini_api_key_here'
```

### 3) Start the app

```bash
npm run dev
```

This starts both the frontend and backend together.

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🏗️ Scripts

```bash
npm run dev
npm run backend
npm run frontend
npm run build
npm run start
npm run lint
```

## 🧠 How the app works

- The frontend renders a dynamic entertainment dashboard with cards for music, games, movies, and breaking news.
- The backend fetches public data from multiple sources and normalizes it into a consistent feed.
- The AI assistant receives live context from relevant sources before answering user questions.
- Users can ask about artists, albums, games, movies, creators, or recent trending topics and get contextual answers in their selected language.

## 📌 Notes

- The live feed is designed to work without paid APIs.
- If `GEMINI_API_KEY` is unavailable, the app uses a built-in search fallback that pulls live metadata and summaries from public sources.
- The project is optimized for a fast, lightweight experience while still delivering rich, up-to-date entertainment content.

## 📝 Project structure

```text
src/
  App.tsx
  Components/
  utils/
  backend/
public/
config.ts
index.html
package.json
render.yaml
vite.config.ts
```

---

PopPulse brings pop culture discovery, live media coverage, and AI-assisted exploration into one streamlined experience.