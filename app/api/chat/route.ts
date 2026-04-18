import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import type { ChatApiRequest } from "@/types";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) return apiError(401, "Missing or invalid Groq API key.");

  let body: ChatApiRequest;
  try {
    body = (await req.json()) as ChatApiRequest;
  } catch {
    console.error("[chat] failed to parse request body");
    return apiError(400, "Invalid JSON body.");
  }

  const { messages, transcript, systemPrompt, chatModel } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    console.error("[chat] empty messages array");
    return apiError(422, "No messages in request.");
  }

  console.log(`[chat] model=${chatModel} msgs=${messages.length} transcript_chars=${(transcript ?? "").length}`);
  const groq = createGroqClient(apiKey);

  const renderedSystem = fillTemplate(systemPrompt, {
    transcript: (transcript ?? "").trim() || "(no transcript yet)",
  });

  try {
    const stream = await groq.chat.completions.create({
      model: chatModel,
      stream: true,
      temperature: 0.6,
      max_tokens: 800,
      messages: [
        { role: "system", content: renderedSystem },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const encoder = new TextEncoder();
    let tokenCount = 0;
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              tokenCount++;
              controller.enqueue(encoder.encode(delta));
            }
          }
          console.log(`[chat] stream done tokens≈${tokenCount} ms=${Date.now() - t0}`);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Streaming chat failed.";
          console.error(`[chat] stream error ms=${Date.now() - t0}`, msg);
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
    console.error(`[chat] error ms=${Date.now() - t0}`, msg);
    return apiError(500, msg);
  }
}
