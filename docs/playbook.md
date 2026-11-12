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
| First picture through `image` (fal, Nano Banana 2, draft 1K, 2 references) | worked first call, 1024 x 1024 px, on-model, $0.08 (C-0005) | T-0026 test, 2026-11-11 |
| Final page (Nano Banana Pro, 4K, 3 to 4 references) | 2588 x 2625 px after the crop, no enlargement needed, $0.30 each (C-0006 to C-0009); one page task of one picture took about 2.5 min start to report | T-0027, T-0032, 2026-11-11 |
| Draft as first reference + "keep this composition" (test B1) | holds at print size, almost pixel for pixel: p3, p12, p13 | T-0027, T-0032 |
| A fix asked for in words against that reference | ignored: p12 retry kept the tail on the edge and Gussie sitting | T-0032 attempt 2 (C-0009) |
| The first live sweep's picture spend (estimates, not yet checked against fal's dashboard) | $4.62 for 22 pictures (C-0005 to C-0026): $2.18 for the first 8, then $2.44 for the clean-up of p12 to p15 under a second cap | 2026-11-11 to 11-12 |
| Redraft the draft, then the final (p12, p13, p14, p15) | p12 fixed for $0.46, p15's edge fixed for $0.76, p13 for $0.46 (still 4 px over the 4% strip, accepted by Kyle), p14 for $0.46 (raw tail 12 px over); about $0.45 to $0.80 a page instead of $0.30 to $0.90 of blind retries | T-0032, T-0033 |
| The model ignores "move her N% right" wording; a layout with explicit positions (x as % of the width) worked on p15 | 3 of 4 tries ignored the shift | T-0032, T-0033 |
| Attempts per page, finals | p3 1, p12 2 (both faulty), p13 1, p14 2, p15 1 (failed); only p3 and p13 were clean first time (2 of 5 pages) | T-0027, T-0032, T-0033 |
| Money spent on pictures not kept or still faulty | $0.90 on C-0009, C-0010 and C-0012, plus C-0007 kept with two faults; all from faults the draft handed down | 2026-11-11 |
| Free "shrunk draft on a cream canvas" reference | helped p14 partly (tail clear, a cream vignette added), failed p15 (crowded scene) | T-0033 |

Planning prices for pictures (list prices, not yet confirmed on a bill): draft $0.08, character
sheet $0.15, print-size page $0.30. See [knowledge/models.md](knowledge/models.md).

Planning prices held on the live run: draft $0.08 and final $0.30 matched the costs rows (estimates).

## Costly mistakes

| When | What happened | Cost | What changed |
|---|---|---|---|
| 2026-10-29 | Files Grok bots left in their own workspace were lost (T-0004, T-0005, T-0014, T-0015) | not measured | Every file goes to Drive with an assets row; `handin` refuses a task with no uploaded file |
| 2026-10-31 | A Grok bot overwrote the Quality Checker's fail in the log with its own self-check | a lost verdict | `npm run bot` only appends to the log |
| before 2026-10-30 | Grok log rows had made-up from-statuses and times | an unreliable log | The tool writes the status and time itself |
| 2026-11-11 | The team's whole chat history went with the Grok account | the working context | Roles, rules and knowledge live in this repo; state lives in MM Core |
| 2026-11-11 | Uploading an ink line layer as `page_art page=N` overwrote the page's `art_asset_id` with the ink file | a wrong picture on a page until reset by hand | `isPagePicture()` in `lib/team.ts` with a test (32628b0); ink layers upload with `version=ink` |
| 2026-11-11 | p12 retry ($0.30) repeated both faults of the first (tail on the edge, Gussie sitting) because the draft reference outweighed the words | $0.30 | Rules for the next pages: say margins and pose up front in the prompt, check the outer 4% before the next paid call, stop at the same fault twice |
| 2026-11-02 to 11-11 | Clara's 8 picture notes (Q-20261102…) sat unread as `new` requests to Kyle for 9 days; the 11-01 message went to the Orchestrator without them | a sweep that would have paid for pages she'd already changed or cut | Not fixed in code yet. This sweep's Orchestrator found them and held the five affected tasks (T-0026, T-0028 to T-0031); now L-0023: read every `new` request before releasing or briefing art tasks |
| 2026-11-11 | p14 and p15 repeated the draft-handed edge faults (C-0010 to C-0012, $0.90 for one good-enough page and one failed) | $0.90 | L-0021, L-0022: redraw the draft first; on a retry change the method; stop when the same fault comes back |
| 2026-11-11 | The Orchestrator cannot set `blocked`, so T-0041 to T-0043 sit in `todo` with "HOLD - DO NOT START" in the brief and show in the board's `start:` line | a risk that a held task is dispatched | Not fixed in code (proposal: a `hold` marker the board respects, or let the Orchestrator move todo to blocked) |
| 2026-11-11 | The cloud environment didn't allow `missmarilyn.vercel.app` | the panel couldn't be checked | Kyle approved adding the host; check the allowed hosts first on a new environment |
| 2026-11-11 | A maker reported spending "one more than approved" (3 pictures) when the limit was 2 plus 1 retry | confusion over a cap | L-0024: state the maximum in dollars and pictures, retry included |
| 2026-11-12 | I called p13 and p15 "good" after looking; the Quality Checker failed them (p13 tail 0.5% from the edge, p15 no nose smudge, a blocking rule) | $0.76 of fixes | L-0027: check each blocking rule one by one before calling a picture good |
| 2026-11-12 | The Illustrator shrank and mirror-padded p14's final to pull the tail in, leaving chevron artefacts in the grass | a final that can't be used as is | L-0026: final art is the model's output only; stop and ask after the second edge fail |
| 2026-11-12 | p15 hit the 3-attempt gate (2 drafts and 3 finals counted separately per kind); Kyle raised `maxAttemptsPerImage` to 4 | $0.30 for the fourth final | The gate did its job: it stopped, a person decided. Attempts are counted per task, kind and page |
| 2026-11-12 | Agent reports miscounted pictures and spend three times (T-0032, T-0033 twice); the costs tab and `kyle board` were right each time | confusion, no money | Always check `kyle rows costs` and the board before relaying a report; Kyle's rule: a dollar maximum, not a picture count (L-0024) |
| 2026-11-11 | HANDOFF said the author name was open; Clara had answered R-0003 ("Clarette Kiddle") | a stale blocker | L-0025: check requests and mom_queue for Clara's answer before calling a fact open |

## After every real sweep

1. What moved, what it cost, what failed and why.
2. New numbers here; new short rules as lessons; the evidence in `docs/knowledge/`.
3. Where code could have prevented the mistake, fix it there with a test.

## Not built yet: code that would have prevented these (from the critic, 2026-11-11)

- `image` could compute edge contact on the outer 4% and print it before a picture is accepted.
- `image` could warn when requests with status `new` are older than a day (the nine-day miss).
- The budget gate could print the remaining dollars and pictures to the maker.
- A check that `products.author_name` is empty while a request answered it (R-0003).
- An experiment to run with Kyle's yes (cap $0.70, 3 pictures): on p12, a final with sheets only and the layout in words, against a redrawn $0.08 draft plus a final; whichever fixes the tail and Gussie's pose for less is the method for the rest of the book.

## S1 and the picture ledger (2026-11-12)

- Built and tested in memory (187 tests), never run live: collision-proof costs, content and asset IDs; reserve a costs row
  before the paid call and settle it after (a refused or failed call is $0, a timeout is billed); a sweep lock
  (`config!sweep_started_at`, 90 minutes); the review's findings F2 to F12; the budget is 3.5 x the price per picture a task
  covers (Kyle's call, from the first evening's 3.5 final attempts a page).
- One slip while building: a test reached the real fal once with no key; refused, no job, nothing billed. The image tests now
  strip `FAL_KEY` and the Google credentials from the environment and take only a fake generator.
- The edge check (`edges`, and after every print-size `image`) caught a cream border exactly and missed grey tail fur on an
  edge until its threshold was lowered: it flags where to look; a person still decides.
- Live check of the ledger, 2026-11-12: one $0.08 draft (`name=ledger-test`, T-0033), C-20261112014408-lc50, settled cleanly. Day total $4.70 for 23 pictures.
- Scheduled sweeps went on 2026-11-12 (8:43 and 17:43 New York) at a $0 picture budget: the first runs show whether the flow holds
  without Kyle. Raise the budget in the task's prompt only after two clean sweeps.
