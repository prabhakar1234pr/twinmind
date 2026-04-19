import type {
  ChatMessage,
  ExportedSession,
  Settings,
  SuggestionBatch,
  TranscriptChunk,
} from "@/types";

export function buildExport(args: {
  sessionId: string;
  startedAt: number;
  transcript: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
  settings: Settings;
}): ExportedSession {
  const { apiKey: _omit, ...settingsSnapshot } = args.settings;
  return {
    id: args.sessionId,
    startedAt: args.startedAt,
    exportedAt: Date.now(),
    transcript: args.transcript,
    suggestionBatches: args.suggestionBatches,
    chatMessages: args.chatMessages,
    settingsSnapshot,
  };
}

export function downloadExport(session: ExportedSession): void {
  const iso = new Date(session.exportedAt).toISOString().replace(/[:.]/g, "-");
  const filename = `twinmind-session-${iso}.json`;
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build the rolling transcript slice sent to the suggestions API.
 * Takes the last N chunks so recency is weighted and prompts stay cheap.
 */
export function buildSuggestionTranscript(
  chunks: TranscriptChunk[],
  contextWindowChunks: number
): string {
  if (chunks.length === 0) return "";
  const slice = chunks.slice(-contextWindowChunks);
  return slice
    .map((c) => `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.text}`)
    .join("\n");
}

/**
 * Build the full transcript for chat context. Truncates from the start if it
 * exceeds a rough token budget (~4 chars per token → 30k tokens ≈ 120k chars).
 */
export function buildChatTranscript(chunks: TranscriptChunk[]): string {
  const MAX_CHARS = 120_000;
  const joined = chunks
    .map((c) => `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.text}`)
    .join("\n");
  if (joined.length <= MAX_CHARS) return joined;
  const tail = joined.slice(-MAX_CHARS);
  return `[... earlier transcript truncated for context window ...]\n${tail}`;
}

/**
 * Build a transcript shaped for Groq's tight per-minute token budget.
 * Keeps every one of the last `maxRecentChunks` (dense tail) and samples every
 * `samplingRate`-th chunk from older content (lossy head). For a 60-chunk
 * hour-long transcript that produces roughly: 20 dense + 8 sampled = 28 chunks
 * ≈ 4k input tokens, leaving plenty of headroom under the 6k tokens/minute
 * ceiling for the completion response.
 */
export function buildSmartChatTranscript(
  chunks: TranscriptChunk[],
  maxRecentChunks = 20,
  samplingRate = 5
): string {
  if (chunks.length === 0) return "";

  const formatChunk = (c: TranscriptChunk) =>
    `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.text}`;

  if (chunks.length <= maxRecentChunks) {
    return chunks.map(formatChunk).join("\n");
  }

  const splitIdx = chunks.length - maxRecentChunks;
  const head = chunks.slice(0, splitIdx);
  const tail = chunks.slice(splitIdx);

  const sampledHead = head.filter(
    (_, i) => i % samplingRate === 0 || i === head.length - 1
  );

  const parts: string[] = [];
  if (sampledHead.length > 0) {
    parts.push(
      `[... earlier transcript, sampled 1 of every ${samplingRate} chunks ...]`
    );
    parts.push(sampledHead.map(formatChunk).join("\n"));
    parts.push(`[... end of sampled history, recent chunks follow ...]`);
  }
  parts.push(tail.map(formatChunk).join("\n"));

  return parts.join("\n");
}
