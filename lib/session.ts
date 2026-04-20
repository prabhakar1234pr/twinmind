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
 * Build a human-readable plain-text export of the session: transcript,
 * suggestion batches, and chat history. Each section is clearly demarcated
 * so the file reads cleanly in any text editor.
 */
export function buildExportText(args: {
  sessionId: string;
  startedAt: number;
  transcript: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
}): string {
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString();
  const fmtDateTime = (ts: number) => new Date(ts).toLocaleString();

  const lines: string[] = [];

  lines.push("# TwinMind Live Suggestions — Session Export");
  lines.push("");
  lines.push(`Session ID:   ${args.sessionId}`);
  lines.push(`Started at:   ${fmtDateTime(args.startedAt)}`);
  lines.push(`Exported at:  ${fmtDateTime(Date.now())}`);
  lines.push("");

  lines.push("## Transcript");
  lines.push("");
  if (args.transcript.length === 0) {
    lines.push("(no transcript captured)");
  } else {
    for (const chunk of args.transcript) {
      lines.push(`[${fmtTime(chunk.timestamp)}] ${chunk.text}`);
    }
  }
  lines.push("");

  lines.push("## Suggestions");
  lines.push("");
  if (args.suggestionBatches.length === 0) {
    lines.push("(no suggestion batches generated)");
  } else {
    args.suggestionBatches.forEach((batch, i) => {
      lines.push(`--- Batch ${i + 1} @ ${fmtTime(batch.timestamp)} ---`);
      batch.suggestions.forEach((s, j) => {
        lines.push(`  ${j + 1}. [${s.type}] ${s.preview}`);
        if (s.fullContext && s.fullContext !== s.preview) {
          lines.push(`     ${s.fullContext}`);
        }
      });
      lines.push("");
    });
  }

  lines.push("## Chat");
  lines.push("");
  if (args.chatMessages.length === 0) {
    lines.push("(no chat messages)");
  } else {
    for (const msg of args.chatMessages) {
      const who = msg.role === "user" ? "User" : "Assistant";
      lines.push(`[${fmtTime(msg.timestamp)}] ${who}:`);
      lines.push(msg.content);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function downloadExportText(text: string, sessionId: string): void {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `twinmind-session-${sessionId}-${iso}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
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
 * Build chat transcript from only the last N chunks. Useful for features that
 * need a strict, user-controlled context window size.
 */
export function buildChatTranscriptFromWindow(
  chunks: TranscriptChunk[],
  windowChunks: number
): string {
  if (chunks.length === 0) return "";
  const size = Math.max(1, windowChunks);
  return buildChatTranscript(chunks.slice(-size));
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
