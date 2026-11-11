# Playbook: what real runs showed

Measured costs, timings and costly mistakes. Read it before planning a book or a sweep; add to it
after every real one (the critic proposes the entries, a session with Kyle commits them). Rules that
every agent needs go in the `lessons` tab; the evidence stays here and in `docs/knowledge/`.

## Before paying for anything

1. State the cap and what it should buy, and get Kyle's yes. A sweep that will make pictures says
   how many and at what price first.
2. Sheets, then drafts of the whole book, then finals. Look at each stage before paying for the next.
3. Check an agent's report against the board (`npm run bot -- kyle board`) before the next step.

## Measured so far

| What | Number | From |
|---|---|---|
| `npm run sim` (a book through every step after the script, live Sheet) | about 4 min, 183 rows written and removed | first live run, 2026-11-01 |
| Sheets API pace that stays under the quota | 50 calls a minute per process | 2026-11-01 |
| Story draft that passed QC | about 270 words, 15 text pages, longest spread 49 words | T-0038 |
| Character sheets | passed QC on attempt 3 (Grok image model) | T-0025 |
| Pictures on Claude + fal | nothing measured yet | |

Planning prices for pictures (list prices, not yet confirmed on a bill): draft $0.08, character
sheet $0.15, print-size page $0.30. See [knowledge/models.md](knowledge/models.md).

## Costly mistakes

| When | What happened | Cost | What changed |
|---|---|---|---|
| 2026-10-29 | Files Grok bots left in their own workspace were lost (T-0004, T-0005, T-0014, T-0015) | not measured | Every file goes to Drive with an assets row; `handin` refuses a task with no uploaded file |
| 2026-10-31 | A Grok bot overwrote the Quality Checker's fail in the log with its own self-check | a lost verdict | `npm run bot` only appends to the log |
| before 2026-10-30 | Grok log rows had made-up from-statuses and times | an unreliable log | The tool writes the status and time itself |
| 2026-11-11 | The team's whole chat history went with the Grok account | the working context | Roles, rules and knowledge live in this repo; state lives in MM Core |

## After every real sweep

1. What moved, what it cost, what failed and why.
2. New numbers here; new short rules as lessons; the evidence in `docs/knowledge/`.
3. Where code could have prevented the mistake, fix it there with a test.
