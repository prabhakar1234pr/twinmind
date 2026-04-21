import { NextRequest } from "next/server";
import {
  apiError,
  createGroqClient,
  getApiKeyFromRequest,
  getErrorStatus,
} from "@/lib/groq";
import { createLogger } from "@/lib/logger";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;
const log = createLogger("api:key-test");

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const apiKey = getApiKeyFromRequest(req);
  log.info("received key test request", { hasKey: apiKey.length > 0 });

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
    log.info("key test succeeded", { elapsedMs: Date.now() - t0 });
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
    log.warn("key test failed", { status, message: msg, elapsedMs: Date.now() - t0 });
    return apiError(status, msg);
  }
}

