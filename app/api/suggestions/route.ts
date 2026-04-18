import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import type {
  Suggestion,
  SuggestionsApiRequest,
  SuggestionsApiResponse,
} from "@/types";
import { SUGGESTION_TYPES } from "@/types";

export const runtime = "edge";

function renderPreviousSuggestions(prev: Suggestion[]): string {
  if (!prev || prev.length === 0) return "(none yet)";
  return prev
    .slice(-6)
    .map((s) => `- [${s.type}] ${s.preview}`)
    .join("\n");
}

function validate(obj: unknown): SuggestionsApiResponse | null {
  if (!obj || typeof obj !== "object") return null;
  const maybe = obj as { suggestions?: unknown };
  if (!Array.isArray(maybe.suggestions)) return null;
  const cleaned = maybe.suggestions
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const s = raw as Record<string, unknown>;
      const type = typeof s.type === "string" ? s.type : "";
      const preview = typeof s.preview === "string" ? s.preview : "";
      const fullContext =
        typeof s.fullContext === "string" ? s.fullContext : "";
      if (!SUGGESTION_TYPES.includes(type as (typeof SUGGESTION_TYPES)[number]))
        return null;
      if (!preview || !fullContext) return null;
      return {
        type: type as (typeof SUGGESTION_TYPES)[number],
        preview,
        fullContext,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (cleaned.length < 3) return null;
  return { suggestions: cleaned.slice(0, 3) };
}

async function callGroq(
  apiKey: string,
  model: string,
  prompt: string,
  stricter = false
): Promise<string> {
  const groq = createGroqClient(apiKey);
  const stricterPrefix = stricter
    ? "Return ONLY a JSON object. No markdown fences, no prose, no preamble. Begin your response with { and end with }.\n\n"
    : "";

  const completion = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 1400,
    messages: [
      {
        role: "system",
        content:
          "You are a precise JSON-producing assistant. Always return valid JSON matching the requested schema.",
      },
      { role: "user", content: stricterPrefix + prompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
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
    let raw = await callGroq(apiKey, chatModel, prompt, false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    let validated = parsed ? validate(parsed) : null;

    if (!validated) {
      raw = await callGroq(apiKey, chatModel, prompt, true);
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      validated = parsed ? validate(parsed) : null;
    }

    if (!validated) {
      return apiError(
        502,
        "Model returned invalid suggestions JSON after retry."
      );
    }

    return new Response(JSON.stringify(validated), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Suggestion call failed.";
    return apiError(500, msg);
  }
}
