import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { GroqProvider } from "@ai-sdk/groq";
import { z } from "zod";
import {
  apiError,
  getErrorStatus,
  getApiKeyFromRequest,
  isJsonSchemaError,
  isRateLimitError,
} from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import { ASSIGNMENT_CHAT_MODEL } from "@/lib/settings";
import type { Suggestion, SuggestionsApiRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        type: z.enum([
          "QUESTION_TO_ASK",
          "TALKING_POINT",
          "FACT_CHECK",
          "DIRECT_ANSWER",
          "CLARIFYING_INFO",
        ]),
        preview: z.string(),
        fullContext: z.string(),
      })
    )
    .length(3),
});

function renderPreviousSuggestions(prev: Suggestion[]): string {
  if (!prev || prev.length === 0) return "(none yet)";
  return prev
    .slice(-6)
    .map((s) => `- [${s.type}] ${s.preview}`)
    .join("\n");
}

async function generateSuggestions(
  groq: GroqProvider,
  model: string,
  prompt: string,
  attempt: 1 | 2
) {
  const retrySuffix =
    "\n\nPREVIOUS ATTEMPT FAILED JSON VALIDATION. Be extra careful: return ONLY a valid JSON object with exactly 3 suggestions, each with a valid type, a string preview, and a string fullContext. No prose, no markdown.";
  const { object } = await generateObject({
    model: groq(model),
    schema: SuggestionSchema,
    prompt: attempt === 1 ? prompt : prompt + retrySuffix,
    temperature: attempt === 1 ? 0.4 : 0.2,
    maxOutputTokens: 2000,
    providerOptions: {
      // gpt-oss-120b's default reasoning burns output tokens. Suggestions are a
      // structured-output task — keep reasoning low for latency + reliability.
      groq: { reasoningEffort: "low" },
    },
  });
  return object;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);

  let body: SuggestionsApiRequest;
  try {
    body = (await req.json()) as SuggestionsApiRequest;
  } catch {
    return apiError(400, "Invalid JSON body.");
  }

  const { transcript, previousSuggestions, suggestionPrompt } = body;
  if (!transcript || transcript.trim().length < 10) {
    return apiError(422, "Transcript too short to generate suggestions.");
  }
  if (!suggestionPrompt || typeof suggestionPrompt !== "string") {
    return apiError(422, "Missing suggestionPrompt.");
  }
  const prompt = fillTemplate(suggestionPrompt, {
    transcript: transcript.trim(),
    previousSuggestions: renderPreviousSuggestions(previousSuggestions ?? []),
  });

  const groq = createGroq({ apiKey });

  try {
    let result;
    try {
      result = await generateSuggestions(groq, ASSIGNMENT_CHAT_MODEL, prompt, 1);
    } catch (firstErr) {
      if (isRateLimitError(firstErr)) throw firstErr;
      if (isJsonSchemaError(firstErr)) {
        console.warn(
          "[suggestions] retrying after parse failure:",
          firstErr instanceof Error ? firstErr.message : firstErr
        );
        result = await generateSuggestions(groq, ASSIGNMENT_CHAT_MODEL, prompt, 2);
      } else {
        throw firstErr;
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Suggestion call failed.";
    const status = getErrorStatus(err);
    console.error("[suggestions] error:", msg);
    return apiError(status, msg);
  }
}
