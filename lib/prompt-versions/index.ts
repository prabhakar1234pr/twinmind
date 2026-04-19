/**
 * Versioned suggestion prompts.
 *
 * TO SWAP VERSIONS: change the two lines marked `*** PICK VERSION HERE ***`
 * below. Then run `npm run eval` to measure. Each version has its eval scores
 * documented in its own file header and in prompt-versions/README.md.
 *
 * Why this exists:
 *   Prompt iteration is expensive — 4+ rounds in a single session each cost
 *   ~90k Groq tokens. Preserving every version as a first-class artifact
 *   means future tuning can re-run any prior version against new transcripts
 *   or a new judge to validate claims, rather than re-deriving them from git.
 */

import { SUGGESTION_PROMPT_V2_0 } from "./v2.0";
import { SUGGESTION_PROMPT_V2_1 } from "./v2.1";
import { SUGGESTION_PROMPT_V2_2 } from "./v2.2";
import { SUGGESTION_PROMPT_V2_3 } from "./v2.3";
import { SUGGESTION_PROMPT_V2_4 } from "./v2.4";
import { SUGGESTION_PROMPT_V2_5 } from "./v2.5";
import { SUGGESTION_PROMPT_V2_6 } from "./v2.6";

// Re-export each version by name so external scripts can cross-compare.
export {
  SUGGESTION_PROMPT_V2_0,
  SUGGESTION_PROMPT_V2_1,
  SUGGESTION_PROMPT_V2_2,
  SUGGESTION_PROMPT_V2_3,
  SUGGESTION_PROMPT_V2_4,
  SUGGESTION_PROMPT_V2_5,
  SUGGESTION_PROMPT_V2_6,
};

// *** PICK VERSION HERE *** — change this to swap which prompt ships.
export const DEFAULT_SUGGESTION_PROMPT = SUGGESTION_PROMPT_V2_5;

// *** PICK VERSION HERE *** — keep the label in sync for eval reports + UI.
export const CURRENT_SUGGESTION_VERSION = "2.5.0";

/** Map for programmatic access — lets the eval harness loop over versions. */
export const ALL_SUGGESTION_PROMPTS: Record<string, string> = {
  "2.0.0": SUGGESTION_PROMPT_V2_0,
  "2.1.0": SUGGESTION_PROMPT_V2_1,
  "2.2.0": SUGGESTION_PROMPT_V2_2,
  "2.3.0": SUGGESTION_PROMPT_V2_3,
  "2.4.0": SUGGESTION_PROMPT_V2_4,
  "2.5.0": SUGGESTION_PROMPT_V2_5,
  "2.6.0": SUGGESTION_PROMPT_V2_6,
};

/** One-line score summary for each version. Updated by eval runs. */
export const VERSION_SCORES: Record<
  string,
  { total: number; specificity: number; variety: number; notes: string }
> = {
  "2.0.0": {
    total: 15.05,
    specificity: 2.78,
    variety: 2.17,
    notes: "Baseline; Brainstorm truncated by TPD — 12/15 batches scored",
  },
  "2.1.0": {
    total: 15.24,
    specificity: 2.84,
    variety: 2.27,
    notes: "HIGHEST TOTAL. Algorithmic variety rule.",
  },
  "2.2.0": {
    total: 15.13,
    specificity: 2.80,
    variety: 2.20,
    notes: "Mandatory verbatim quote + preview grounding. Flat vs v2.1.",
  },
  "2.3.0": {
    total: 14.98,
    specificity: 2.91,
    variety: 2.20,
    notes: "CLARIFYING_INFO bring-it-up rule. Timing fit regressed.",
  },
  "2.4.0": {
    total: 14.53,
    specificity: 2.80,
    variety: 2.00,
    notes: "REGRESSED. Words-to-say + REQUIRED SET backfired.",
  },
  "2.5.0": {
    total: 14.97,
    specificity: 2.96,
    variety: 2.07,
    notes: "HIGHEST SPECIFICITY. Combined best of v2.1 + v2.3.",
  },
  "2.6.0": {
    total: 0,
    specificity: 0,
    variety: 0,
    notes: "INCOMPLETE — TPD cap blocked full eval. Re-run when budget available.",
  },
};
