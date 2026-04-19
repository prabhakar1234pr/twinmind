## TwinMind Prompt Evaluation Report
Prompt version: 2.2.0
Generated: 2026-04-18T21:43:26.367Z
Model: openai/gpt-oss-120b
Meta-judge: openai/gpt-oss-20b

### Summary Scores (avg across all transcripts and cycles)

| Criterion                | Avg score | / 3 |
| ------------------------ | --------- | --- |
| Specificity              |      2.80 | 3   |
| Actionability            |      2.33 | 3   |
| Preview quality          |      2.49 | 3   |
| Timing fit               |      2.82 | 3   |
| Meeting-type calibration |      2.49 | 3   |
| Variety (per batch)      |      2.20 | 3   |
| BATCH TOTAL              |     15.13 | 18  |

### Per-Meeting Results

#### Sales Call
Cycle 1 — batch total: **14.3 / 18**
  - [QUESTION_TO_ASK] "Ask how the Notion integration impacts total cost vs baseline pricing" → 15/15
  - [FACT_CHECK] "Verify: "fastest growing databases on GitHub — 70k stars" claim" → 10/15
  - [CLARIFYING_INFO] "Define "EU‑only deployment" for data residency compliance" → 9/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact check, clarification) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **14.0 / 18**
  - [QUESTION_TO_ASK] "Ask how Notion integration adds hidden fees versus baseline pricing" → 12/15
  - [DIRECT_ANSWER] "Provide EU‑hosted 50‑seat price estimate now" → 12/15
  - [TALKING_POINT] "Highlight GDPR‑compliant data residency in Frankfurt or Dublin" → 12/15
  - variety: 2/3 — The current batch uses different response types (question, direct answer, talking point) but shares the data‑residency theme with the previous batch, so it’s diverse but not fully distinct.
Cycle 3 — batch total: **14.3 / 18**
  - [QUESTION_TO_ASK] "Ask for EUR price of 50‑seat EU‑hosted plan" → 15/15
  - [FACT_CHECK] "Verify: "customers land between twelve and eighteen thousand annually" claim" → 14/15
  - [DIRECT_ANSWER] "Answer Notion integration cost comparison now" → 11/15
  - variety: 1/3 — Two of the three suggestions reuse the same types (QUESTION_TO_ASK and DIRECT_ANSWER) as the previous batch, with only one new type (FACT_CHECK).

#### Job Interview (Candidate speaking)
Cycle 1 — batch total: **16.7 / 18**
  - [DIRECT_ANSWER] "State your Kafka/WebSocket experience aligns with their real-time pipelines." → 14/15
  - [TALKING_POINT] "Highlight Redis cache cut read latency 40% for read‑heavy traffic." → 13/15
  - [QUESTION_TO_ASK] "Ask which real-time framework they use and its top scaling issue." → 14/15
  - variety: 3/3 — All three suggestions are distinct types (answer, talking point, question) and cover different themes.
Cycle 2 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask for the exact read‑latency reduction achieved with caching" → 15/15
  - [FACT_CHECK] "Verify the company's real‑time system stack mentioned in the role" → 14/15
  - [CLARIFYING_INFO] "Define 'real-time systems' to frame your scaling discussion" → 13/15
  - variety: 1/3 — The current batch includes a QUESTION_TO_ASK that repeats a type from the previous batch, and all suggestions focus on real‑time systems, so there is overlap and limited thematic diversity.
Cycle 3 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask which real-time messaging protocol they rely on for low‑latency streams" → 14/15
  - [FACT_CHECK] "Verify the specific real-time framework mentioned in the job description" → 12/15
  - [CLARIFYING_INFO] "Define 'read‑heavy traffic' to align your caching solution discussion" → 13/15
  - variety: 2/3 — All three suggestions are of different types, but they share similar themes around real‑time systems and caching, overlapping with the previous batch.

#### Technical Discussion (REST → GraphQL migration)
Cycle 1 — batch total: **16.3 / 18**
  - [QUESTION_TO_ASK] "Ask how migrating versus keeping REST will affect write latency" → 13/15
  - [FACT_CHECK] "Verify claim that GraphQL mutations cause most operational pain" → 13/15
  - [CLARIFYING_INFO] "Define schema stitching vs federation for the team" → 14/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact check, clarification) and cover different themes, with no overlap from a previous batch.
Cycle 2 — batch total: **15.7 / 18**
  - [QUESTION_TO_ASK] "Ask which schema approach meets our latency goals" → 13/15
  - [TALKING_POINT] "Highlight resolver‑level Redis cache reduces N+1 overhead" → 12/15
  - [DIRECT_ANSWER] "Answer: keep REST for writes, migrate reads to GraphQL" → 13/15
  - variety: 3/3 — All three suggestions are distinct types and cover new themes compared to the previous batch.
Cycle 3 — batch total: **15.3 / 18**
  - [QUESTION_TO_ASK] "Ask about DataLoader overhead on current load" → 14/15
  - [FACT_CHECK] "Verify p99 improvement figure of 12%" → 13/15
  - [CLARIFYING_INFO] "Define schema stitching vs federation for the team" → 13/15
  - variety: 2/3 — The current batch uses three distinct types (question, fact check, clarification) but shares a question type with the previous batch, so it’s diverse but not fully unique.

#### Salary Negotiation
Cycle 1 — batch total: **16.0 / 18**
  - [QUESTION_TO_ASK] "Ask the maximum signing bonus they can stretch beyond 15K" → 13/15
  - [TALKING_POINT] "Highlight equity vesting over four years to add value" → 13/15
  - [FACT_CHECK] "Verify: annual merit reviews actually occur in March" → 13/15
  - variety: 3/3 — All three suggestions are distinct types (question, talking point, fact check) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **13.0 / 18**
  - [QUESTION_TO_ASK] "Ask about moving to L4 for a higher base salary" → 11/15
  - [DIRECT_ANSWER] "Propose a 20K signing bonus to bridge base gap" → 13/15
  - [CLARIFYING_INFO] "Define equity vesting schedule to assess total pay" → 12/15
  - variety: 1/3 — The current batch shares the QUESTION_TO_ASK type with the previous batch, so there is overlap, but the other two suggestions are new types.
Cycle 3 — batch total: **15.3 / 18**
  - [QUESTION_TO_ASK] "Ask if equity percentage can be increased to offset base gap" → 13/15
  - [TALKING_POINT] "Highlight March merit reviews as a path to a 10% raise" → 12/15
  - [FACT_CHECK] "Verify: signing bonuses usually range 10‑15K at this company" → 15/15
  - variety: 2/3 — All three suggestions are different types, but they share the common theme of salary negotiation, so the variety is moderate.

#### Product Brainstorm (Onboarding AI)
Cycle 1 — batch total: **15.7 / 18**
  - [QUESTION_TO_ASK] "Ask which of the 14 workspace fields cause the most confusion" → 13/15
  - [FACT_CHECK] "Verify the workspace settings page actually has 14 fields" → 13/15
  - [CLARIFYING_INFO] "Define 'escape hatch' as a temporary workaround versus a permanent fix" → 12/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact check, clarification) and cover different themes, with no overlap with the previous batch.
Cycle 2 — batch total: **14.3 / 18**
  - [TALKING_POINT] "Propose grouping related fields on the workspace settings page to cut confusion" → 14/15
  - [DIRECT_ANSWER] "Answer: the friction is unclear fields on the workspace settings page" → 13/15
  - [QUESTION_TO_ASK] "Ask which fields can be merged to halve the form" → 13/15
  - variety: 1/3 — One suggestion type repeats the previous batch, but the others are distinct.
Cycle 3 — batch total: **16.0 / 18**
  - [QUESTION_TO_ASK] "Ask which of the 14 workspace fields are most unclear" → 13/15
  - [FACT_CHECK] "Verify that halving the form reduces the 60% drop‑off" → 13/15
  - [TALKING_POINT] "Propose a progressive‑disclosure wizard to hide unclear fields" → 13/15
  - variety: 3/3 — All three current suggestions are distinct from each other and from the previous batch, covering new questions, validation, and a new UI approach.

### Weakest Suggestions (per-suggestion score < 10 / 15)

- Sales Call / Cycle 1 — [CLARIFYING_INFO] 9/15
  Preview: Define "EU‑only deployment" for data residency compliance
  - Specificity: 3/3 — The suggestion directly quotes the transcript’s mention of EU‑only deployment and proposes a follow‑up question that is specifically tied to that statement.
  - Actionability: 2/3 — The suggestion clearly instructs the user to ask a specific question about backups and disaster‑recovery copies within the EU region.
  - Preview quality: 1/3 — The preview hints at a useful clarification but is too vague to be immediately actionable without further context.
  - Timing fit: 1/3 — The suggestion is loosely related to the conversation but does not directly address the prospect’s most recent question about pricing and Notion integration.
  - Meeting-type calibration: 2/3 — The suggestion to clarify backup location is a relevant clarifying question that fits the prospect’s data residency concern.

### AI Summary — Scores

| Criterion | Avg | / 3 |
| --------- | --- | --- |
| Coverage | 2.40 | 3 |
| Grounding | 3.00 | 3 |
| Structure | 3.00 | 3 |
| Action-item accuracy | 2.40 | 3 |
| **TOTAL** | **10.80** | **12** |

#### Per-transcript summary results

##### Sales Call — 10/12
- **Coverage**: 2/3 — The summary covers most key points but omits the prospect’s specific question about Notion integration and the exact six‑week timeline.
- **Grounding**: 3/3 — All facts are directly supported by the transcript with no hallucinations.
- **Structure**: 3/3 — All three sections are present and concise, meeting the requested format.
- **Action-item accuracy**: 2/3 — The summary correctly lists the Rep’s promise to send pricing details, but it omits any due date, so the action item is accurate but incomplete.

```markdown
## Overview
The prospect is evaluating three vendors and needs a decision on data sovereignty and pricing before the end of **"Q3"**, with the Rep promising to send EU‑hosted pricing details.

## Key Points
- The prospect is evaluating three vendors, including **"Notion"**, **"Airtable"**, and the Rep’s company.  
- Their biggest concern is **"data sovereignty"**, with the **"CEO"** demanding all data be stored in **"EU"** regions.  
- The budget decision must be finalized before the end of **"Q3"**, roughly six weeks away.  
- The Rep highlighted the product’s popularity on GitHub (**"70k stars"**) and confirmed support for **"EU‑only deployment"**, offering data residency in **"Frankfurt"** or **"Dublin"**.  
- The prospect asked for pricing for a **"50‑seat workspace with EU hosting"**, noting the current pricing page only shows USD.  
- The Rep estimated most customers in the prospect’s range spend between **"twelve and eighteen thousand annually"** and will send exact numbers.

## Action Items
- **Rep** — send pricing details for a **"50‑seat workspace with EU hosting"** — no due date mentioned.
```

##### Job Interview (Candidate speaking) — 11/12
- **Coverage**: 2/3 — The summary captures the main topics but omits some details and the interviewer’s probing questions.
- **Grounding**: 3/3 — All facts in the summary directly trace to the transcript with no fabrication.
- **Structure**: 3/3 — All required sections are present and the summary is concise and well-scoped.
- **Action-item accuracy**: 3/3 — The summary correctly states 'None identified' as there are no action items in the transcript.

```markdown
## Overview
The interview covered the candidate’s background as a backend engineer and their interest in the role’s focus on real‑time systems.

## Key Points
- The candidate has “been a backend engineer for about seven years, mostly Python and Go, lots of distributed systems work at my last two companies.”  
- When asked about a recent technical challenge, the candidate cited “scaling issues” that the team resolved.  
- The scaling problem involved “read‑heavy traffic, and we added some caching,” though the candidate “don’t remember the exact numbers.”  
- The candidate expressed interest in the role because “I saw you're doing a lot with real‑time systems and that's something I want to go deeper on.”  

## Action Items
- None identified.
```

##### Technical Discussion (REST → GraphQL migration) — 10/12
- **Coverage**: 3/3 — The summary accurately captures all key topics, decisions, and insights from the transcript.
- **Grounding**: 3/3 — All facts, names, numbers, and decisions are directly traceable to the transcript.
- **Structure**: 3/3 — All requested sections are present and concise.
- **Action-item accuracy**: 1/3 — The summary lists an action item about evaluating schema stitching vs federation, but the transcript does not assign an owner or due date, making it a vague next step.

```markdown
## Overview
The team reviewed the month‑long GraphQL pilot results and decided to **keep REST for write operations** while continuing to evaluate GraphQL for reads.

## Key Points
- The GraphQL pilot achieved **“40% latency improvement”** on search endpoints (p50).  
- **“p99 was only 12% better”**, which was lower than expected.  
- The team mitigated N+1 queries by using **DataLoader** and caching at the resolver level with **Redis**.  
- The core question was whether to **migrate everything or keep REST for the write paths**.  
- **Jon** recommended **keeping REST for writes**, noting that **“GraphQL mutations are where most of the operational pain comes from.”**  
- **Alex** agreed and added that the team must consider **schema stitching vs federation** before committing further.

## Action Items
- Alex — assess **schema stitching vs federation** before committing to a full migration — (no due date mentioned)
```

##### Salary Negotiation — 12/12
- **Coverage**: 3/3 — The summary accurately captures all key topics, decisions, and insights from the transcript.
- **Grounding**: 3/3 — All quoted facts match the transcript exactly.
- **Structure**: 3/3 — All required sections are present and the summary is concise and well-scoped.
- **Action-item accuracy**: 3/3 — The summary correctly states 'None identified' as no action items were mentioned in the transcript.

```markdown
## Overview
The meeting was a salary negotiation where HR confirmed the base salary cap of **"130K"** and discussed possible signing bonus flexibility.

## Key Points
- HR asked the candidate’s salary expectations, and the candidate replied they were thinking around **"150K base"**.  
- HR stated the band for this level tops out at **"130K"**.  
- HR explained the role is **"L3"** within **"5 levels"**, and that **"L4 starts at 140"** but requires a more senior scope.  
- The candidate inquired about flexibility on equity or signing bonus if the base is fixed.  
- HR said equity is generally fixed per level and that signing bonuses can sometimes be negotiated, usually **"10-15K"**.  
- HR mentioned annual merit reviews occur in **"March"**, providing a path for growth inside the band.

## Action Items
- None identified.
```

##### Product Brainstorm (Onboarding AI) — 11/12
- **Coverage**: 2/3 — The summary captures the main topics and insights but omits some details and lacks a clear decision or action items.
- **Grounding**: 3/3 — All quoted facts and details match the transcript exactly, with no fabrication.
- **Structure**: 3/3 — All required sections are present and concise.
- **Action-item accuracy**: 3/3 — The summary correctly states that no action items were identified, matching the transcript.

```markdown
## Overview
The team brainstormed ways to reduce the high onboarding drop‑off, noting that “Current drop‑off is 60% at step 3,” and identified the main friction point but did not reach a final decision.

## Key Points
- The onboarding funnel loses “60% at step 3.”  
- Mia suggested adding “AI” as an assistant that “just talks you through it.”  
- Devon warned that a chat bot might feel like “an escape hatch, not a fix.”  
- The specific friction is the “workspace settings” page, which has “14 fields and half of them are unclear.”  
- Mia proposed that the solution might be to “cut the form in half” rather than rely on AI.  

## Action Items
- None identified.
```

### Recommendations
- Overall score is strong (15.13 / 18). No urgent changes indicated.
