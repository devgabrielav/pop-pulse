# PopPulse — Pop Culture AI Hub (Music, Games & Movies)

PopPulse is a real-time, multilingual Pop Culture & Entertainment web application where you can explore live releases, charts, and breaking news across **Music**, **Video Games**, and **Movies**, and chat with **Aria**, an interactive AI Pop Culture assistant powered by **Google Gemini**.

---

## ✨ Features & Functionalities

- **🤖 Pop Culture AI Chatbot (Aria — Powered by Google Gemini)**:
  - Ask open-ended questions about artists, albums, songs, video games, studios, movies, directors, box office hits, or breaking entertainment news.
  - **Live RAG Context Injection**: Before generating a response, the backend enriches Gemini's system prompt in real time with official **Steam Store** data (release dates, platforms, localized pricing), **Wikipedia** encyclopedia extracts & infoboxes, **Apple Music / iTunes** metadata, and live **Google News RSS** headlines.
  - **Multi-Turn Conversational Memory & Topic Switching**: Keeps track of the active subject across follow-up questions (*"How much does it cost?"*, *"What about on PC?"*, *"Are you sure?"*) while seamlessly switching topics whenever you ask about a new artist, movie, or game.
- **📡 Live Releases & Breaking News Feed**:
  - 🎵 **Music**: Chart-topping albums from **Apple Music / iTunes RSS** + breaking music news from **Billboard** (EN/ES) and **Tenho Mais Discos Que Amigos! — TMDQA!** (PT-BR).
  - 🎮 **Games**: New and trending PC game releases from the **Steam Store API** (with localized USD / BRL `R$` pricing) + gaming news from **IGN** and **IGN Brasil / España**.
  - 🎬 **Movies**: Top box-office and digital movie releases from **iTunes Movies** + cinema and pop culture headlines from **Variety** and **Rolling Stone Brasil**.
  - **Category Filtering & Live Refresh**: Filter the feed by **All**, **Music**, **Games**, **Movies**, or **News**, or hit **↻ Live** to refresh the feed on demand.
- **✨ Interactive "Ask AI" Cards & Quick Prompts**:
  - Click **✨ Ask AI** on any album, game, movie, or news card in the feed (or use the coverage pills and quick-prompt chips) to immediately ask Aria for deeper insights on that title.
- **🌎 Full Multilingual Support (EN / PT-BR / ES)**:
  - Switch the entire UI, live regional feeds, currency formatting (`$` / `R$`), and Aria's conversational language on the fly between **English**, **Português (BR)**, and **Español**.
- **🛡️ Zero-Key Live Feeds & Built-in Search Fallback**:
  - All live feeds work out of the box without requiring paid data API keys, and the chatbot includes an intelligent live-search fallback (using Wikipedia + Steam + Apple Media + live RSS feeds) even if `GEMINI_API_KEY` is not configured.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** & **TypeScript** — Component-driven UI with strict type safety.
- **Vite 6** — Fast development server and optimized production bundler (`src/dist`).
- **Custom CSS3** — Responsive glassmorphism layout, neon gradients, custom animations, and category badges.

### Backend
- **Node.js** & **Express 5** — REST API server (`/pop-culture`, `/matches`, `/send-message`) and static production asset host.
- **Google Gemini API (`generativelanguage.googleapis.com`)** — LLM integration (`gemini-3.5-flash` / `gemini-3.1-flash-lite` / `gemini-3.8-flash`) with dynamic system instruction context and multi-turn session history.
- **`node-fetch` & Custom Scraping/RSS Engine** — Low-latency IPv4 HTTP client with in-memory TTL caching (`5 min`), HTML entity decoding, and parallel data aggregation.
- **`dotenv` & `cors`** — Secure server-side environment variable management and cross-origin support.

### External Data Sources (Keyless Public APIs & RSS)
- **Apple Music & iTunes Search / RSS API** (Music & Movies charts)
- **Steam Store Featured & Search API** (Trending PC games & regional pricing)
- **Wikipedia REST & MediaWiki Parse API** (Full-text encyclopedic summaries & infobox metadata)
- **Google News, Billboard, Variety, IGN & Rolling Stone RSS** (Real-time entertainment headlines)

---

## ⚙️ Getting Started (Local Development)

1. **Install dependencies**:

```bash
npm install
```

2. **(Optional) Configure `.env`**:
   You can run the project **without creating a `.env` file**, and both the live feed and the chatbot will work out of the box! To enable full LLM-generated conversational responses via [Google AI Studio (Gemini API)](https://aistudio.google.com/app/apikey), create a `.env` file in the project root based on `.env.example`:

```env
GEMINI_API_KEY='your_gemini_api_key_here'
```

> **💡 Why is `.env` optional? Will the chatbot work without it?**
> - **Live Releases & News Feed (No API keys needed)**: All page data is fetched from public endpoints that require no keys — Apple Music & iTunes RSS (Music & Movies), Steam Store API (Games), and live RSS feeds from Billboard, Variety, IGN, Rolling Stone, and TMDQA! (News).
> - **Chatbot Without `.env` (Built-in Live Search Mode)**: If `GEMINI_API_KEY` is not set, Aria automatically uses a built-in fallback that matches your question against the live Music, Games, Movies, and News feeds and queries **Wikipedia**, **Steam**, and **iTunes Search** in real time to return structured answers.
> - **Chatbot With `.env` (Full Gemini Conversational Mode)**: When `GEMINI_API_KEY` is provided in `.env` (kept strictly server-side), the backend injects the live pop culture feeds and real-time search results into Google Gemini, enabling rich open-ended conversations, comparisons, and custom recommendations.

3. **Run the project (Frontend + Backend concurrently)**:

```bash
npm run dev
```

- **Frontend (Vite)**: `http://localhost:5173`
- **Backend (Express)**: `http://localhost:3001`