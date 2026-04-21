import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

function statusFromError(err: unknown): number {
  if (typeof err !== "object" || err === null) return 500;
  const anyErr = err as {
    status?: unknown;
    response?: { status?: unknown };
    code?: unknown;
  };
  const fromStatus = Number(anyErr.status);
  if (Number.isInteger(fromStatus) && fromStatus >= 400) return fromStatus;
  const fromResponse = Number(anyErr.response?.status);
  if (Number.isInteger(fromResponse) && fromResponse >= 400) return fromResponse;
  const code = String(anyErr.code ?? "").toLowerCase();
  if (code.includes("rate")) return 429;
  return 500;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) return apiError(401, "Missing or invalid Groq API key.");

  const groq = createGroqClient(apiKey);
  try {
    await groq.chat.completions.create({
      model: ASSIGNMENT_CHAT_MODEL,
      messages: [{ role: "user", content: "ok" }],
      max_tokens: 1,
      temperature: 0,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        message: "API key valid.",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err) {
    const status = statusFromError(err);
    const msg = err instanceof Error ? err.message : "Groq API key test failed.";
    if (status === 401 || status === 403) {
      return apiError(status, "Groq rejected this API key.");
    }
    if (status === 429) {
      return apiError(429, "Groq rate limit reached. Try again shortly.");
    }
    return apiError(status, msg);
  }
}

