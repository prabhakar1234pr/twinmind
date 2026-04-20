# TwinMind — Live Suggestions

Minimal assignment-focused app:
- records microphone audio
- transcribes in 30-second chunks
- generates 3 live suggestions per refresh
- opens detailed answers in chat on suggestion click
- exports session as JSON or TXT

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, add your Groq API key in Settings, and start recording.

## Stack

- Next.js App Router + TypeScript
- Zustand for state
- Tailwind CSS
- Groq (Whisper + GPT-OSS) via API routes

## Core structure

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
```
