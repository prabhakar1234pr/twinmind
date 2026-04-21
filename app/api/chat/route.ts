import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { apiError, getApiKeyFromRequest, getErrorStatus } from "@/lib/groq";
import { createLogger } from "@/lib/logger";
import { fillTemplate } from "@/lib/prompts";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";
import type { ChatApiRequest } from "@/types";

export const runtime = "edge";
export const maxDuration = 30;
const log = createLogger("api:chat");

function sseEvent(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function extractUpstreamError(err: unknown): { status: number; message: string } {
  let status = getErrorStatus(err);
  let message = err instanceof Error ? err.message : String(err ?? "Unknown upstream error");
  let parsedMessageFromBody = false;

  if (typeof err === "object" && err !== null) {
    const anyErr = err as {
      statusCode?: unknown;
      responseBody?: unknown;
      data?: unknown;
      message?: unknown;
    };
    const fromStatusCode = Number(anyErr.statusCode);
    if (Number.isInteger(fromStatusCode) && fromStatusCode >= 400) {
      status = fromStatusCode;
    }

    if (typeof anyErr.responseBody === "string" && anyErr.responseBody.trim()) {
      try {
        const parsed = JSON.parse(anyErr.responseBody) as {
          error?: { message?: unknown };
          message?: unknown;
        };
        if (typeof parsed.error?.message === "string" && parsed.error.message.trim()) {
          message = parsed.error.message;
          parsedMessageFromBody = true;
        } else if (typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message;
          parsedMessageFromBody = true;
        }
      } catch {
        // Keep the original message when responseBody is not valid JSON.
      }
    }

    if (
      typeof anyErr.data === "object" &&
      anyErr.data !== null &&
      "error" in anyErr.data
    ) {
      const dataErr = (anyErr.data as { error?: { message?: unknown } }).error;
      if (typeof dataErr?.message === "string" && dataErr.message.trim()) {
        message = dataErr.message;
        parsedMessageFromBody = true;
      }
    }

    if (!parsedMessageFromBody && typeof anyErr.message === "string" && anyErr.message.trim()) {
      message = anyErr.message;
    }
  }

  return { status, message };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const apiKey = getApiKeyFromRequest(req);
  log.info("received chat request", { hasKey: apiKey.length > 0 });

  let body: ChatApiRequest;
  try {
    body = (await req.json()) as ChatApiRequest;
  } catch {
    log.warn("invalid json body");
    return apiError(400, "Invalid JSON body.");
  }

  const { messages, transcript, systemPrompt } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    log.warn("no messages in request");
    return apiError(422, "No messages in request.");
  }

  const renderedSystem = fillTemplate(systemPrompt, {
    transcript: (transcript ?? "").trim() || "(no transcript yet)",
  });

  const groq = createGroq({ apiKey });
  try {
    log.info("starting chat stream", { messageCount: messages.length });
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamClosed = false;
        let errorEventSent = false;

        const enqueueEvent = (event: string, payload: Record<string, unknown>) => {
          if (streamClosed) return;
          controller.enqueue(encoder.encode(sseEvent(event, payload)));
          if (event === "error") errorEventSent = true;
        };

        const closeStream = () => {
          if (streamClosed) return;
          try {
            controller.close();
          } catch {
            // If already closed by runtime, ignore.
          } finally {
            streamClosed = true;
          }
        };

        try {
          let emittedToken = false;
          let tokenCount = 0;
          let upstreamError: { status: number; message: string } | null = null;

          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              const text = part.text;
              if (!text) continue;
              emittedToken = true;
              tokenCount += 1;
              enqueueEvent("token", { text });
              continue;
            }
            if (part.type === "error") {
              upstreamError = extractUpstreamError(part.error);
              log.error("chat upstream stream error part", {
                status: upstreamError.status,
                message: upstreamError.message,
                elapsedMs: Date.now() - t0,
              });
              enqueueEvent("error", {
                status: upstreamError.status,
                message: upstreamError.message,
              });
              return;
            }
          }

          if (upstreamError) return;
          if (!emittedToken) {
            log.warn("chat stream ended with no tokens", { elapsedMs: Date.now() - t0 });
            enqueueEvent("error", {
              status: 502,
              message: "Upstream returned an empty token stream.",
            });
            return;
          }
          log.info("chat stream completed", {
            tokenChunks: tokenCount,
            elapsedMs: Date.now() - t0,
          });
          enqueueEvent("done", { ok: true });
        } catch (streamErr) {
          const upstream = extractUpstreamError(streamErr);
          log.error("chat stream error", {
            status: upstream.status,
            message: upstream.message,
            elapsedMs: Date.now() - t0,
          });
          if (!errorEventSent) {
            enqueueEvent("error", {
              status: upstream.status,
              message: upstream.message,
            });
          }
        } finally {
          closeStream();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat call failed.";
    const status = getErrorStatus(err);
    log.error("chat request failed before streaming", {
      status,
      message: msg,
      elapsedMs: Date.now() - t0,
    });
    return apiError(status, msg);
  }
}
