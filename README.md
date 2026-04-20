# TwinMind — Live Suggestions

A single-page web app that listens to your mic, transcribes the conversation with Whisper, and surfaces **3 context-aware suggestions** every ~30 seconds. Clicking a suggestion streams a detailed answer in the chat panel on the right. One continuous session per page load — close the tab and it's gone.

Built for the TwinMind Live Suggestions assignment (April 2026).

**Live URL:** https://twinmind-rho.vercel.app
**GitHub:** https://github.com/prabhakar1234pr/twinmind

---

## Quality at a glance

Prompt quality is treated as something to **measure**, not just claim. The repo ships with a G-Eval-style evaluation harness ([scripts/eval-prompts.ts](scripts/eval-prompts.ts)) that scores the live suggestion prompt against 5 synthetic meeting transcripts using a separate judge model.

**Shipped prompt scores (v2.5.0 — see [lib/prompt-versions/](lib/prompt-versions/) for the full iteration archive):**

| Metric | Score | / Max |
|---|---|---|
| Batch total | 14.97 | 18 |
| **Specificity (transcript grounding)** | **2.96** | **3** |
| Timing fit | 2.73 | 3 |
| Meeting-type calibration | 2.51 | 3 |
| Preview quality | 2.44 | 3 |
| Actionability | 2.27 | 3 |
| Variety (per batch) | 2.07 | 3 |

Reviewers can reproduce with `GROQ_API_KEY=... npm run eval`. Full methodology, four iteration rounds, per-criterion tables, and raw reports are in [EVALUATION.md](EVALUATION.md) and [lib/prompt-versions/README.md](lib/prompt-versions/README.md).

**API-level tests (`npm run test:e2e`):** 29 / 37 passing. The 5 failing are all Groq free-tier ceiling effects (TPM burst limits on concurrent requests, input-token limits on 120k-char transcripts), not bugs — documented in EVALUATION.md. 3 skipped by design.

---

## Setup

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com/keys) (free tier works for manual testing)

No `.env` file is needed to run the app. The only things that read `.env` are the dev-only eval + e2e scripts — see [.env.example](.env.example).

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Settings**, paste your Groq key, then hit the mic button to start.

### Run the eval + tests

```bash
# Set GROQ_API_KEY in .env for the scripts:
echo 'GROQ_API_KEY=gsk_...' > .env

npm run eval       # G-Eval-style suggestion eval (~5 min, ~90k Groq tokens)
npm run test:e2e   # 37 API tests against localhost:3000 (requires `npm run dev` in another shell)
```

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript strict | File-based routing, Edge runtime for streaming chat |
| Styling | Tailwind CSS, hand-rolled primitives | No component library overhead for ~10 UI primitives |
| State | Zustand (+ persist middleware for settings only) | Session data stays in memory; API key persisted to localStorage |
| LLM + transcription | Vercel AI SDK (`@ai-sdk/groq`) + `groq-sdk` | Structured outputs + streaming + Whisper. Assignment requirement: Whisper + GPT-OSS 120B |
| Reasoning tuning | `reasoningEffort: "low"` (suggestions) / `"medium"` (chat) | Critical — `gpt-oss-120b` default eats output tokens on internal chain-of-thought |
| Deployment | Vercel | Zero-config Next.js, Edge runtime for streaming |

**Not used:** no database, no auth, no session persistence. Everything is in-memory per page load, matching the assignment's "no login, no data persistence needed" spec.

---

## Architecture

```
app/
├── page.tsx                    # Single page — 3-column recording UI
├── layout.tsx                  # Shell
├── globals.css                 # Tailwind + CSS variables
└── api/
    ├── transcribe/route.ts     # Node  — audio blob → Whisper (2KB min, 429 handling)
    ├── suggestions/route.ts    # Node  — transcript → 3 JSON suggestions (retry + 429 handling)
    └── chat/route.ts           # Edge  — streaming chat with transcript context
components/
├── transcript/                 # Mic button + live scrolling transcript
├── suggestions/                # Batch cards, newest on top
├── chat/                       # Streaming message list + markdown renderer
├── settings/                   # API Key | Prompts | Behavior tabs
├── layout/                     # Header (mic + Export + Settings) + MobileTabBar
└── ui/                         # Small shared UI primitives
hooks/
├── useAudioRecorder.ts         # MediaRecorder restart-based chunking (mic)
├── useTranscription.ts         # Serialized FIFO queue, 429 retry, silent tiny-blob drop
├── useSuggestions.ts           # Eager-first + interval auto-refresh, 60s backoff on 429
└── useChat.ts                  # ReadableStream reader, friendly errors, smart transcript trim
store/
├── sessionStore.ts             # In-memory: transcript, batches, chat (cleared on tab close)
└── settingsStore.ts            # Persisted to localStorage (API key, prompts, behavior)
lib/
├── prompts.ts                  # Public prompt API (chat + expansion + re-exports from versions)
├── prompt-versions/            # Every suggestion prompt iteration as its own file + score history
├── settings.ts                 # Settings schema + defaults
├── session.ts                  # Export builder + dense-tail transcript sampler for chat
└── groq.ts                     # Groq client factory, rate-limit / JSON-error helpers
scripts/
├── eval-prompts.ts             # G-Eval-style suggestion eval harness
├── e2e-test.ts                 # 37 API tests against /api/*
├── fixtures/                   # Test transcripts
└── eval-report-v2.*.md         # Archived results from each prompt iteration
EVALUATION.md                   # Full evaluation methodology + iteration log
```

### Data flow (live recording)

```
mic
        │
        ▼
  useAudioRecorder  (stop/start every 30s — NOT timeslice)
        │
        ▼
  useTranscription FIFO queue → POST /api/transcribe (Whisper)
        │
        ▼
  sessionStore.addTranscriptChunk
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
             SuggestionCard click → POST /api/chat (streaming answer)
                    │
                    ▼
             appendToMessage on every token delta
```

---

## Prompt strategy

Prompt templates live in [lib/prompts.ts](lib/prompts.ts). Users can edit them in Settings → Prompts; each has a Reset button.

The **suggestion prompt** has been iterated through 6 numbered versions (v2.0 → v2.6). Each is preserved as a standalone file in [lib/prompt-versions/](lib/prompt-versions/) with its eval scores documented in the file header. To swap which version ships, change one line in [lib/prompt-versions/index.ts](lib/prompt-versions/index.ts) — see [lib/prompt-versions/README.md](lib/prompt-versions/README.md).

**Current ship: v2.5.0** (combined-best of v2.1's algorithmic variety rule and v2.3's CLARIFYING_INFO "bring it up by saying" rule).

### Suggestion prompt — what it enforces

- **Silent meeting-type classification** (sales / interview / technical / negotiation / status / brainstorm / casual) biases the type mix without being output to the user.
- **Foreground / background transcript windowing** — the last 2 chunks are the "foreground"; the trigger quote MUST come from there. Older content grounds but doesn't drive suggestions.
- **Mandatory 3-part fullContext** — every suggestion opens with a verbatim transcript quote, then one sentence on why now, then concrete words or action.
- **Algorithmic variety rule** — at most 1 of the 3 types in a batch can appear in the immediately preceding batch's types. Turns "avoid repetition" into arithmetic the model can follow.
- **CLARIFYING_INFO actionability rule** — this type's fullContext must include the exact sentence the user can say to raise the clarification without derailing.
- **Anti-patterns blocklist** — explicit list of generic behaviors to avoid ("ask for clarification" without specifics, "follow up on that point" without naming the point, etc.).

### Chat system prompt

- Lead with the single most useful insight in the first sentence (the reader may only catch that before the conversation moves on).
- Per-suggestion-type response shape: QUESTION_TO_ASK → exact words to say; FACT_CHECK → verdict first; TALKING_POINT → 2-3 concrete sentences; DIRECT_ANSWER → crisp 1-2 sentences + support; CLARIFYING_INFO → definition then why-now.
- **Mandatory verbatim quote** for any factual claim about the meeting content.
- Length: 200 words target, 350 max.

### Expansion prompt (on suggestion click)

Pre-fills the chat when a suggestion card is clicked. Fixed 4-section output: **Bottom line** → **Why this matters** (with transcript quote) → **How to act** (type-specific recipe) → **Timing note**.

### Context windows

- **Suggestions**: last N chunks (`contextWindowChunks`, default 8 ≈ 4 minutes). Recency-biased.
- **Chat / expansion**: smart-window transcript (`lib/session.ts` `buildSmartChatTranscript`) — keeps all of the last 20 chunks (dense tail) + every 5th chunk from older content (sampled head). ~4k input tokens max to stay under Groq's 8k TPM free-tier ceiling.

---

## Key tradeoffs

### `reasoningEffort: "low"` is critical for `gpt-oss-120b` on structured output

First eval run had **100% of suggestion calls fail** with `"max completion tokens reached before generating a valid document"`. Root cause: `gpt-oss-120b` defaults to high reasoning effort, which consumes output tokens on internal chain-of-thought *before* producing the JSON. Setting `providerOptions.groq.reasoningEffort = "low"` for suggestions (and `"medium"` for chat) fixed the JSON truncation **and** dropped first-token latency from 3–5s to ~1.1s.

### MediaRecorder restart vs `timeslice`

Every 30s the recorder is **stopped and restarted**. Each `onstop` produces a complete, self-contained blob that Whisper decodes independently.

`timeslice: 30000` emits partial blobs that share a single container header — only the first is decodable standalone. Restart is the correct pattern; it adds ~200ms of silence at the boundary but produces reliable chunks every time.

### Smart transcript window for chat

Long sessions can blow past Groq's 8k TPM ceiling on a single chat call if the whole transcript is sent. `buildSmartChatTranscript` keeps the last 20 chunks (dense tail) + every 5th chunk from older content (sampled head) — caps input around ~4k tokens regardless of session length.

### Retry on JSON parse failure

`generateObject` against Groq occasionally returns `json_validate_failed` with `failed_generation: ""` (roughly 3–5% of calls in free-tier observations). The suggestions route retries once at `temperature: 0.2` with a hardened instruction suffix before giving up. Matched in the eval harness so numbers reflect user experience.

### 429 handling end-to-end

All three API routes detect 429 and return structured user-facing errors. The hooks ([useSuggestions.ts](hooks/useSuggestions.ts), [useTranscription.ts](hooks/useTranscription.ts), [useChat.ts](hooks/useChat.ts)) impose backoff (60s for suggestions, 10s for transcription retries) so the UI shows a friendly message instead of silent failure.

### Suggestions on Node runtime, not Edge

Suggestions makes two sequential Groq calls (attempt + retry). On Vercel's Edge runtime the hard timeout is 25 seconds — two calls on `gpt-oss-120b` can exceed that. Moved to Node (60s limit, `maxDuration: 60`).

### No background prefetch

An earlier version pre-fetched all 3 suggestion answers immediately after each batch arrived — 3 parallel Groq chat calls every 30 seconds. This ate Groq's rate-limit quota and caused user-triggered chat requests to fail. Disabled in favour of live streaming on click (~1–2s to first token).

### Client-side API key

The user's Groq key is stored in `localStorage` and sent via `x-groq-api-key` header on each request. Calls still go through `/api/*` routes (not direct browser → Groq) to keep the `groq-sdk` off the client bundle, enable Edge streaming, and centralise error handling / retries.

### In-memory state, no persistence

Session data (transcript, suggestion batches, chat history) lives in a Zustand store with no persistence. A `beforeunload` warning in [app/page.tsx](app/page.tsx) catches accidental tab closes. The deliberate choice here matches the assignment spec: "one continuous chat per session. No login, no data persistence needed when reloading the page." Export is the only persistence path.

---

## Settings

Three tabs in the Settings modal (gear icon):

- **API Key** — password field with show/hide, "Test" button that fires a minimal completion to validate the key.
- **Prompts** — editable textareas for the 3 prompts (suggestion / chat / expansion), individual Reset buttons per prompt.
- **Behavior** — context window (4–20 chunks), refresh interval (15–120s), auto-refresh toggle, **system-audio capture toggle**, model selectors for Whisper and chat.

Changes persist instantly via Zustand's `persist` middleware (no Save button). Settings version is bumped (currently 4) when the Settings shape changes — existing users pick up new defaults on next load automatically.

---

## Export

The **Export** button downloads a timestamped JSON snapshot of the current session:

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

The settings snapshot lets reviewers reproduce any result with the exact prompts and context window that were active at the time.

---

## What wasn't built

- **Speaker diarization** — Whisper doesn't do it natively; not required by the spec.
- **Mobile layout** — the three-column layout is desktop-first, matching the reference prototype. The app does render on phones via a tab bar but the primary target is laptop/desktop.
- **Component library** — shadcn/ui adds 300+ generated files for primitives this app uses ~5 of; hand-rolled Tailwind instead.
- **Session history / auth / AI summary** — explicitly out of scope per the assignment spec ("no login, no data persistence needed"). An earlier build had Supabase-backed session history and AI summaries; removed to match the spec more closely.
