import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import type { ChatApiRequest } from "@/types";

export const runtime = "edge";

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

  const groq = createGroqClient(apiKey);

  const renderedSystem = fillTemplate(systemPrompt, {
    transcript: (transcript ?? "").trim() || "(no transcript yet)",
  });

  try {
    const stream = await groq.chat.completions.create({
      model: chatModel,
      stream: true,
      temperature: 0.6,
      max_tokens: 1200,
      messages: [
        { role: "system", content: renderedSystem },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Streaming chat failed.";
          controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat call failed.";
    return apiError(500, msg);
  }
}
