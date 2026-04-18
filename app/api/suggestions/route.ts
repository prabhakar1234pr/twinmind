import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { apiError, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
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

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) return apiError(401, "Missing or invalid Groq API key.");

  let body: SuggestionsApiRequest;
  try {
    body = (await req.json()) as SuggestionsApiRequest;
  } catch {
    return apiError(400, "Invalid JSON body.");
  }

  const { transcript, previousSuggestions, suggestionPrompt, chatModel } = body;
  if (!transcript || transcript.trim().length < 10) {
    return apiError(422, "Transcript too short to generate suggestions.");
  }

  const prompt = fillTemplate(suggestionPrompt, {
    transcript: transcript.trim(),
    previousSuggestions: renderPreviousSuggestions(previousSuggestions ?? []),
  });

  try {
    const groq = createGroq({ apiKey });
    const { object } = await generateObject({
      model: groq(chatModel),
      schema: SuggestionSchema,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Suggestion call failed.";
    console.error("[suggestions] error:", msg);
    return apiError(500, msg);
  }
}
