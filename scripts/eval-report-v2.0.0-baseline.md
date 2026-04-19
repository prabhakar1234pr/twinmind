## TwinMind Prompt Evaluation Report

Prompt version: 2.0.0
Generated: 2026-04-18T20:22:11.547Z
Model: openai/gpt-oss-120b
Meta-judge: openai/gpt-oss-20b

### Summary Scores (avg across all transcripts and cycles)


| Criterion                | Avg score | / 3 |
| ------------------------ | --------- | --- |
| Specificity              | 2.78      | 3   |
| Actionability            | 2.50      | 3   |
| Preview quality          | 2.42      | 3   |
| Timing fit               | 2.78      | 3   |
| Meeting-type calibration | 2.42      | 3   |
| Variety (per batch)      | 2.17      | 3   |
| BATCH TOTAL              | 15.05     | 18  |


### Per-Meeting Results

#### Sales Call

Cycle 1 — batch total: **16.7 / 18**

- [QUESTION_TO_ASK] "Ask how Notion integration impacts total cost and workflow" → 14/15
- [FACT_CHECK] "Verify: "fastest growing databases on GitHub — 70k stars"" → 12/15
- [TALKING_POINT] "Highlight total annual cost in EUR with EU hosting" → 15/15
- variety: 3/3 — All three suggestions are distinct in type and theme, and none overlap with the previous batch.
Cycle 2 — batch total: **14.3 / 18**
- [DIRECT_ANSWER] "Provide exact EUR pricing for 50 seats EU hosting" → 12/15
- [CLARIFYING_INFO] "Define your Notion integration capabilities" → 12/15
- [QUESTION_TO_ASK] "Ask about expected data sync frequency with Notion" → 10/15
- variety: 3/3 — All three current suggestions are distinct types (direct answer, clarifying info, question) and cover different themes (pricing, integration depth, sync frequency) compared to the previous batch.
Cycle 3 — batch total: **14.0 / 18**
- [QUESTION_TO_ASK] "Ask which Notion features are essential for your team" → 13/15
- [FACT_CHECK] "Verify the annual cost range claim for similar customers" → 13/15
- [CLARIFYING_INFO] "Define what "Notion integration story" entails" → 13/15
- variety: 1/3 — Some overlap with previous batch (QUESTION_TO_ASK and CLARIFYING_INFO) but includes a new FACT_CHECK type.

#### Job Interview (Candidate speaking)

Cycle 1 — batch total: **16.3 / 18**

- [DIRECT_ANSWER] "State concrete scaling numbers and cache impact" → 13/15
- [TALKING_POINT] "Highlight real‑time project success" → 14/15
- [QUESTION_TO_ASK] "Ask about their current real‑time challenges" → 13/15
- variety: 3/3 — All three suggestions are distinct types and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **15.0 / 18**
- [FACT_CHECK] "Verify claim: ‘doing a lot with real-time systems’" → 14/15
- [CLARIFYING_INFO] "Define ‘read‑heavy traffic’ for context" → 13/15
- [QUESTION_TO_ASK] "Ask about caching performance metrics" → 15/15
- variety: 1/3 — One suggestion (QUESTION_TO_ASK) repeats a type from the previous batch, so the variety is not fully distinct.
Cycle 3 — batch total: **14.7 / 18**
- [DIRECT_ANSWER] "Answer: Highlight desire for low‑latency real‑time pipeline design" → 14/15
- [QUESTION_TO_ASK] "Ask: What critical real‑time challenge are you tackling now?" → 14/15
- [CLARIFYING_INFO] "Clarify: Define 'real‑time systems' as sub‑second streaming processing" → 13/15
- variety: 1/3 — Two suggestions overlap with the previous batch, so there is some repetition.

#### Technical Discussion (REST → GraphQL migration)

Cycle 1 — batch total: **15.0 / 18**

- [QUESTION_TO_ASK] "Ask criteria for choosing schema stitching vs federation" → 12/15
- [FACT_CHECK] "Verify claim that GraphQL mutations cause most operational pain" → 13/15
- [CLARIFYING_INFO] "Define schema stitching versus federation" → 11/15
- variety: 3/3 — All three suggestions are distinct types (question, fact check, clarification) and cover different aspects of the discussion, with no overlap with a previous batch.
Cycle 2 — batch total: **13.3 / 18**
- [TALKING_POINT] "Highlight why REST writes reduce operational pain" → 11/15
- [QUESTION_TO_ASK] "Ask about Redis cache hit rate affecting latency gains" → 12/15
- [DIRECT_ANSWER] "Recommend hybrid migration: GraphQL for reads, REST for writes" → 14/15
- variety: 1/3 — One suggestion type repeats across batches (QUESTION_TO_ASK).
Cycle 3 — batch total: **15.7 / 18**
- [QUESTION_TO_ASK] "Ask which mutation issues are causing the most pain" → 13/15
- [TALKING_POINT] "Highlight federation’s advantage over stitching for team autonomy" → 13/15
- [DIRECT_ANSWER] "Recommend federation as the better fit for our microservices" → 12/15
- variety: 3/3 — All three current suggestions are distinct from each other and from the previous batch, covering different question, talking point, and direct answer themes.

#### Salary Negotiation

Cycle 1 — batch total: **16.3 / 18**

- [QUESTION_TO_ASK] "Ask about typical raise percentage in the March merit review" → 13/15
- [TALKING_POINT] "Cite market equity benchmarks for L3 positions" → 14/15
- [FACT_CHECK] "Verify the 10‑15K signing bonus range" → 13/15
- variety: 3/3 — All three suggestions are distinct types (question, talking point, fact check) and cover different themes, with no overlap from a previous batch.
Cycle 2 — batch total: **15.3 / 18**
- [DIRECT_ANSWER] "Offer signing bonus and extra equity to bridge base gap" → 14/15
- [CLARIFYING_INFO] "Define what “more senior scope” entails for L4" → 11/15
- [QUESTION_TO_ASK] "Ask about mid‑year raise mechanisms before March review" → 12/15
- variety: 3/3 — All three current suggestions are distinct types (direct answer, clarifying info, question) and cover different themes, with no overlap with the previous batch.
Cycle 3 — batch total: **14.0 / 18**
- [QUESTION_TO_ASK] "Ask if a higher title can unlock a larger base salary" → 13/15
- [TALKING_POINT] "Highlight your L4‑level achievements to justify a higher band" → 13/15
- [FACT_CHECK] "Verify the March merit‑review schedule claim" → 13/15
- variety: 1/3 — One suggestion type repeats from the previous batch, so the variety is limited.

### Weakest Suggestions (per-suggestion score < 10 / 15)

None — every suggestion scored ≥ 10. 🎯

### Recommendations

- Overall score is strong (15.05 / 18). No urgent changes indicated.

