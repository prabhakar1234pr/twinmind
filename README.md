# TwinMind — Live Suggestions

A web app that listens to your mic, transcribes the conversation with Whisper, and surfaces **3 context-aware suggestions** every 30 seconds. Click any suggestion for a detailed answer in a streaming chat panel on the right.

Built for the TwinMind Live Suggestions assignment.

---

## Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Tailwind CSS** + hand-rolled primitives (no component library bloat)
- **Zustand** (+ `persist` middleware for settings → localStorage)
- **`groq-sdk`** — everything runs through Groq
  - **Transcription**: `whisper-large-v3`
  - **Suggestions & chat**: `openai/gpt-oss-120b`
- Deployed on **Vercel**

No server-side secrets. The user pastes their own Groq API key into the Settings modal; it's stored in localStorage and sent on each request via an `x-groq-api-key` header.

---

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Settings**, paste a Groq key from [console.groq.com/keys](https://console.groq.com/keys), click **Test**. Then hit the mic.

No `.env` file needed.

---

## Architecture

```
app/
├── page.tsx                 # 3-column layout + settings modal
├── api/
│   ├── transcribe/route.ts  # Node runtime  — audio blob → Whisper
│   ├── suggestions/route.ts # Edge runtime  — transcript → 3 JSON suggestions
│   └── chat/route.ts        # Edge runtime  — streaming text
components/
├── transcript/              # Mic button + scrolling transcript
├── suggestions/             # 3-per-batch cards, newest on top
├── chat/                    # Streaming message list + input
└── settings/                # Tabs: API Key | Prompts | Behavior
hooks/
├── useAudioRecorder.ts      # MediaRecorder restart-based chunking
├── useTranscription.ts      # FIFO queue of chunks → /api/transcribe
├── useSuggestions.ts        # Interval-based + eager-first auto refresh
└── useChat.ts               # ReadableStream reader, appends to store
lib/
├── prompts.ts               # Default prompt templates
├── settings.ts              # Settings schema + defaults
├── session.ts               # Export serializer, transcript slicers
└── groq.ts                  # Groq client factory, API-key header helper
store/
├── sessionStore.ts          # Transcript, batches, chat — in-memory
└── settingsStore.ts         # Persisted via Zustand middleware
types/index.ts               # Single source of truth for all shared types
```

### Data flow

```
 mic ──► useAudioRecorder ──► 30s Blob ──► useTranscription
                                                │
                                                ▼
                                    POST /api/transcribe (Whisper)
                                                │
                                                ▼
                              sessionStore.addTranscriptChunk
                                                │
                                                ▼
                       useSuggestions polls: new chunk + interval?
                                                │
                                                ▼
                      POST /api/suggestions (JSON-mode streaming)
                                                │
                                                ▼
                              sessionStore.addSuggestionBatch
                                                │
                                                ▼
                            SuggestionCard onClick ──► useChat
                                                           │
                                                           ▼
                              POST /api/chat (text stream)
                                                           │
                                                           ▼
                              appendToMessage on every token
```

---

## Prompt strategy

The highest-leverage file is `lib/prompts.ts`. Three templates there:

1. **Suggestion prompt** — forces exactly 3 suggestions with 3 distinct types. Five categories (`QUESTION_TO_ASK`, `TALKING_POINT`, `FACT_CHECK`, `DIRECT_ANSWER`, `CLARIFYING_INFO`), each with concrete triggers. The preview must be punchy and standalone (deliver value even when not clicked). `fullContext` must quote specific transcript phrases to prevent hallucinated generic advice.

2. **Chat system prompt** — lead with the key insight in the first sentence (the reader may only read that one line before the conversation moves on), then support with scannable structure. Ground claims with verbatim quotes. Budget 150–350 words per reply.

3. **Expansion prompt** — pre-fills the chat when a suggestion card is tapped. Asks for (1) why now, (2) key facts, (3) how to act in the next 1–2 minutes.

### Context windows

- **Suggestions**: rolling window of the last N transcript chunks (`contextWindowChunks`, default 8 ≈ 4 minutes). Recency-biased; prevents prompt bloat on long sessions.
- **Chat**: full transcript, truncated from the start if it exceeds ~30k tokens. The user may ask about anything said earlier in the session.
- **De-duplication**: the last 6 previous suggestions are included in the next call's prompt with `"do not repeat these ideas"`.

### Validation

`/api/suggestions` parses and validates the JSON response. If parsing or shape-checking fails, it retries once with a stricter "JSON only, no markdown" prefix before surfacing an error. This matters — the #1 evaluation criterion is suggestion quality.

---

## Key technical decisions (and tradeoffs)

### MediaRecorder restart instead of `timeslice`

Every 30s the recorder is **stopped and restarted**. Each `onstop` fires with a complete, self-contained audio blob that Whisper can decode on its own.

`MediaRecorder`'s built-in `timeslice: 30000` option looks simpler but emits *partial* blobs that share a single container header — only the first chunk is decodable standalone. Restarting is the correct pattern for independent transcription of each chunk.

### Edge runtime for LLM routes, Node for transcribe

- `/api/suggestions` and `/api/chat` run on Edge — no cold starts, streams cleanly through Vercel's edge network.
- `/api/transcribe` runs on Node — it needs `FormData`/`File` handling for the audio upload, and Whisper responses are short enough that streaming isn't needed.

### Client-side API key

Per the assignment, the user provides their own Groq key. It's stored in `localStorage` and sent via `x-groq-api-key` on each request. The API routes still exist (rather than calling Groq directly from the browser) because:

- Keeps the `groq-sdk` dependency off the client bundle.
- Lets us use Edge streaming.
- Gives a single place to do validation, JSON-parse retries, and error normalization.

The downside: anyone who opens the browser devtools can see their own key. This is acceptable because **it's their own key** — there's no multi-tenant concern.

### Eager first batch + pipelined suggestions

Without optimization the user would wait a full 30s for their first suggestion. Instead: `useSuggestions` fires immediately when the first transcript chunk lands, then falls into the 30s interval. And because transcription runs in a queue, the suggestions call for chunk N−1 happens in parallel with Whisper decoding chunk N.

### In-memory session, localStorage only for settings

Sessions don't survive a reload — the assignment explicitly says this is fine. Only `settings` (key + prompts + behavior) persist, so users don't have to re-paste their key every time. A `beforeunload` warning fires if the session has any data, prompting the user to export first.

---

## Settings

Three tabs (gear icon in the header):

- **API Key** — password input with show/hide, "Test" button that fires a minimal chat completion to validate.
- **Prompts** — editable textareas for all three prompts, each with an individual "Reset to default" button and a "Reset all" link.
- **Behavior** — sliders for context window (4–20 chunks) and refresh interval (15–120s); toggle for auto-refresh; model selectors for Whisper and chat.

All changes save instantly via Zustand's persist middleware (no "Save" button).

---

## Export

The **Export** button in the header downloads a timestamped JSON file:

```json
{
  "id": "sess-...",
  "startedAt": 1713333333000,
  "exportedAt": 1713335000000,
  "transcript": [{ "id", "text", "timestamp", "durationSec" }, ...],
  "suggestionBatches": [
    { "id", "timestamp", "transcriptSnapshot", "suggestions": [...] },
    ...
  ],
  "chatMessages": [{ "id", "role", "content", "timestamp", "linkedSuggestionId" }, ...],
  "settingsSnapshot": { /* everything except apiKey */ }
}
```

The settings snapshot (prompts + context windows) lets reviewers reproduce any result.

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel --prod
```

`vercel.json` sets `maxDuration: 30` on the transcribe route so Whisper calls don't get killed at the default 10s edge timeout.

No environment variables need to be configured on Vercel — the app is fully configured via the client-side Settings modal.

---

## What wasn't built (and why)

- **No auth, no database, no session persistence across reloads** — the assignment explicitly says not needed.
- **No speaker diarization** — Whisper doesn't do it natively and the assignment doesn't require it.
- **No mobile-specific layout** — prototype is desktop-first; mobile would cram three columns awkwardly. Usable on a tablet.
- **No component library** — shadcn/ui was in the plan but adds 300+ generated files for primitives this app uses 5 of. Hand-rolled in Tailwind instead. Less ceremony, same result.
