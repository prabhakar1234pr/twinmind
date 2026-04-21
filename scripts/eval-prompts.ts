/**
 * scripts/eval-prompts.ts
 *
 * Offline evaluation harness for TwinMind's suggestion prompts.
 * Calls Groq directly with the same prompts that ship in lib/prompts.ts,
 * scores each suggestion batch on 6 criteria using a smaller meta-judge model,
 * and writes a markdown report to scripts/eval-report-<timestamp>.md.
 *
 * Run:   GROQ_API_KEY=... npx tsx scripts/eval-prompts.ts
 */

import { loadEnv } from "./load-env";
loadEnv();

import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SUGGESTION_PROMPT,
  fillTemplate,
} from "../lib/prompts";
import type { Suggestion, SuggestionType } from "../types";

export const PROMPT_VERSION = "default";

const TARGET_MODEL = "openai/gpt-oss-120b";
const META_MODEL = "openai/gpt-oss-20b";

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("Missing GROQ_API_KEY environment variable. Aborting.");
  process.exit(1);
}
const groq = createGroq({ apiKey });

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

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(3),
  reason: z.string(),
});

interface Transcript {
  id: string;
  label: string;
  chunks: string[]; // each chunk is one ~30s line
}

const SALES_TRANSCRIPT: Transcript = {
  id: "sales",
  label: "Sales Call",
  chunks: [
    "[00:00:30] Prospect: Thanks for jumping on. We're evaluating three vendors right now, including Notion and Airtable, and you're the third.",
    "[00:01:00] Prospect: Our biggest concern is honestly data sovereignty — our CEO flagged it last week, she wants everything in EU regions.",
    "[00:01:30] Prospect: Our budget decision needs to be finalized before end of Q3, so roughly six weeks from now.",
    "[00:02:00] Rep: Totally hear you. We're actually one of the fastest growing databases on GitHub — 70k stars and counting.",
    "[00:02:30] Rep: On data residency, we support EU-only deployment, all your data stays in Frankfurt or Dublin — your choice.",
    "[00:03:00] Prospect: OK, but your pricing page only shows USD. Can you share the actual numbers for a 50-seat workspace with EU hosting?",
    "[00:03:30] Rep: I'll send those over. Most customers in your range land somewhere between twelve and eighteen thousand annually.",
    "[00:04:00] Prospect: And how does that compare to your Notion integration story? We're already running Notion for docs.",
  ],
};

const INTERVIEW_TRANSCRIPT: Transcript = {
  id: "interview",
  label: "Job Interview (Candidate speaking)",
  chunks: [
    "[00:00:30] Interviewer: So tell me about yourself — what's your background and what are you looking for next?",
    "[00:01:00] Candidate: I've been a backend engineer for about seven years, mostly Python and Go, lots of distributed systems work at my last two companies.",
    "[00:01:30] Interviewer: Cool. What's the biggest technical challenge you've faced recently?",
    "[00:02:00] Candidate: Honestly, scaling issues. We had some scaling issues that we worked through as a team.",
    "[00:02:30] Interviewer: Can you be more specific? What kind of scale, what did you actually change?",
    "[00:03:00] Candidate: Uh, it was read-heavy traffic, and we added some caching. I don't remember the exact numbers.",
    "[00:03:30] Interviewer: OK. And what interests you about this role specifically?",
    "[00:04:00] Candidate: I saw you're doing a lot with real-time systems and that's something I want to go deeper on.",
  ],
};

const TECHNICAL_TRANSCRIPT: Transcript = {
  id: "technical",
  label: "Technical Discussion (REST → GraphQL migration)",
  chunks: [
    "[00:00:30] Alex: So we ran the GraphQL pilot for a month on the search endpoints and saw 40% latency improvement.",
    "[00:01:00] Priya: 40% is huge. Was that p50 or p99?",
    "[00:01:30] Alex: That was p50. p99 was only 12% better, which honestly surprised me.",
    "[00:02:00] Jon: Did you account for the N+1 query risk? DataLoader helps but it's not free.",
    "[00:02:30] Alex: Yeah we used DataLoader, and we're caching at the resolver level with Redis.",
    "[00:03:00] Priya: OK so the question is, do we migrate everything or keep REST for the write paths?",
    "[00:03:30] Jon: I'd keep REST for writes. GraphQL mutations are where most of the operational pain comes from.",
    "[00:04:00] Alex: Agreed. Also we need to think about schema stitching vs federation before we commit.",
  ],
};

const NEGOTIATION_TRANSCRIPT: Transcript = {
  id: "negotiation",
  label: "Salary Negotiation",
  chunks: [
    "[00:00:30] HR: So we're excited to move forward with an offer. Before we finalize, what range were you thinking?",
    "[00:01:00] Candidate: Based on my research and my current comp, I was thinking around 150K base.",
    "[00:01:30] HR: I really appreciate you sharing. Unfortunately our band for this level tops out at 130K.",
    "[00:02:00] Candidate: Hmm. That's a meaningful gap. Can you tell me more about the band structure?",
    "[00:02:30] HR: Sure — we have 5 levels, and this role is L3. L4 starts at 140 but requires more senior scope.",
    "[00:03:00] Candidate: Is there flexibility on equity, or signing, if base is fixed?",
    "[00:03:30] HR: Equity is generally fixed per level. Signing bonuses we can sometimes negotiate, usually 10-15K.",
    "[00:04:00] HR: We also do annual merit reviews in March, so there's a path for growth inside the band.",
  ],
};

const BRAINSTORM_TRANSCRIPT: Transcript = {
  id: "brainstorm",
  label: "Product Brainstorm (Onboarding AI)",
  chunks: [
    "[00:00:30] Sam: OK, quick brainstorm. How can we make onboarding less painful? Current drop-off is 60% at step 3.",
    "[00:01:00] Mia: What if we added AI to the onboarding flow? Like an assistant that just talks you through it.",
    "[00:01:30] Sam: Interesting. What would that actually look like in the UI?",
    "[00:02:00] Mia: I don't know, like a chat in the corner?",
    "[00:02:30] Devon: I worry a chat bot feels like an escape hatch, not a fix. We should fix the actual friction at step 3 first.",
    "[00:03:00] Sam: What IS the friction at step 3 exactly? Is it the form, the field count, something else?",
    "[00:03:30] Devon: It's mostly the 'workspace settings' page — 14 fields and half of them are unclear.",
    "[00:04:00] Mia: OK so maybe AI isn't the answer, maybe it's cutting the form in half.",
  ],
};

const ALL_TRANSCRIPTS = [
  SALES_TRANSCRIPT,
  INTERVIEW_TRANSCRIPT,
  TECHNICAL_TRANSCRIPT,
  NEGOTIATION_TRANSCRIPT,
  BRAINSTORM_TRANSCRIPT,
];

interface Criterion {
  key: string;
  label: string;
  description: string;
}

const CRITERIA: Criterion[] = [
  {
    key: "specificity",
    label: "Specificity",
    description:
      "Are the suggestions grounded in specific words from the transcript, or could they apply to any conversation? 0=generic, 1=vaguely relevant, 2=clearly triggered by transcript, 3=quotes specific phrase from transcript.",
  },
  {
    key: "actionability",
    label: "Actionability",
    description:
      "Can the user act on this in the next 30 seconds? 0=no clear action, 1=vague action, 2=clear action, 3=specific words or steps given.",
  },
  {
    key: "previewQuality",
    label: "Preview quality",
    description:
      "Does the preview deliver value without clicking? 0=could be anything, 1=vaguely useful, 2=clearly useful, 3=immediately actionable standalone.",
  },
  {
    key: "timingFit",
    label: "Timing fit",
    description:
      "Does the suggestion fit WHAT IS HAPPENING NOW in the transcript? 0=no connection to recent content, 1=loosely connected, 2=clearly connected, 3=directly addresses the most recent exchange.",
  },
  {
    key: "meetingTypeFit",
    label: "Meeting-type calibration",
    description:
      "Are the suggestion types appropriate for this meeting type? 0=wrong types for context, 1=neutral/generic types, 2=appropriate types, 3=optimal types for the exact situation.",
  },
];

interface ScoredSuggestion {
  suggestion: z.infer<typeof SuggestionSchema>["suggestions"][number];
  scores: Record<string, { score: number; reason: string }>;
  perSuggestionTotal: number;
}

interface ScoredBatch {
  transcriptId: string;
  transcriptLabel: string;
  cycle: number;
  suggestions: ScoredSuggestion[];
  varietyScore: { score: number; reason: string };
  batchTotal: number; // sum of per-criterion averages × 3 + variety = out of 18
}

function renderPrevious(prev: Suggestion[]): string {
  if (prev.length === 0) return "(none yet)";
  return prev
    .slice(-6)
    .map((s) => `- [${s.type}] ${s.preview}`)
    .join("\n");
}

function windowTranscript(chunks: string[], window: number): string {
  return chunks.slice(-window).join("\n");
}

async function callSuggestionsOnce(prompt: string, attempt: 1 | 2) {
  const retrySuffix =
    "\n\nPREVIOUS ATTEMPT FAILED JSON VALIDATION. Return ONLY a valid JSON object with exactly 3 suggestions. No prose, no markdown.";
  const { object } = await generateObject({
    model: groq(TARGET_MODEL),
    schema: SuggestionSchema,
    prompt: attempt === 1 ? prompt : prompt + retrySuffix,
    temperature: attempt === 1 ? 0.4 : 0.2,
    maxOutputTokens: 2000,
    providerOptions: {
      groq: { reasoningEffort: "low" },
    },
  });
  return object;
}

async function callSuggestions(transcriptText: string, prev: Suggestion[]) {
  const prompt = fillTemplate(DEFAULT_SUGGESTION_PROMPT, {
    transcript: transcriptText,
    previousSuggestions: renderPrevious(prev),
  });

  try {
    return await callSuggestionsOnce(prompt, 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (
      lower.includes("json") ||
      lower.includes("validat") ||
      lower.includes("parse") ||
      lower.includes("schema")
    ) {
      console.warn(`[eval] retrying after JSON failure: ${msg.slice(0, 120)}`);
      return await callSuggestionsOnce(prompt, 2);
    }
    throw err;
  }
}

async function scoreCriterion(
  transcriptText: string,
  suggestion: z.infer<typeof SuggestionSchema>["suggestions"][number],
  criterion: Criterion
) {
  const judgePrompt = `You are evaluating the quality of a meeting suggestion. Score the following on a scale of 0-3.

Meeting transcript (last 4 chunks):
${transcriptText}

Suggestion being evaluated:
Type: ${suggestion.type}
Preview: ${suggestion.preview}
fullContext: ${suggestion.fullContext}

Score criterion: ${criterion.description}

Respond with ONLY a JSON object: {"score": 0-3, "reason": "one sentence explanation"}`;

  const { object } = await generateObject({
    model: groq(META_MODEL),
    schema: ScoreSchema,
    prompt: judgePrompt,
    temperature: 0.0,
    maxOutputTokens: 400,
    providerOptions: { groq: { reasoningEffort: "low" } },
  });
  return object;
}

async function scoreVariety(
  transcriptText: string,
  suggestions: z.infer<typeof SuggestionSchema>["suggestions"],
  previousBatch: Suggestion[]
) {
  const prevRendered =
    previousBatch.length === 0
      ? "(no previous batch)"
      : previousBatch.map((s) => `- [${s.type}] ${s.preview}`).join("\n");

  const judgePrompt = `Score the VARIETY of a batch of 3 meeting suggestions on a scale of 0-3.

Meeting transcript:
${transcriptText}

Previous batch:
${prevRendered}

Current batch:
${suggestions.map((s, i) => `${i + 1}. [${s.type}] ${s.preview}\n   ${s.fullContext}`).join("\n")}

Criterion: Are all 3 suggestions different from each other AND from the previous batch?
0 = repeats across batches, 1 = some overlap, 2 = different types but similar themes, 3 = diverse types and diverse themes.

Respond with ONLY a JSON object: {"score": 0-3, "reason": "one sentence explanation"}`;

  const { object } = await generateObject({
    model: groq(META_MODEL),
    schema: ScoreSchema,
    prompt: judgePrompt,
    temperature: 0.0,
    maxOutputTokens: 400,
    providerOptions: { groq: { reasoningEffort: "low" } },
  });
  return object;
}

async function runCycle(
  transcript: Transcript,
  cycle: number,
  prev: Suggestion[]
): Promise<{ scored: ScoredBatch; nextPrev: Suggestion[] }> {
  // Cycle simulates passage of time — expose progressively more of the transcript.
  const windowSize = Math.min(transcript.chunks.length, 4 + cycle * 2);
  const transcriptText = windowTranscript(transcript.chunks, windowSize);

  const result = await callSuggestions(transcriptText, prev);

  const scored: ScoredSuggestion[] = [];
  for (const s of result.suggestions) {
    const scores: Record<string, { score: number; reason: string }> = {};
    for (const c of CRITERIA) {
      scores[c.key] = await scoreCriterion(transcriptText, s, c);
    }
    const perSuggestionTotal = Object.values(scores).reduce(
      (sum, x) => sum + x.score,
      0
    );
    scored.push({ suggestion: s, scores, perSuggestionTotal });
  }

  const previousBatchOnly = prev.slice(-3);
  const varietyScore = await scoreVariety(
    transcriptText,
    result.suggestions,
    previousBatchOnly
  );

  // Build batch total: avg of 5 per-suggestion criteria × 3 + variety → /18.
  const avgPerCriterion = CRITERIA.reduce((acc, c) => {
    const avg =
      scored.reduce((sum, s) => sum + s.scores[c.key].score, 0) /
      scored.length;
    return acc + avg;
  }, 0);
  const batchTotal = Math.round((avgPerCriterion + varietyScore.score) * 10) / 10;

  const asSuggestions: Suggestion[] = result.suggestions.map((s, idx) => ({
    id: `eval-${transcript.id}-${cycle}-${idx}`,
    timestamp: Date.now(),
    type: s.type as SuggestionType,
    preview: s.preview,
    fullContext: s.fullContext,
  }));

  return {
    scored: {
      transcriptId: transcript.id,
      transcriptLabel: transcript.label,
      cycle,
      suggestions: scored,
      varietyScore,
      batchTotal,
    },
    nextPrev: [...prev, ...asSuggestions],
  };
}

function buildReport(batches: ScoredBatch[]): string {
  const lines: string[] = [];
  const timestamp = new Date().toISOString();

  lines.push(`## TwinMind Prompt Evaluation Report`);
  lines.push(`Prompt version: ${PROMPT_VERSION}`);
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Model: ${TARGET_MODEL}`);
  lines.push(`Meta-judge: ${META_MODEL}`);
  lines.push("");

  // Summary
  const totalBatches = batches.length;
  const totalSuggestions = batches.reduce(
    (n, b) => n + b.suggestions.length,
    0
  );

  const perCriterionTotals: Record<string, number> = {};
  for (const c of CRITERIA) perCriterionTotals[c.key] = 0;
  let varietyTotal = 0;

  for (const b of batches) {
    for (const s of b.suggestions) {
      for (const c of CRITERIA) {
        perCriterionTotals[c.key] += s.scores[c.key].score;
      }
    }
    varietyTotal += b.varietyScore.score;
  }

  lines.push(`### Summary Scores (avg across all transcripts and cycles)`);
  lines.push("");
  lines.push(`| Criterion                | Avg score | / 3 |`);
  lines.push(`| ------------------------ | --------- | --- |`);
  for (const c of CRITERIA) {
    const avg = perCriterionTotals[c.key] / totalSuggestions;
    lines.push(`| ${c.label.padEnd(24)} | ${avg.toFixed(2).padStart(9)} | 3   |`);
  }
  lines.push(
    `| ${"Variety (per batch)".padEnd(24)} | ${(varietyTotal / totalBatches)
      .toFixed(2)
      .padStart(9)} | 3   |`
  );
  const totalAvg =
    batches.reduce((n, b) => n + b.batchTotal, 0) / totalBatches;
  lines.push(
    `| ${"BATCH TOTAL".padEnd(24)} | ${totalAvg.toFixed(2).padStart(9)} | 18  |`
  );
  lines.push("");

  // Per-transcript
  lines.push(`### Per-Meeting Results`);
  const byTranscript = new Map<string, ScoredBatch[]>();
  for (const b of batches) {
    if (!byTranscript.has(b.transcriptLabel)) byTranscript.set(b.transcriptLabel, []);
    byTranscript.get(b.transcriptLabel)!.push(b);
  }
  for (const [label, rows] of byTranscript) {
    lines.push("");
    lines.push(`#### ${label}`);
    for (const b of rows) {
      lines.push(`Cycle ${b.cycle} — batch total: **${b.batchTotal.toFixed(1)} / 18**`);
      for (const s of b.suggestions) {
        lines.push(
          `  - [${s.suggestion.type}] "${s.suggestion.preview}" → ${s.perSuggestionTotal}/15`
        );
      }
      lines.push(`  - variety: ${b.varietyScore.score}/3 — ${b.varietyScore.reason}`);
    }
  }
  lines.push("");

  // Weakest suggestions
  const allScored: Array<ScoredSuggestion & { meta: ScoredBatch }> = [];
  for (const b of batches) {
    for (const s of b.suggestions) {
      allScored.push({ ...s, meta: b });
    }
  }
  const weak = allScored
    .filter((s) => s.perSuggestionTotal < 10)
    .sort((a, b) => a.perSuggestionTotal - b.perSuggestionTotal);

  lines.push(`### Weakest Suggestions (per-suggestion score < 10 / 15)`);
  if (weak.length === 0) {
    lines.push("None — every suggestion scored ≥ 10. 🎯");
  } else {
    for (const s of weak) {
      lines.push("");
      lines.push(
        `- ${s.meta.transcriptLabel} / Cycle ${s.meta.cycle} — [${s.suggestion.type}] ${s.perSuggestionTotal}/15`
      );
      lines.push(`  Preview: ${s.suggestion.preview}`);
      for (const c of CRITERIA) {
        const sc = s.scores[c.key];
        lines.push(`  - ${c.label}: ${sc.score}/3 — ${sc.reason}`);
      }
    }
  }
  lines.push("");

  // Recommendations (heuristic)
  lines.push(`### Recommendations`);
  for (const c of CRITERIA) {
    const avg = perCriterionTotals[c.key] / totalSuggestions;
    if (avg < 2.0) {
      lines.push(
        `- ${c.label} avg is ${avg.toFixed(2)}. Consider tightening the prompt section that drives this criterion.`
      );
    }
  }
  if (varietyTotal / totalBatches < 2.0) {
    lines.push(
      `- Variety avg is ${(varietyTotal / totalBatches).toFixed(2)}. Strengthen the "suggestion diversity enforcement" rule.`
    );
  }
  if (totalAvg >= 15) {
    lines.push(`- Overall score is strong (${totalAvg.toFixed(2)} / 18). No urgent changes indicated.`);
  }
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log(`[eval] prompt version ${PROMPT_VERSION} — target ${TARGET_MODEL}`);
  const scoredBatches: ScoredBatch[] = [];

  // Pace cycles so we stay under the Groq free-tier TPM budget.
  // Each cycle uses ~3k input + ~1k output tokens on 120b, then 6 meta-judge
  // calls at ~500 tokens each on 20b. Wait 3s between cycles to give TPM room.
  const CYCLE_PAUSE_MS = 3_000;

  for (const t of ALL_TRANSCRIPTS) {
    console.log(`\n[eval] === ${t.label} ===`);
    let prev: Suggestion[] = [];
    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`[eval] ${t.label} cycle ${cycle}`);
      try {
        const { scored, nextPrev } = await runCycle(t, cycle, prev);
        scoredBatches.push(scored);
        prev = nextPrev;
        console.log(
          `[eval]   batch total ${scored.batchTotal.toFixed(1)} / 18`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[eval] cycle failed: ${msg.slice(0, 300)}`);
        // If we hit TPM, back off harder before the next one.
        if (msg.toLowerCase().includes("rate limit") || msg.includes("429")) {
          console.warn("[eval] rate-limit backoff 60s");
          await new Promise((r) => setTimeout(r, 60_000));
        }
      }
      await new Promise((r) => setTimeout(r, CYCLE_PAUSE_MS));
    }
  }

  const report = buildReport(scoredBatches);

  const here = dirname(fileURLToPath(import.meta.url));
  mkdirSync(here, { recursive: true });
  const isoSafe = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(here, `eval-report-${isoSafe}.md`);
  writeFileSync(outPath, report, "utf8");

  console.log("\n" + report);
  console.log(`\n[eval] report saved → ${outPath}`);
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(1);
});
