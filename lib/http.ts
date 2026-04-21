export interface FetchWithTimeoutInit extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const { timeoutMs = 20_000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(`timeout:${timeoutMs}`), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function parseApiErrorMessage(
  res: Response,
  fallback = "Request failed."
): Promise<string> {
  const raw = (await res.text()).trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
  } catch {
    // Non-JSON body, use raw text.
  }
  return raw;
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 502 || status === 503 || status === 504;
}

export function isLikelyTransientNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("timeout") ||
    lower.includes("aborted")
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

