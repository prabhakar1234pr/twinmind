import { NextRequest } from "next/server";
import {
  apiError,
  createGroqClient,
  getApiKeyFromRequest,
  getErrorStatus,
} from "@/lib/groq";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);

  const groq = createGroqClient(apiKey);
  try {
    const TEST_TIMEOUT_MS = 9_000;
    await Promise.race([
      groq.chat.completions.create({
        model: ASSIGNMENT_CHAT_MODEL,
        messages: [{ role: "user", content: "ok" }],
        max_tokens: 1,
        temperature: 0,
      }),
      new Promise((_, reject) =>
        setTimeout(() => {
          const timeoutErr = Object.assign(
            new Error("Groq key test timed out."),
            { code: "ETIMEDOUT" }
          );
          reject(timeoutErr);
        }, TEST_TIMEOUT_MS)
      ),
    ]);
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
    const status = getErrorStatus(err);
    const msg = err instanceof Error ? err.message : "Groq API key test failed.";
    return apiError(status, msg);
  }
}

