import Groq from "groq-sdk";

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
