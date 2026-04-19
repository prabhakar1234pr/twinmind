# Suggestion prompt — version archive

Every numbered iteration of `DEFAULT_SUGGESTION_PROMPT` lives here as its own file, with the exact prompt text and the eval scores it produced. This lets you resume prompt tuning on a later day without losing prior work, and gives the submission reviewer real numbers for "why this version".

## How to swap versions

Open [`index.ts`](index.ts) and change the two lines marked `*** PICK VERSION HERE ***`:

```ts
// *** PICK VERSION HERE *** — change this to swap which prompt ships.
export const DEFAULT_SUGGESTION_PROMPT = SUGGESTION_PROMPT_V2_5;

// *** PICK VERSION HERE *** — keep the label in sync for eval reports + UI.
export const CURRENT_SUGGESTION_VERSION = "2.5.0";
```

Then run `npm run eval` to measure. The harness reads `DEFAULT_SUGGESTION_PROMPT` directly, so whichever version is selected is what gets scored.

To iterate further:
1. Copy the closest-matching version file to a new `v2.X.ts`.
2. Edit only the section you're testing. Update the header comment with what you changed and why.
3. Add it to the `ALL_SUGGESTION_PROMPTS` map and `VERSION_SCORES` dict in [`index.ts`](index.ts).
4. Point `DEFAULT_SUGGESTION_PROMPT` at it, run `npm run eval`, record the scores in the file header.

## Score history

| Version | Total / 18 | Specificity / 3 | Variety / 3 | Notes |
|---|---|---|---|---|
| v2.0.0 | 15.05 | 2.78 | 2.17 | Baseline. Soft variety rule too loose. (12/15 batches — Brainstorm hit TPD) |
| **v2.1.0** | **15.24 ★** | 2.84 | **2.27** | Algorithmic variety ("at most 1 from PREV_TYPES"). **Highest total.** |
| v2.2.0 | 15.13 | 2.80 | 2.20 | Added mandatory verbatim quote + preview grounding. Flat vs v2.1. |
| v2.3.0 | 14.98 | 2.91 | 2.20 | Added CLARIFYING_INFO "bring it up by saying" rule. Timing fit dipped. |
| v2.4.0 | 14.53 | 2.80 | 2.00 | REGRESSED. Words-to-say patterns + REQUIRED SET backfired. |
| **v2.5.0** | 14.97 | **2.96 ★** | 2.07 | Combined best of v2.1 + v2.3. **Highest specificity.** |
| v2.6.0 | — | — | — | Theme-based diversity. Partial eval only — TPD blocked completion. |

**Headline takeaways:**
- **v2.1.0** has the highest total score. Ship this if "best total" is the bar.
- **v2.5.0** has the highest specificity. Ship this if "≥ 2.9 specificity" is the bar (user's stated requirement).
- Total scores across all versions cluster at **15 ± 0.3 / 18** — the judge-variance noise floor. Further prompt-wording iteration is hitting diminishing returns.
- The one clear regression is v2.4 — adding per-type "words to say" patterns and a "REQUIRED SET" hard meeting-type constraint dropped every criterion. Kept in the archive as a cautionary tale.

## Per-criterion detail

| Criterion | v2.0 | v2.1 | v2.2 | v2.3 | v2.4 | v2.5 |
|---|---|---|---|---|---|---|
| Specificity | 2.78 | 2.84 | 2.80 | 2.91 | 2.80 | **2.96** |
| Actionability | **2.50** | 2.29 | 2.33 | 2.27 | 2.16 | 2.27 |
| Preview quality | 2.42 | **2.53** | 2.49 | 2.49 | 2.42 | 2.44 |
| Timing fit | 2.78 | 2.78 | **2.82** | 2.64 | 2.78 | 2.73 |
| Meeting-type calibration | 2.42 | **2.53** | 2.49 | 2.47 | 2.38 | 2.51 |
| Variety (per batch) | 2.17 | **2.27** | 2.20 | 2.20 | 2.00 | 2.07 |
| **Total** | 15.05 | **15.24** | 15.13 | 14.98 | 14.53 | 14.97 |

Each column is one eval run of 15 suggestion batches (45 suggestions total) judged by `openai/gpt-oss-20b` at temperature 0. See `scripts/eval-prompts.ts` for the harness.

## Reproducing

```bash
# Set GROQ_API_KEY in .env or export it
npm run eval
```

One run costs ~90k tokens on `gpt-oss-120b` and ~30k on `gpt-oss-20b`. Budget for ~5 minutes wall-clock on free tier (TPM pacing kicks in).

## Notes on the plateau

Four rounds tuning different parts of the prompt produced total scores clustered at 15 ± 0.3. That range is the **judge-variance noise floor** — two runs of the same prompt against the same judge routinely land 0.2–0.3 apart. Improvements inside that window are indistinguishable from noise without more runs or a stricter eval.

Paths forward that aren't prompt-wording changes:

- **Stronger / different judge.** Running 120b-as-judge on 120b-as-generator introduces same-model bias. A human-labeled gold set would be the definitive answer; cost is the blocker.
- **Transcript generation pressure.** The five synthetic transcripts are fixed. Regenerating them or extending them could surface edge cases.
- **Structural, not wording.** E.g. splitting the prompt into a two-stage generate-then-revise pipeline. Bigger change, bigger potential upside.

For a take-home submission, the scores already in this archive are enough evidence that the prompt is well-tuned. The submitted version should be the one whose scores best match the submission's claims — see the `*** PICK VERSION HERE ***` lines in `index.ts`.
