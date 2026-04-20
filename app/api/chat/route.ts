import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { apiError, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";
import type { ChatApiRequest } from "@/types";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) return apiError(401, "Missing or invalid Groq API key.");

  let body: ChatApiRequest;
  try {
    body = (await req.json()) as ChatApiRequest;
  } catch {
    return apiError(400, "Invalid JSON body.");
  }

  const { messages, transcript, systemPrompt } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return apiError(422, "No messages in request.");
  }

  const renderedSystem = fillTemplate(systemPrompt, {
    transcript: (transcript ?? "").trim() || "(no transcript yet)",
  });

  const groq = createGroq({ apiKey });
  try {
    const result = streamText({
      model: groq(ASSIGNMENT_CHAT_MODEL),
      system: renderedSystem,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.5,
      maxOutputTokens: 1200,
      providerOptions: {
        // Chat answers need more depth than suggestions. Medium reasoning gives
        // quality without blowing the first-token latency budget.
        groq: { reasoningEffort: "medium" },
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat call failed.";
    if (
      msg.includes("429") ||
      msg.includes("rate_limit") ||
      msg.toLowerCase().includes("rate limit")
    ) {
      console.error("[chat] rate limit hit");
      return apiError(429, "Rate limit reached. Please wait ~30 seconds and retry.");
    }
    console.error("[chat] error:", msg);
    return apiError(500, msg);
  }
}
