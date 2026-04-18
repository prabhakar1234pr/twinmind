# TwinMind — Live Suggestions

A web app that listens to your mic, transcribes the conversation with Whisper, and surfaces **3 context-aware suggestions** every ~30 seconds. Clicking a suggestion streams a detailed answer in the chat panel on the right.

Built for the TwinMind Live Suggestions assignment (April 2026).

**Live URL:** https://twinmind-rho.vercel.app  
**GitHub:** https://github.com/prabhakar1234pr/twinmind

---

## Setup

### Prerequisites
- Node.js 18+
- A [Groq API key](https://console.groq.com/keys) (free tier is enough)
- A [Supabase](https://supabase.com) project (free tier) — needed for auth and session persistence

### Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from your Supabase project dashboard → Settings → API.

### Database

Run the SQL in `supabase/schema.sql` against your Supabase project (SQL Editor in the dashboard). This creates the tables, RLS policies, pgvector index, and the `match_transcript_chunks` similarity-search function.

Then deploy the embedding Edge Function:
```bash
supabase functions deploy embed-text
```

### Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up / log in, then click **Settings** and paste your Groq key. Hit the mic to start.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript strict | File-based routing, Edge runtime, server components |
| Styling | Tailwind CSS, hand-rolled primitives | No component library overhead for ~10 UI primitives |
| State | Zustand (+ persist middleware) | Simple, selector-based, no boilerplate |
| LLM + transcription | `groq-sdk` | Assignment requirement; Whisper + GPT-OSS 120B |
| Auth + DB | Supabase (Postgres + pgvector + RLS) | Session history, RAG search, row-level security |
| Embeddings | Supabase `gte-small` Edge Function | Groq deprecated their embedding model mid-build; Supabase's built-in inference needs no extra API key |
| Deployment | Vercel | Zero-config Next.js, Edge Function support |

---

## Architecture

```
app/
├── page.tsx                       # Home — session list
├── record/page.tsx                # Live recording (3-column layout)
├── sessions/[id]/page.tsx         # Session review — summary, transcript, RAG chat
├── auth/page.tsx                  # Sign-in / sign-up
└── api/
    ├── transcribe/route.ts        # Node  — audio blob → Whisper
    ├── suggestions/route.ts       # Node  — transcript → 3 JSON suggestions (+ retry)
    ├── chat/route.ts              # Edge  — streaming chat with transcript context
    └── sessions/[id]/
        ├── route.ts               # POST upserts transcript + suggestions + chat
        ├── summary/route.ts       # POST generates AI summary via Groq
        ├── embed/route.ts         # POST generates 384-dim embeddings via Supabase
        └── rag/route.ts           # POST vector search + streaming answer
components/
├── transcript/                    # Mic button + live scrolling transcript
├── suggestions/                   # Batch cards, newest on top
├── chat/                          # Streaming message list + markdown renderer
├── settings/                      # API Key | Prompts | Behavior tabs
└── session/                       # FinishSessionOverlay (save → summary → embed → redirect)
hooks/
├── useAudioRecorder.ts            # MediaRecorder restart-based chunking
├── useTranscription.ts            # Serialized FIFO queue → /api/transcribe
├── useSuggestions.ts              # Eager-first + interval auto-refresh
├── useChat.ts                     # ReadableStream reader, appends deltas to store
└── useAutoSave.ts                 # Debounced (5s) sync of session state to Supabase
store/
├── sessionStore.ts                # In-memory: transcript, batches, chat
└── settingsStore.ts               # Persisted to localStorage via Zustand middleware
lib/
├── prompts.ts                     # All prompt templates (highest-leverage file)
├── settings.ts                    # Settings schema + defaults
├── session.ts                     # Export builder, transcript slicers
└── groq.ts                        # Groq client factory, API-key header helper
supabase/
├── schema.sql                     # Tables, RLS, pgvector index, match function
└── functions/embed-text/          # Supabase Edge Function — gte-small embeddings
```

### Data flow (live recording)

```
mic → useAudioRecorder (restart every 30s, not timeslice)
        │
        ▼
  useTranscription FIFO queue → POST /api/transcribe (Whisper)
        │
        ▼
  sessionStore.addTranscriptChunk
        │
        ├──► useAutoSave (5s debounce) → POST /api/sessions/[id] → Supabase
        │
        └──► useSuggestions: new chunk + interval elapsed?
                    │
                    ▼
             POST /api/suggestions (GPT-OSS 120B, JSON, retry on parse fail)
                    │
                    ▼
             sessionStore.addSuggestionBatch
                    │
                    ▼
             SuggestionCard click → POST /api/chat (streaming)
                    │
                    ▼
             appendToMessage on every token delta
```

### Finish Session flow

"Finish" button → `FinishSessionOverlay`:
1. Stops mic, immediately POSTs full session to Supabase
2. `POST /api/sessions/[id]/summary` → Groq generates structured summary
3. `POST /api/sessions/[id]/embed` → Supabase Edge Function generates 384-dim vectors per chunk
4. Redirects to `/sessions/[id]` — review summary, transcript, notes, RAG Q&A

---

## Prompt strategy

All templates live in `lib/prompts.ts`. Users can edit them in Settings → Prompts; each has a Reset button. This is the highest-leverage file.

### 1. Suggestion prompt

Five suggestion types, each with concrete trigger conditions:

| Type | When to use |
|---|---|
| `QUESTION_TO_ASK` | Other party made a broad claim without specifics, or topic needs steering |
| `TALKING_POINT` | A topic is building and the reader can add signal |
| `FACT_CHECK` | A specific number, date, or name worth verifying — always quotes the exact claim |
| `DIRECT_ANSWER` | A question was literally asked and not yet fully answered |
| `CLARIFYING_INFO` | A term or concept used in a way that suggests misunderstanding |

**Key constraints in the prompt:**
- Exactly 3 suggestions, all different types
- `preview` ≤ 15 words, must deliver standalone value (no "ask a follow-up question" generics)
- `fullContext` must quote the specific transcript phrase that triggered it
- Weight the last 60 seconds most heavily
- Don't repeat ideas from the previous 2 batches (passed as context)

**Reliability:** The route validates the JSON response shape. On failure it retries once with a stricter "begin with `{`, end with `}`" prefix. The validator accepts both `camelCase` and `snake_case` field names since the model uses both.

### 2. Chat system prompt

- Lead with the single most useful insight in the first sentence (the reader may only catch that before the conversation moves on)
- Support with short headers or bullets for scan-reading
- Quote verbatim transcript phrases to build trust
- Hard limit: 150–350 words. No restating the question.

### 3. Expansion prompt (on suggestion click)

Pre-fills the chat: asks for (1) why this matters right now, (2) key facts or arguments, (3) how to act in the next 1–2 minutes.

### 4. RAG system prompt (session review Q&A)

Strict grounding: "If this wasn't mentioned in the recording, say so." Uses `> blockquote` format for transcript citations. Backs off to full-transcript fallback when vector search returns poor similarity.

### Context windows

- **Suggestions**: last N chunks (`contextWindowChunks`, default 8 ≈ 4 minutes). Recency-biased; avoids prompt bloat on long sessions.
- **Chat / expansion**: full transcript. The user may ask about anything from earlier in the session.
- **RAG search**: top 5 chunks by cosine similarity (384-dim `gte-small` vectors), fallback to full transcript if similarity < 0.3.

---

## Key tradeoffs

### MediaRecorder restart vs `timeslice`

Every 30s the recorder is **stopped and restarted**. Each `onstop` produces a complete, self-contained blob that Whisper decodes independently.

`timeslice: 30000` emits partial blobs that share a single container header — only the first is decodable standalone. Restart is the correct pattern; it adds ~200ms of silence at the boundary but produces reliable chunks every time.

### Suggestions on Node runtime, not Edge

Suggestions makes two sequential Groq calls (attempt + retry). On Vercel's Edge runtime the hard timeout is 25 seconds — two calls on `gpt-oss-120b` can exceed that. Moved to Node (60s limit, `maxDuration: 60`) to eliminate the `FUNCTION_INVOCATION_TIMEOUT` errors.

### No background prefetch

An earlier version pre-fetched all 3 suggestion answers immediately after each batch arrived — 3 parallel Groq chat calls every 30 seconds. This ate Groq's rate-limit quota and caused the actual user-triggered chat requests to fail. Disabled in favour of live streaming on click (~1–2s to first token, acceptable).

### Supabase auth (beyond the spec)

The assignment says "no login needed." Auth was added to enable session history and per-user data isolation in Supabase. This is the one deliberate departure from the spec — the core live-suggestion flow is unchanged, but the app now requires an account.

If this is a blocker during evaluation, the deployed URL is pre-seeded and the reviewer can sign up in 10 seconds with any email.

### Embeddings: Supabase `gte-small` instead of Groq

Groq deprecated `nomic-embed-text-v1_5` (768-dim) mid-project. Switched to Supabase's built-in `gte-small` model (384-dim) running in an Edge Function — no external API, no new API key, zero cost. Migrated the `transcript_embeddings` column and `match_transcript_chunks` RPC function accordingly.

### Client-side API key

The user's Groq key is stored in `localStorage` and sent via `x-groq-api-key` header on each request. Calls still go through `/api/*` routes (not direct browser → Groq) to keep the `groq-sdk` off the client bundle, enable Edge streaming, and centralise error handling/retries.

---

## Settings

Three tabs in the Settings modal (gear icon):

- **API Key** — password field with show/hide, "Test" button that fires a minimal completion to validate the key
- **Prompts** — editable textareas for all three prompts, individual Reset buttons per prompt
- **Behavior** — context window (4–20 chunks), refresh interval (15–120s), auto-refresh toggle, model selectors for Whisper and chat

Changes persist instantly via Zustand's `persist` middleware (no Save button).

---

## Export

The **Export** button downloads a timestamped JSON snapshot:

```json
{
  "id": "sess-...",
  "startedAt": 1713333333000,
  "exportedAt": 1713335000000,
  "transcript": [{ "id", "text", "timestamp", "durationSec" }],
  "suggestionBatches": [{ "id", "timestamp", "transcriptSnapshot", "suggestions": [...] }],
  "chatMessages": [{ "id", "role", "content", "timestamp", "linkedSuggestionId" }],
  "settingsSnapshot": { "...all settings except apiKey..." }
}
```

The settings snapshot lets reviewers reproduce any result with the exact prompts and context window that were active.

---

## What wasn't built

- **Speaker diarization** — Whisper doesn't do it natively; not required by the spec
- **Mobile layout** — the three-column layout is desktop-first, matching the reference prototype
- **Component library** — shadcn/ui adds 300+ generated files for primitives this app uses ~5 of; hand-rolled Tailwind instead
