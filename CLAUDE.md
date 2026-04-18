# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

TwinMind's Live Suggestions take-home: a web app that captures mic audio, transcribes it with Whisper on Groq, and surfaces 3 context-aware suggestions every ~30 seconds. Clicking a suggestion produces a detailed streaming answer in a chat panel with full transcript context.

Evaluation priorities (in order):

1. Suggestion quality — useful, varied, well-timed
2. Chat answer quality
3. Prompt engineering
4. Full-stack engineering
5. Code quality
6. Latency
7. Overall experience

When making tradeoffs, bias toward the top of that list.

## Stack

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS (no component library — hand-rolled Tailwind primitives)
- Zustand (+ `persist` middleware) for state
- `groq-sdk` for all LLM + transcription calls
- Deploys to Vercel

No server-side secrets. Users paste their own Groq API key in the Settings modal; it's sent per request via `x-groq-api-key` header.

## Architecture map

- `app/api/transcribe/route.ts` — **Node runtime**, audio blob → Whisper.
- `app/api/suggestions/route.ts` — **Edge runtime**, JSON-mode completion with one retry on parse failure.
- `app/api/chat/route.ts` — **Edge runtime**, text streaming via `ReadableStream`.
- `hooks/useAudioRecorder.ts` — **restart-based chunking**, NOT `timeslice` (timeslice produces partial blobs Whisper can't decode).
- `hooks/useTranscription.ts` — serialized FIFO queue; prevents Groq rate-limit pile-ups.
- `hooks/useSuggestions.ts` — polling loop that fires on (a) first chunk or (b) new chunk + interval elapsed.
- `hooks/useChat.ts` — reads `response.body` as a stream, appends deltas into the Zustand message via `appendToMessage(id, delta)`.
- `store/sessionStore.ts` — in-memory, no persistence.
- `store/settingsStore.ts` — persisted to localStorage.
- `lib/prompts.ts` — the highest-leverage file. Suggestion/chat/expansion templates.
- `types/index.ts` — single source of truth for all shared interfaces.

## Rules of the road

- **`types/index.ts` is the shared contract.** Changing a type here affects both client and API routes — update both together.
- **Prompts live in `lib/prompts.ts` as plain string constants.** Do not move them to JSON or YAML. Settings tab reads the defaults from here for the "Reset" buttons.
- **API key flows via header, not env.** Never read `process.env.GROQ_API_KEY`. Always use `getApiKeyFromRequest(req)` from `lib/groq.ts`.
- **Suggestions are always exactly 3.** The validator in `/api/suggestions` rejects any response that doesn't have 3 well-formed suggestions — prompt changes should preserve that guarantee.
- **Don't add shadcn/ui or another component library.** The repo intentionally avoids one. Add hand-rolled Tailwind components to `components/` if needed.
- **Don't persist session data.** Sessions are in-memory by design; export is the only persistence path. A `beforeunload` warning in `app/page.tsx` handles accidental tab close.

## Common commands

```bash
npm run dev          # next dev on :3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

## Local testing without Groq

There's no mock mode. Provide a real Groq key in Settings — the "Test" button calls `/api/chat` with a one-word completion to validate. Free tier is sufficient for full manual testing.

## When adding a new suggestion type

1. Add the new literal to `SuggestionType` in `types/index.ts` and extend `SUGGESTION_TYPES`.
2. Update the "5 suggestion types" section in `DEFAULT_SUGGESTION_PROMPT` in `lib/prompts.ts`.
3. Add label + color mapping in `components/suggestions/SuggestionTypeBadge.tsx`.
4. The `/api/suggestions` validator picks up the new type automatically via `SUGGESTION_TYPES`.

## When changing default prompts

After editing `lib/prompts.ts`, existing users won't see the change until they open Settings → Prompts → Reset (their localStorage holds the old prompt). If you want to force the update, bump the `version` number in `store/settingsStore.ts` — Zustand's persist middleware will clear stale storage.

## What not to do

- Don't route calls directly to Groq from the browser. They go through `/api/*` on purpose (cleaner error handling, Edge streaming, smaller client bundle).
- Don't use `MediaRecorder`'s `timeslice` option. Only `stop()` + `start()` produces chunks Whisper can transcribe.
- Don't add `"use server"` or Server Actions. API routes cover everything cleanly.
- Don't introduce a database. Sessions are meant to be ephemeral; export JSON is the deliverable.
