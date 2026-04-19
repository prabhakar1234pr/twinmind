## TwinMind Prompt Evaluation Report
Prompt version: 2.3.0
Generated: 2026-04-18T22:52:49.773Z
Model: openai/gpt-oss-120b
Meta-judge: openai/gpt-oss-20b

### Summary Scores (avg across all transcripts and cycles)

| Criterion                | Avg score | / 3 |
| ------------------------ | --------- | --- |
| Specificity              |      2.91 | 3   |
| Actionability            |      2.27 | 3   |
| Preview quality          |      2.49 | 3   |
| Timing fit               |      2.64 | 3   |
| Meeting-type calibration |      2.47 | 3   |
| Variety (per batch)      |      2.20 | 3   |
| BATCH TOTAL              |     14.98 | 18  |

### Per-Meeting Results

#### Sales Call
Cycle 1 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask for a detailed EU‑hosting price breakdown per seat" → 14/15
  - [FACT_CHECK] "Verify the claim of 70k GitHub stars" → 11/15
  - [TALKING_POINT] "Highlight real‑time two‑way Notion integration" → 11/15
  - variety: 3/3 — All three suggestions are distinct types (question, fact check, talking point) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **13.0 / 18**
  - [DIRECT_ANSWER] "Answer pricing comparison: add $2‑3k for Notion integration, total $14‑21k" → 14/15
  - [CLARIFYING_INFO] "Define EU‑only deployment — data stays in Frankfurt or Dublin for compliance" → 11/15
  - [QUESTION_TO_ASK] "Ask exact contract signing date for end‑of‑Q3 deadline" → 11/15
  - variety: 1/3 — One suggestion (QUESTION_TO_ASK) repeats across batches, so the variety is limited.
Cycle 3 — batch total: **13.0 / 18**
  - [QUESTION_TO_ASK] "Ask for the exact annual cost for 50 seats with EU hosting" → 12/15
  - [FACT_CHECK] "Verify the range "twelve to eighteen thousand annually" for similar customers" → 11/15
  - [CLARIFYING_INFO] "Define what "Notion integration story" entails for them" → 13/15
  - variety: 1/3 — The current batch repeats the same suggestion types (QUESTION_TO_ASK and CLARIFYING_INFO) found in the previous batch, so the variety is limited.

#### Job Interview (Candidate speaking)
Cycle 1 — batch total: **15.7 / 18**
  - [DIRECT_ANSWER] "State exact traffic volume and latency gain from caching" → 12/15
  - [TALKING_POINT] "Highlight your WebSocket real‑time pipeline experience" → 15/15
  - [QUESTION_TO_ASK] "Ask which cache layer and eviction policy they use" → 11/15
  - variety: 3/3 — All three suggestions are distinct types (answer, talking point, question) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **16.0 / 18**
  - [QUESTION_TO_ASK] "Ask which real-time tech stack they rely on for low-latency updates" → 15/15
  - [FACT_CHECK] "Verify the caching layer they added for read-heavy traffic" → 12/15
  - [CLARIFYING_INFO] "Define 'read-heavy traffic' and its impact on system design" → 12/15
  - variety: 3/3 — All three current suggestions are distinct types and cover different themes, unlike the previous batch.
Cycle 3 — batch total: **15.7 / 18**
  - [QUESTION_TO_ASK] "Ask which real‑time technologies they use for low‑latency processing" → 15/15
  - [TALKING_POINT] "Highlight your event‑driven pipeline experience with Kafka and WebSockets" → 14/15
  - [FACT_CHECK] "Verify the scale of their real‑time system handling concurrent connections" → 12/15
  - variety: 2/3 — All three suggestions are different types, but the themes overlap with the previous batch (real‑time focus and fact‑checking).

#### Technical Discussion (REST → GraphQL migration)
Cycle 1 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask about latency differences between schema stitching and federation" → 12/15
  - [TALKING_POINT] "Emphasize keeping REST for write operations" → 13/15
  - [FACT_CHECK] "Verify GraphQL mutations are the main source of operational pain" → 11/15
  - variety: 3/3 — All three suggestions are distinct types (question, talking point, fact check) and cover different themes, with no overlap from a previous batch.
Cycle 2 — batch total: **15.0 / 18**
  - [QUESTION_TO_ASK] "Ask: what latency trade‑offs does schema stitching have vs federation?" → 12/15
  - [DIRECT_ANSWER] "State: we’ll keep REST for writes while moving reads to GraphQL." → 13/15
  - [CLARIFYING_INFO] "Define schema stitching — it merges multiple GraphQL services into one gateway." → 14/15
  - variety: 2/3 — The current batch uses different response types (question, direct answer, clarifying info) but shares similar themes with the previous batch, such as latency trade‑offs and REST write strategy.
Cycle 3 — batch total: **14.0 / 18**
  - [QUESTION_TO_ASK] "Ask: what was the p99 latency improvement with caching?" → 12/15
  - [FACT_CHECK] "Verify: DataLoader adds measurable overhead" → 12/15
  - [CLARIFYING_INFO] "Define schema stitching vs federation for latency impact" → 12/15
  - variety: 2/3 — The three suggestions are of different types (question, fact check, clarification) but share similar themes with the previous batch, so they are not fully diverse.

#### Salary Negotiation
Cycle 1 — batch total: **16.3 / 18**
  - [QUESTION_TO_ASK] "Ask if extra equity or performance grants can offset the base cap" → 13/15
  - [TALKING_POINT] "Cite market data: comparable L3 roles pay $140K median" → 12/15
  - [DIRECT_ANSWER] "Offer a concrete signing bonus request of $15K" → 15/15
  - variety: 3/3 — All three suggestions are distinct in type and theme, with no overlap from a previous batch.
Cycle 2 — batch total: **14.7 / 18**
  - [FACT_CHECK] "Verify signing‑bonus range claim of 10‑15K" → 14/15
  - [CLARIFYING_INFO] "Define band levels L3 and L4 salary caps" → 13/15
  - [QUESTION_TO_ASK] "Ask about increasing equity to offset base limit" → 14/15
  - variety: 1/3 — One type (QUESTION_TO_ASK) repeats, but the other two are new types.
Cycle 3 — batch total: **16.0 / 18**
  - [QUESTION_TO_ASK] "Ask if a higher signing bonus can bridge the $20K base gap" → 15/15
  - [FACT_CHECK] "Verify HR's claim that L4 starts at $140K" → 14/15
  - [CLARIFYING_INFO] "Define what “annual merit reviews in March” entail" → 13/15
  - variety: 2/3 — All three suggestions use the same categories as the previous batch but with different content, so they are different from each other but not diverse in type.

#### Product Brainstorm (Onboarding AI)
Cycle 1 — batch total: **17.0 / 18**
  - [QUESTION_TO_ASK] "Ask which of the 14 workspace fields cause the most confusion" → 15/15
  - [TALKING_POINT] "Propose cutting the form to seven fields with progressive disclosure" → 14/15
  - [FACT_CHECK] "Verify the claim that the workspace settings page has exactly 14 fields" → 13/15
  - variety: 3/3 — All three suggestions are distinct types (question, talking point, fact check) and cover different themes, with no overlap with a previous batch.
Cycle 2 — batch total: **15.0 / 18**
  - [DIRECT_ANSWER] "Answer: the friction is the 14‑field workspace settings page" → 13/15
  - [CLARIFYING_INFO] "Define "escape hatch" — a quick workaround that sidesteps core issues" → 9/15
  - [QUESTION_TO_ASK] "Ask which of the 14 fields are essential to keep" → 14/15
  - variety: 3/3 — All three current suggestions are distinct types (direct answer, clarifying info, question) and cover different themes, unlike the previous batch.
Cycle 3 — batch total: **13.3 / 18**
  - [QUESTION_TO_ASK] "Ask which of the 14 workspace fields are most unclear" → 13/15
  - [TALKING_POINT] "Suggest progressive disclosure to split the 14 fields" → 13/15
  - [CLARIFYING_INFO] "Define progressive disclosure — shows only essential fields first" → 11/15
  - variety: 1/3 — The current batch contains a question, a talking point, and a clarifying info, but it repeats the question and clarifying info types from the previous batch, so the variety is limited.

### Weakest Suggestions (per-suggestion score < 10 / 15)

- Product Brainstorm (Onboarding AI) / Cycle 2 — [CLARIFYING_INFO] 9/15
  Preview: Define "escape hatch" — a quick workaround that sidesteps core issues
  - Specificity: 3/3 — The suggestion directly quotes the phrase “escape hatch” from the transcript and explains it, making it clearly triggered by the specific words.
  - Actionability: 0/3 — The suggestion only defines a term and does not provide any actionable steps for the user to take.
  - Preview quality: 2/3 — The preview clearly defines the term and explains its relevance, providing useful context without needing to click further.
  - Timing fit: 1/3 — The suggestion clarifies a term used earlier, but it does not directly address the latest discussion about the workspace settings friction.
  - Meeting-type calibration: 3/3 — The suggestion to clarify the term ‘escape hatch’ directly addresses a potential misunderstanding in the discussion, making it an optimal clarifying action for this meeting.

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
- **Coverage**: 1/3 — The summary misses the prospect’s question about Notion integration and the lack of a due date for the pricing request.
- **Grounding**: 3/3 — All quoted facts match the transcript exactly.
- **Structure**: 3/3 — All requested sections are present and concise.
- **Action-item accuracy**: 3/3 — The summary correctly lists the rep’s concrete next step to send pricing details, matching the transcript and naming the owner.

```markdown
## Overview
The prospect is evaluating three vendors—including Notion, Airtable, and the rep’s company—and discussed data‑sovereignty requirements, budget timing, EU hosting options, and pricing for a 50‑seat workspace.

## Key Points
- The prospect is “evaluating three vendors right now, including **Notion** and **Airtable**, and you're the third.”  
- Their “biggest concern is honestly data sovereignty — our CEO flagged it last week, she wants everything in **EU regions**.”  
- The budget decision must be finalized “before **end of Q3**, so roughly six weeks from now.”  
- The rep confirmed “EU-only deployment, all your data stays in **Frankfurt** or **Dublin** — your choice.”  
- The prospect asked for pricing “for a **50-seat workspace with EU hosting**,” noting the current page only shows USD.  
- The rep said most similar customers “land somewhere between **twelve and eighteen thousand annually**.”

## Action Items
- **Rep** — send pricing details for a 50-seat EU‑hosted workspace — (no due date mentioned)
```

##### Job Interview (Candidate speaking) — 11/12
- **Coverage**: 2/3 — The summary captures the main topics and key points but omits some interviewer probes and lacks detail on decision-making.
- **Grounding**: 3/3 — All quoted statements and facts directly trace back to the transcript with no fabrication.
- **Structure**: 3/3 — All required sections are present and the summary is concise and well-scoped.
- **Action-item accuracy**: 3/3 — The summary correctly states 'None identified' as there are no action items in the transcript.

```markdown
## Overview
The interview covered the candidate’s background as a backend engineer and their interest in the role’s focus on real‑time systems; no hiring decision was made.

## Key Points
- The candidate said, **"I've been a backend engineer for about seven years, mostly Python and Go, lots of distributed systems work at my last two companies."**  
- When asked about a recent technical challenge, the candidate mentioned, **"scaling issues."**  
- The scaling problem involved **"read-heavy traffic, and we added some caching. I don't remember the exact numbers."**  
- The candidate expressed interest in the role because, **"I saw you're doing a lot with real-time systems and that's something I want to go deeper on."**  
- The interviewer probed for specifics on the scaling issue but the candidate could not provide exact metrics.  

## Action Items
- None identified.
```

##### Technical Discussion (REST → GraphQL migration) — 9/12
- **Coverage**: 3/3 — The summary accurately captures all key topics, decisions, and insights from the transcript.
- **Grounding**: 3/3 — All facts and decisions are directly traceable to the transcript.
- **Structure**: 3/3 — All requested sections are present and clearly scoped.
- **Action-item accuracy**: 0/3 — The summary invents an action item not present in the transcript.

```markdown
## Overview
The team reviewed the month‑long GraphQL pilot, noting a **40% latency improvement** for p50 but only **12% better** for p99, and decided to **keep REST for write operations** while further evaluating schema stitching versus federation.

## Key Points
- **Alex** reported that the GraphQL pilot on search endpoints delivered **“40% latency improvement.”**  
- **Priya** asked whether the improvement was **p50 or p99**, and **Alex** clarified it was **p50**, with **p99 only 12% better**.  
- **Jon** raised the **N+1 query risk**, noting that **DataLoader helps but it's not free**.  
- **Alex** confirmed they used **DataLoader** and are **caching at the resolver level with Redis**.  
- **Priya** questioned whether to **migrate everything or keep REST for the write paths**.  
- **Jon** and **Alex** agreed to **keep REST for writes**, citing operational pain with GraphQL mutations.  
- The group acknowledged they need to **consider schema stitching vs federation before committing**.

## Action Items
- **Alex — evaluate schema stitching vs federation — (no due date mentioned)**.
```

##### Salary Negotiation — 12/12
- **Coverage**: 3/3 — The summary accurately captures all main topics, decisions, and insights from the transcript.
- **Grounding**: 3/3 — All facts and figures match the transcript exactly.
- **Structure**: 3/3 — All required sections are present and the summary is concise and well-scoped.
- **Action-item accuracy**: 3/3 — The summary correctly states 'None identified' as no action items were mentioned in the transcript.

```markdown
## Overview
The meeting was a salary negotiation where HR clarified the compensation limits and possible bonuses for the role.

## Key Points
- HR stated the offer is moving forward but asked the candidate’s expected range, to which the candidate replied “150K base”.  
- HR explained the band tops out at “130K” for this level.  
- HR described the band structure: the company has “5 levels”, and this role is “L3”, while “L4 starts at 140” but requires a more senior scope.  
- The candidate asked about flexibility on equity or signing, and HR said equity is fixed per level and signing bonuses can be “10-15K”.  
- HR mentioned annual merit reviews occur in “March”, providing a path for growth within the band.  

## Action Items
- None identified.
```

##### Product Brainstorm (Onboarding AI) — 12/12
- **Coverage**: 3/3 — The summary accurately captures all key topics, decisions, and insights from the transcript.
- **Grounding**: 3/3 — All facts and names are directly traceable to the transcript with no fabrication.
- **Structure**: 3/3 — All required sections are present and the summary is concise and well-scoped.
- **Action-item accuracy**: 3/3 — The summary correctly states that no action items were identified, matching the transcript.

```markdown
## Overview
The team brainstormed ways to reduce the high onboarding drop‑off (60% at step 3), identifying the main friction point as the “workspace settings” page with 14 fields, many of which are unclear.

## Key Points
- Current onboarding drop‑off is **60% at step 3**.  
- Mia suggested adding **AI** to the onboarding flow as a chat‑assistant.  
- Devon cautioned that a chatbot might be an “escape hatch” and recommended fixing the underlying friction first.  
- Sam asked what the specific friction at step 3 is; Devon clarified it is the **“workspace settings” page — 14 fields and half of them are unclear**.  
- Mia reconsidered and proposed possibly **cutting the form in half** instead of adding AI.  

## Action Items
- None identified.
```

### Recommendations
