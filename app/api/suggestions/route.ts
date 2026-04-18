import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import type {
  Suggestion,
  SuggestionsApiRequest,
  SuggestionsApiResponse,
} from "@/types";
import { SUGGESTION_TYPES } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — Node allows up to 60s on Hobby

function renderPreviousSuggestions(prev: Suggestion[]): string {
  if (!prev || prev.length === 0) return "(none yet)";
  return prev
    .slice(-6)
    .map((s) => `- [${s.type}] ${s.preview}`)
    .join("\n");
}

const TYPE_ALIASES: Record<string, (typeof SUGGESTION_TYPES)[number]> = {
  QUESTION: "QUESTION_TO_ASK",
  QUESTION_TO_ASK: "QUESTION_TO_ASK",
  TALKING_POINT: "TALKING_POINT",
  "TALKING-POINT": "TALKING_POINT",
  TALKINGPOINT: "TALKING_POINT",
  TALKING: "TALKING_POINT",
  FACT_CHECK: "FACT_CHECK",
  "FACT-CHECK": "FACT_CHECK",
  FACTCHECK: "FACT_CHECK",
  FACT: "FACT_CHECK",
  DIRECT_ANSWER: "DIRECT_ANSWER",
  "DIRECT-ANSWER": "DIRECT_ANSWER",
  DIRECTANSWER: "DIRECT_ANSWER",
  ANSWER: "DIRECT_ANSWER",
  CLARIFYING_INFO: "CLARIFYING_INFO",
  "CLARIFYING-INFO": "CLARIFYING_INFO",
  CLARIFYINGINFO: "CLARIFYING_INFO",
  CLARIFYING: "CLARIFYING_INFO",
  CLARIFICATION: "CLARIFYING_INFO",
};

function normalizeType(raw: string): (typeof SUGGESTION_TYPES)[number] | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return TYPE_ALIASES[key] ?? null;
}

function strField(s: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (typeof s[k] === "string" && (s[k] as string).trim()) return (s[k] as string).trim();
  }
  return "";
}

function validate(obj: unknown): SuggestionsApiResponse | null {
  if (!obj || typeof obj !== "object") return null;
  // Accept top-level array OR { suggestions: [...] }
  const arr = Array.isArray(obj)
    ? obj
    : Array.isArray((obj as { suggestions?: unknown }).suggestions)
    ? (obj as { suggestions: unknown[] }).suggestions
    : null;
  if (!arr) return null;

  const cleaned = arr
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const s = raw as Record<string, unknown>;
      const rawType = strField(s, "type");
      const type = normalizeType(rawType);
      // Accept camelCase or snake_case variants
      const preview = strField(s, "preview");
      const fullContext = strField(s, "fullContext", "full_context", "context", "detail");
      if (!type || !preview || !fullContext) return null;
      return { type, preview, fullContext };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (cleaned.length < 3) return null;
  return { suggestions: cleaned.slice(0, 3) };
}

function extractJson(raw: string): string {
  // Strip markdown code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find outermost { ... } in the response
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
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
    // No response_format — it causes json_validate_failed on some Groq-hosted models.
    // We extract JSON from the raw text ourselves via extractJson().
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          'You are a JSON API. Respond with ONLY a valid JSON object. No markdown, no prose, no explanation. Start your response with { and end with }. The schema is: {"suggestions":[{"type":"string","preview":"string","fullContext":"string"}]}',
      },
      { role: "user", content: stricterPrefix + prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return extractJson(content);
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
      console.error("[suggestions] validation failed. raw output:", raw);
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
