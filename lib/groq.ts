import Groq from "groq-sdk";

/**
 * Groq free-tier rate limits (approximate, check console.groq.com for current values):
 *
 * Chat / completion models
 * - 30 requests / minute
 * - 6,000 tokens / minute (input + output combined)
 * - 131,072 token context window
 *
 * Whisper transcription
 * - 20 requests / minute
 * - 7,200 audio-seconds / minute (so 30s chunks → 240 chunks/min cap from audio budget)
 *
 * Known-tight limits we ran into while building
 * - openai/gpt-oss-120b: input tokens count against the 6k/min token budget, so a
 *   long transcript (>30k chars ≈ 7.5k tokens) in a single chat call alone can
 *   blow the minute budget. buildSmartChatTranscript in lib/session.ts is the
 *   mitigation — keep the tail dense, sample the head.
 *
 * Usage pattern for this app (steady state)
 * - 30s audio chunk → 2 Whisper req/min (well under 20/min)
 * - 30s suggestion refresh → 2 completion req/min × ~1.5k tokens = 3k tokens/min
 * - Chat is user-triggered; 1–2 msgs/min at worst
 * - Concurrent refresh + chat can briefly double the token rate
 *
 * Failure mode to watch for
 * - 429 from Groq means "pause and back off". Our routes translate this to a
 *   user-friendly 429 so the hooks can impose a cooldown.
 */

export const API_KEY_HEADER = "x-groq-api-key";

export function getApiKeyFromRequest(req: Request): string | null {
  const key = req.headers.get(API_KEY_HEADER);
  if (!key || key.trim().length < 8) return null;
  return key.trim();
}

export function createGroqClient(apiKey: string): Groq {
  return new Groq({ apiKey });
}

export function apiError(
  status: number,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    {
      status,
      headers: { "content-type": "application/json" },
    }
  );
}

/**
 * True if a Groq SDK error message looks like a 429 / rate-limit response.
 * Centralized so every route checks the same way.
 */
export function isRateLimitError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = msg.toLowerCase();
  return (
    msg.includes("429") ||
    lower.includes("rate_limit") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  );
}

/**
 * True if an error looks like a JSON parse / schema-validation failure from
 * generateObject. Used in the suggestions route to decide whether to retry.
 */
export function isJsonSchemaError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = msg.toLowerCase();
  return (
    lower.includes("json") ||
    lower.includes("parse") ||
    lower.includes("validat") ||
    lower.includes("schema") ||
    lower.includes("zod")
  );
}
