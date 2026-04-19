## TwinMind Prompt Evaluation Report
Prompt version: 2.1.0
Generated: 2026-04-18T20:45:37.140Z
Model: openai/gpt-oss-120b
Meta-judge: openai/gpt-oss-20b

### Summary Scores (avg across all transcripts and cycles)

| Criterion                | Avg score | / 3 |
| ------------------------ | --------- | --- |
| Specificity              |      2.84 | 3   |
| Actionability            |      2.29 | 3   |
| Preview quality          |      2.53 | 3   |
| Timing fit               |      2.78 | 3   |
| Meeting-type calibration |      2.53 | 3   |
| Variety (per batch)      |      2.27 | 3   |
| BATCH TOTAL              |     15.24 | 18  |

### Per-Meeting Results

#### Sales Call
Cycle 1 — batch total: **17.0 / 18**
  - [QUESTION_TO_ASK] "Ask exact EU‑hosting price for 50 seats" → 14/15
  - [FACT_CHECK] "Verify 70k‑star GitHub claim" → 13/15
  - [TALKING_POINT] "Highlight Notion integration ROI" → 15/15
  - variety: 3/3 — All three suggestions are distinct in type and theme, with no overlap with a previous batch.
Cycle 2 — batch total: **13.3 / 18**
  - [DIRECT_ANSWER] "State EU‑hosted 50‑seat price: €13,500 annually" → 12/15
  - [QUESTION_TO_ASK] "Ask which Notion workflows they rely on for integration comparison" → 14/15
  - [CLARIFYING_INFO] "Define EU‑only deployment: data stays in Frankfurt or Dublin" → 11/15
  - variety: 1/3 — One suggestion type repeats across batches (QUESTION_TO_ASK), so there is some overlap.
Cycle 3 — batch total: **14.0 / 18**
  - [QUESTION_TO_ASK] "Ask for Notion integration cost comparison" → 13/15
  - [FACT_CHECK] "Verify 12‑18k annual price range claim" → 13/15
  - [CLARIFYING_INFO] "Define what "Notion integration story" entails" → 13/15
  - variety: 1/3 — Two suggestions repeat types from the previous batch, so the variety is limited.

#### Job Interview (Candidate speaking)
Cycle 1 — batch total: **16.3 / 18**
  - [DIRECT_ANSWER] "Answer with concrete real-time impact you delivered" → 12/15
  - [TALKING_POINT] "Highlight caching results that cut latency dramatically" → 15/15
  - [QUESTION_TO_ASK] "Ask which real-time features are top priority" → 13/15
  - variety: 3/3 — All three suggestions are distinct types (answer, talking point, question) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **16.7 / 18**
  - [QUESTION_TO_ASK] "Ask which real-time components they build and key challenges" → 14/15
  - [FACT_CHECK] "Verify the peak read‑heavy traffic volume they handled" → 15/15
  - [CLARIFYING_INFO] "Define read‑heavy traffic and caching relevance" → 12/15
  - variety: 3/3 — All three current suggestions are distinct types and differ from the previous batch.
Cycle 3 — batch total: **14.7 / 18**
  - [DIRECT_ANSWER] "State a concrete caching result you achieved" → 14/15
  - [QUESTION_TO_ASK] "Ask about the real-time systems they build" → 14/15
  - [CLARIFYING_INFO] "Define what 'real-time systems' means here" → 13/15
  - variety: 1/3 — Two of the three suggestions repeat types from the previous batch, so there is overlap.

#### Technical Discussion (REST → GraphQL migration)
Cycle 1 — batch total: **15.7 / 18**
  - [QUESTION_TO_ASK] "Ask which mutation patterns cause the most operational pain" → 12/15
  - [FACT_CHECK] "Verify: p99 latency only 12% better than p50" → 14/15
  - [CLARIFYING_INFO] "Define schema stitching versus federation for the team" → 12/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact check, clarification) and cover different themes, with no overlap from a previous batch.
Cycle 2 — batch total: **16.3 / 18**
  - [QUESTION_TO_ASK] "Ask impact on deployment velocity if writes move to GraphQL" → 13/15
  - [TALKING_POINT] "Add point: federation reduces coupling and fits microservice roadmap" → 14/15
  - [DIRECT_ANSWER] "Answer: federation better for multi‑team versioning and lower overhead" → 13/15
  - variety: 3/3 — All three suggestions are distinct types (question, talking point, direct answer) and cover different themes, with no repetition from the previous batch.
Cycle 3 — batch total: **14.3 / 18**
  - [QUESTION_TO_ASK] "Ask how caching strategy impacts p99 latency" → 13/15
  - [FACT_CHECK] "Verify: DataLoader overhead on mutation load" → 11/15
  - [CLARIFYING_INFO] "Define schema stitching vs federation trade‑offs for writes" → 10/15
  - variety: 3/3 — All three suggestions are distinct types and themes, none repeat previous batch items.

#### Salary Negotiation
Cycle 1 — batch total: **16.0 / 18**
  - [QUESTION_TO_ASK] "Ask if higher equity can be granted for L3 given market rates" → 13/15
  - [TALKING_POINT] "Highlight March merit review as leverage for future raise" → 14/15
  - [DIRECT_ANSWER] "Propose a $20K signing bonus to close the gap" → 12/15
  - variety: 3/3 — All three suggestions are distinct in type and theme, with no overlap with a previous batch.
Cycle 2 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask if moving to L4 is possible to raise base salary" → 13/15
  - [FACT_CHECK] "Verify: "Equity is generally fixed per level" claim" → 13/15
  - [CLARIFYING_INFO] "Define the band structure and L3 vs L4 levels" → 10/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact-check, clarification) and cover different themes (role level, equity, band structure).
Cycle 3 — batch total: **12.3 / 18**
  - [QUESTION_TO_ASK] "Ask if a higher signing bonus can bridge the salary gap" → 15/15
  - [FACT_CHECK] "Verify: "L4 starts at 140 but requires more senior scope" claim" → 11/15
  - [CLARIFYING_INFO] "Define "band structure" and its impact on growth" → 8/15
  - variety: 1/3 — All three current suggestions use the same types as the previous batch, so there is overlap.

#### Product Brainstorm (Onboarding AI)
Cycle 1 — batch total: **17.0 / 18**
  - [QUESTION_TO_ASK] "Ask which fields cause the most confusion" → 14/15
  - [TALKING_POINT] "Suggest grouping fields to halve the form" → 14/15
  - [FACT_CHECK] "Verify the exact number of fields on the page" → 14/15
  - variety: 3/3 — All three suggestions are distinct in type (question, talking point, fact check) and cover different aspects of the issue, providing diverse approaches.
Cycle 2 — batch total: **15.3 / 18**
  - [QUESTION_TO_ASK] "Ask which fields are most unclear on the workspace settings page" → 14/15
  - [DIRECT_ANSWER] "Propose a reduced‑field prototype to test the half‑form idea" → 15/15
  - [CLARIFYING_INFO] "Define "escape hatch" as used for chat‑bot concerns" → 11/15
  - variety: 2/3 — All three current suggestions are different types, but they share similar themes with the previous batch.
Cycle 3 — batch total: **14.7 / 18**
  - [QUESTION_TO_ASK] "Ask which specific fields cause the highest drop‑off" → 15/15
  - [TALKING_POINT] "Highlight reducing field count to improve completion rates" → 13/15
  - [FACT_CHECK] "Verify the 60% drop‑off statistic at step 3" → 13/15
  - variety: 1/3 — The current batch shares a question type with the previous batch, so there is overlap, but the other two items differ in type and theme.

### Weakest Suggestions (per-suggestion score < 10 / 15)

- Salary Negotiation / Cycle 3 — [CLARIFYING_INFO] 8/15
  Preview: Define "band structure" and its impact on growth
  - Specificity: 3/3 — The suggestion directly quotes the transcript phrase “We also do annual merit reviews in March, so there's a path for growth inside the band.”
  - Actionability: 0/3 — The suggestion only provides explanatory context, not an actionable step the user can take within 30 seconds.
  - Preview quality: 2/3 — The preview clearly explains the concept and its relevance, providing useful context without needing to click further.
  - Timing fit: 1/3 — The suggestion loosely connects to the discussion about band structure and growth, but it does not directly address the most recent exchange about equity and signing bonuses.
  - Meeting-type calibration: 2/3 — The suggestion to clarify band structure is relevant and appropriate for a salary negotiation context.

### Recommendations
- Overall score is strong (15.24 / 18). No urgent changes indicated.
