import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { apiError, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
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

  const { messages, transcript, systemPrompt, chatModel } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return apiError(422, "No messages in request.");
  }

  const renderedSystem = fillTemplate(systemPrompt, {
    transcript: (transcript ?? "").trim() || "(no transcript yet)",
  });

  const groq = createGroq({ apiKey });
  const result = streamText({
    model: groq(chatModel),
    system: renderedSystem,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: 0.6,
    maxOutputTokens: 800,
  });

  return result.toTextStreamResponse();
}
