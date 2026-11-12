# The team (Claude)

The makers are Claude agents, one per role, defined in [`.claude/agents/`](../.claude/agents/). They
replaced the Grok bots on 2026-11-11. A Claude Code session (cloud or laptop) runs them; nothing is
pasted anywhere, and a role's description changes by editing its file.

| Agent | Sheet role | Makes |
|---|---|---|
| `orchestrator` | `orchestrator` | tasks, briefs, questions to Clara; routes everything |
| `producer` | `story_producer` | the page plan and story draft |
| `illustrator` | `illustrator` | character sheets, page art, cover art |
| `builder` | `builder` | interior PDF, cover wrap, printables, mockups |
| `lister` | `publisher` | the KDP packet and every listing field |
| `marketer` | `growth` | the marketing plan, a week of posts at a time |
| `quality-checker` | `quality_checker` | the review before hand-in (log rows only) |
| `scout` | `scout` | research rows; works alone, on a topic from Kyle |
| `qc` | (recorded as the backend) | Claude's QC, the final gate before Clara |
| `critic` | (not a Sheet role) | lessons from each sweep; proposals for the knowledge library and playbook |

## How work moves

```
/sweep in a Claude session
  1. orchestrator   reads the board; requests → tasks; fails and Clara's changes → todo; next tasks
  2. the makers     start → work → upload → self-check                     (several at once)
  3. quality-checker  review pass, or review fail with numbered fixes → back to the maker
  4. hand in        in_progress → ready_for_qc, only after a pass
  5. qc             Claude's QC with the task type's rubric → Clara's card, done, or qc_fail
  6. orchestrator   again, for whatever the round changed
  7. critic         what failed and what it cost → lessons the next sweep reads
then the backend tick (:07 and :37) applies Clara's answers from the panel, as before.
```

The session that runs `/sweep` is the dispatcher: it starts each agent and passes results between
them, which is what the group chat's "@Role T-#### …" lines used to do. Agents never start each other.

## What this takes from videograph

Kyle's video repo runs a team of agents the same way, and five of its habits are built in here:

| Habit | Here |
|---|---|
| Every paid call passes a budget gate, and failures stop for a person | `image` checks three caps before calling the model: 3 attempts a picture, $6 a task, the day's cap. It writes the costs row itself |
| Cheap things first: references, then drafts, then the expensive pass | character sheets → drafts of all 24 pages → print-size finals, each stage approved before the next |
| Deterministic checks before any judge looks | `check` and `upload` refuse a page that isn't 2588 x 2625 px RGB PNG or a PDF that fails KDP preflight |
| Trust the record, not the agent's report | a Stop hook (`.claude/hooks/gate.mjs`) checks each agent's closing line against MM Core; `verify` does the same by hand |
| Write down what each run taught | the `critic` adds lessons after a sweep; `docs/knowledge/` holds the evidence, labelled and dated; `docs/playbook.md` holds costs and mistakes |

## House rules (every role)

You work for a small children's book publisher with one picture-book series for ages 2-6, *The
Adventures of Miss Marilyn* (line MM), starring the owner's real cat. Clara owns the business and
approves everything (role `mom` in the Sheet); Kyle runs the systems. The Google Sheet **MM Core** is
the only source of truth, and the panel shows Clara and the family only what is in it.

1. **Start with your brief.** `npm run bot -- <role> brief <task>` prints the task, its product, the
   active lessons that apply (requirements, every one), the pages, the files, QC notes and the log.
   If it says HALT, or the product is paused or retired, stop there. Then read the series bible and
   style guide (`docs/brand/`) and your task type's checklist (the path is in the brief).
2. **MM Core only through `npm run bot`.** It checks what your role may write, stamps the times and
   writes the log row. Never edit the Sheet any other way (not through the Drive connector either).
   If the command refuses, that is the rule working: don't route around it. Block the task or report.
3. **Statuses.** `start`, then work, then `handin`; or `block` with a one-line reason. Everything
   after `ready_for_qc` belongs to the backend and Clara.
4. **Files.** Work in `.mm-work/` (git ignores it; it's gone when the session ends). Every finished
   file and every source file (prompts, full-resolution art, layout scripts) goes to Drive with
   `upload`, which also writes its assets row: `rights_source` AI for anything the team made (human
   only for Clara's own words, photo for her photos) and `made_with` naming the exact tool and model
   (for your own writing, "Claude Code"). Look at a file with `fetch`, then open it from `.mm-work/`.
5. **Self-check (L-0012).** Go through every Blocking item on your checklist and every lesson, fix
   what fails, and keep the result as one line: `self-check: …` (what you checked, with the counts).
6. **Review (L-0013, L-0016).** When your work is uploaded and self-checked, stop and report "ready
   for review". The Quality Checker's verdict is in the log. Fix every numbered item in this same
   task, then ask for a new review. `handin` only works after a pass.
7. **The repo is the team's tooling, and it is public.** Read it; never edit, commit or push it
   during a run, and never put story text, names or links from the Sheet into it.
8. **Never** publish anything, sign in to a store or social account, create accounts, contact anyone
   outside the team, or delete or sort rows. Never copy or closely imitate an existing book,
   character, title or a named artist's style.
9. **Money.** Claude runs on Kyle's subscription, so your own run gets no costs row. Pictures are
   paid: make them only with `image`, which checks the caps and writes the costs row. Never call
   a paid service any other way. When `image` refuses for budget or attempts, stop and `block`.
10. **Knowledge.** Read the `docs/knowledge/` files your agent file names before you start, and
    follow their Rules. Proven claims come from our own runs and win over the rest.
11. **Unsure? Block** with a one-line reason instead of guessing.
12. **End with one line the dispatcher can act on:** `T-#### ready for review | self-check: …`,
    `T-#### blocked | <reason>`, `T-#### review pass`, or `T-#### review fail | N fixes, see log`.

## Commands

`npm run bot -- <role> <command> …` (role: the Sheet role; `kyle` can read). Full list:
[`apps/backend/src/bot.ts`](../apps/backend/src/bot.ts).

| Command | What it does |
|---|---|
| `board` | products, open tasks, requests to the Orchestrator, what to do now |
| `brief <task>` | everything for one task |
| `rows <tab> [col=value …]` | rows of a tab as JSON |
| `fetch <asset_id or Drive URL> …` | downloads files to `.mm-work/` |
| `start` / `block` / `handin <task> "<note>"` | the owner's status changes; the Orchestrator can also `block` someone's todo task (a hold) and release it with `todo` |
| `edges <file>` | the four outer 4% strips of a picture: dark and cream share per side, and a montage `<file>.edges.png` to look at; `image` prints the same flags after every print-size picture |
| `todo` / `cancel <task> "<why>"` | the Orchestrator's; `todo` copies QC's or Clara's note into the brief |
| `review <task> pass\|fail "<text>"` | the Quality Checker's verdict (a log row) |
| `note <task> "<text>"` | a log row that leaves the status alone |
| `apply <ops.json>` | row writes: `[{ "tab": "pages", "id": "MM-B02-p03", "set": { "text_draft": "…" } }]`; leave `id` out for a new row on tabs that mint IDs (tasks, requests, lessons, content, research) |
| `upload <task> <file> <asset_type> [page=N] [version=v2] made_with="…" [doc=1]` | file to the task's Drive folder + its assets row; `doc=1` turns .md / .txt / .html into a Google Doc; an Illustrator's `page_art` with `page=N` also lands on that page |
| `asset <task> <Drive URL> <asset_type> made_with="…"` | registers a file already in Drive |
| `folder <task>` | the task's Drive folder, MM Work/products/{product}/{task}/ |
| `image <task> <prompt.txt> kind=sheet\|draft\|page\|cover page=N\|name=x [ref=ids or files] [dry=1]` | one picture from the image model, behind the budget gate; crops print kinds to page size; writes the costs row; `dry=1` is a $0 placeholder |
| `check <file> [kind=cover pages=N]` | print specs for a PNG, KDP preflight for a PDF |
| `contact <task> [files…]` | the book's page art (or the files you name) on one sheet |
| `verify "<an agent's last line>"` | does the board agree with the report? |
| `cost <task> <usd> <vendor> "<what for>"` | a paid call made outside `image` |

Who may write what is in [`apps/backend/src/lib/team.ts`](../apps/backend/src/lib/team.ts), with
tests in `tests/team.test.ts`. One refused op stops its whole `apply` batch.

## Pictures

`image` calls Nano Banana Pro (sheets, print pages) and Nano Banana 2 (drafts) through fal.ai, the
same models as videograph's reference images. The key is either `FAL_KEY` in the session (the
laptop's `.env`), or, in a cloud environment, a network secret for `queue.fal.run` (header
Authorization, prefix Key), which keeps the key out of the session altogether. Reference images
travel inside the request, so nothing is left on fal's CDN. Every picture gets a recipe file beside
it (prompt, references, model, size) so it can be made again. The `miss-marilyn-hq` cloud
environment already allows fal's hosts.
Models, sizes, prices and caps are in [`formats/picture-book.json`](../formats/picture-book.json);
what is known about them is in [`knowledge/models.md`](knowledge/models.md). **No picture has been
made through it yet**: the first art task is also its first live test.

## Running it (Kyle)

- **A sweep:** open a Claude Code session on this repo and type `/sweep`. Do it after Clara answers
  things, or let the scheduled task do it (below).
- **One thing:** "run QC", "status", "ask Scout about <topic>", "have the Producer redo T-0038 with …".
- **A rule for the team:** `npm run lesson -- <role | task_type | all> "<rule>"`, same as before.
  Every brief prints the active lessons.
- **What a session needs:** the Sheet keys (`GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`), for
  uploads the owner token (`GOOGLE_OWNER_REFRESH_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`), and
  for pictures `FAL_KEY`. `bash .claude/setup.sh` lists which are set.
  On the laptop they're in `.env`; for cloud sessions see [`REMOTE.md`](REMOTE.md).
- **Scheduled sweeps:** a Claude scheduled task that opens a fresh cloud session and runs `/sweep`
  (9am and 6pm New York was the plan). It runs from `main`.
- **Pause everything:** the panel's *Pause the bots* (system_status HALT). Every write refuses.
- **Fewer permission prompts, and no way around the gate:** a project `.claude/settings.json` like
  videograph's would allow `npm run bot *`, `npm run qc*` and reads and writes in `.mm-work/`, deny
  `curl` to fal and Google and reading `.env`, and run `.claude/setup.sh` at session start. Claude
  isn't allowed to write that file for itself, so it's yours to add if you want it.
