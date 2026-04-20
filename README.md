# TwinMind - Live Suggestions

Assignment-focused web app that:
- records microphone audio
- transcribes speech in ~30 second chunks
- generates exactly 3 live suggestions per refresh
- opens a detailed streaming answer in chat when a suggestion is clicked
- exports full session data as JSON or plain text

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, paste your Groq API key in Settings, then start recording.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run eval` / `npm run test:eval` - prompt evaluation script
- `npm run test:e2e` - assignment flow script

## Stack Choices

- **Framework:** Next.js 14 App Router + TypeScript
- **State:** Zustand (`sessionStore` and persisted `settingsStore`)
- **Styling:** Tailwind CSS
- **LLM + STT:** Groq only (assignment compliance)
  - Whisper: `whisper-large-v3`
  - Suggestions + Chat: `openai/gpt-oss-120b`

Why this stack:
- App Router keeps API and UI in one repo, reducing assignment overhead.
- Zustand keeps the session model explicit and easy to export.
- Groq model calls are isolated in API routes for clearer error handling and latency control.

## Prompt Strategy

Prompt templates live in `lib/prompts.ts` and are user-editable in Settings.

### 1) Live Suggestion Prompt

Goals:
- prioritize recency (especially latest chunks)
- maximize immediate usefulness in the next 30-90 seconds
- enforce grounding in transcript quotes
- maintain variety across suggestion types without forcing it

Output contract:
- exactly 3 suggestions
- each includes `type`, `preview`, and `fullContext`
- schema validation is enforced server-side in `app/api/suggestions/route.ts`

Anti-repetition:
- previous suggestions are passed into prompt context to reduce repeated phrasing/angles.

### 2) Chat Prompt

Goals:
- direct answer first, then concise rationale
- grounded with transcript evidence
- explicit confidence labeling when uncertain

Context handling:
- chat uses `buildSmartChatTranscript()` (`lib/session.ts`) to keep a dense recent tail and sampled older history, balancing quality with token limits.

### 3) Click-to-Expand Prompt

When a suggestion card is clicked:
- suggestion metadata (`type`, `preview`, `fullContext`) is injected into a dedicated expansion prompt
- a larger transcript window is included for richer response quality
- response streams into the right chat panel

## Context and Refresh Strategy

- Audio is chunked with recorder stop/start every ~30s to produce self-contained blobs that Whisper can decode reliably.
- Suggestions auto-refresh on interval (default `30s`) only when new transcript chunks exist.
- Manual refresh forces a transcript flush first, then generates suggestions.
- New suggestion batches are prepended in UI; old batches stay visible for continuity.

## Latency Strategy

- Suggestion route uses structured generation with low reasoning effort for faster, stable JSON output.
- Chat route uses medium reasoning effort for richer answers while keeping first-token latency acceptable.
- Header surfaces `Last batch` and `Chat first token` latency metrics during use.

## Key Tradeoffs

- **Transcript depth vs token budget:** suggestions use a short recent window for speed; chat uses sampled longer history for coverage.
- **Strict structure vs creativity:** schema-enforced output improves reliability, but can reduce free-form phrasing.
- **Fast cadence vs rate limits:** frequent refresh gives better "live" feel, but requires backoff behavior when 429s occur.
- **Client-provided API key:** simplest assignment flow (no backend auth system), but not a production secret-management pattern.

## Export Format

Export includes:
- transcript chunks with timestamps
- every suggestion batch with timestamps
- full chat history with timestamps
- settings snapshot (API key omitted)

Available from header:
- JSON export
- Plain-text export

## Core Structure

```txt
app/
  api/
    transcribe/route.ts
    suggestions/route.ts
    chat/route.ts
components/
  transcript/
  suggestions/
  chat/
  settings/
hooks/
  useAudioRecorder.ts
  useTranscription.ts
  useSuggestions.ts
  useChat.ts
store/
  sessionStore.ts
  settingsStore.ts
lib/
  prompts.ts
  session.ts
  settings.ts
types/
  index.ts
```
