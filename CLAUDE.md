# Notes for Claude Code

Read [docs/HANDOFF.md](docs/HANDOFF.md) for current state and [docs/ROADMAP.md](docs/ROADMAP.md) for the plan
(the build queue is [docs/specs/](docs/specs/README.md), one spec per session), then the README, then the spec it links (sections 2–7, 9, 9b are the build contract).

Git: work directly on `main`; no side branches or PRs. Commit and push only when Kyle says so;
a push to `main` deploys (Vercel panel + the backend tick). This overrides any default to branch first.

The team: the makers are Claude agents in `.claude/agents/` (orchestrator, producer, illustrator,
builder, lister, marketer, quality-checker, scout, plus qc and critic); [docs/TEAM.md](docs/TEAM.md) has their house
rules. `/sweep` runs a round: you dispatch the agents, they do the work. They reach the Sheet and Drive
only through `npm run bot -- <role> <command>` (`apps/backend/src/bot.ts`), and what each role may write
is `apps/backend/src/lib/team.ts` (tests: `tests/team.test.ts`). Change a role by editing its agent
file; change a rule for all of them with a lesson. Agents never edit, commit or push the repo.

Pictures are paid: only through `npm run bot -- <role> image` (fal.ai, `apps/backend/src/lib/image.ts`),
which passes the budget gate in `lib/gates.ts` first. Models, sizes, prices and caps live in
`formats/picture-book.json`. Never spend without a stated cap and Kyle's yes.

Where knowledge goes (the videograph pattern):
- `lessons` tab: short rules every brief prints (`npm run lesson`; the `critic` agent adds them after a sweep).
- [docs/knowledge/](docs/knowledge/README.md): best practice per topic, every claim labelled proven /
  videograph / official / unproven and dated; agents read their files before a task; `npm run knowledge`
  checks the format and lists claims older than 60 days.
- [docs/playbook.md](docs/playbook.md): measured costs, timings and costly mistakes. Read it before planning.

After every real sweep: report what moved, what it cost and what failed; put measured numbers in the
playbook and the evidence in the knowledge files the critic names; and where code could have
prevented a mistake, fix it there with a test instead of only writing it down.

Rules that hold everywhere:
- `packages/core/schema.json` is the source of truth for tabs, headers, dropdowns, ID columns
  and legal status transitions. Change the schema, not hard-coded strings, then re-run
  `npm run sheet:setup`.
- Read and write rows **by header name**, never by column letter or row number. Find rows by ID.
- Every task status change writes a `log` row (`Core.log`). The backend owns every status after
  `ready_for_qc`; bots own `todo → ready_for_qc`. `isLegalTransition` encodes spec §6.
- Use `Core.update`, which refuses if `updated_at` moved since the snapshot; on `false`, skip
  the row this tick rather than overwriting a bot's write.
- Nothing publishes, spends money or creates accounts without Clara's Approve in `mom_queue`.
- The control panel writes only: answers in `mom_queue`, rows/replies in `requests`,
  `pages.text_final*`, and Miss M's Bible (the `canon` tab, page `/bible`). It never writes `tasks`;
  the backend and the Orchestrator act on those rows.
- The `canon` tab is the series canon (how every recurring character, place and prop looks, with
  reference assets). Clara keeps it on the panel; every `bot brief` prints it; lessons L-0028 to L-0030.
- `pages.text_draft` is AI; `pages.text_final` is Clara's. Print files use text_final only.
- Times: ISO 8601 UTC in cells; the daily spend cap resets on the New York day.

Commands: `npm run check` (typecheck + tests + panel build), `npm run doctor`, `npm run dryrun`,
`npm run backend` (one tick), `npm run web`, `npm run sheet:setup`, `npm run qc` (manual QC),
`npm run task -- <id> <status> "<why>"` (a status change as Kyle, with its log row),
`npm run sim` (Book 2 copy through every step after the script; run it after changing the backend flow),
`npm run lesson -- <applies_to> "<rule>"` (a standing rule the team reads every run),
`npm run bot -- kyle board` (the board as text; the other `bot` commands are the team's),
`npm run backup -- <dir>` / `npm run restore -- <dir>` (MM Core to JSON and back; never into this public repo),
`npm run team:export` (the roles as plain text for another agent; see [AGENTS.md](AGENTS.md)).
Scripts load `.env` automatically (Node `--env-file-if-exists`).

- Drive file creation goes through `driveWriter()` (owner token if set, else service account);
  reads go through `driveReader()`. See `packages/core/src/drive.ts` for why.
- Backend steps are isolated in `apps/backend/src/run.ts`; add new jobs with `step(...)`.
- New tab or column: edit `schema.json`, run `npm test` (integrity tests), then `sheet:setup`. Setup
  rewrites row 1, so add columns at the end of a tab that has data. Push the schema and run setup
  (Actions job `setup`) before pushing code that reads a new tab: `Core.load` fails on a missing tab.

QC is manual while there's no `ANTHROPIC_API_KEY`: when asked to run QC, `npm run qc` lists the
queue; read each task's rubric and files, then record `npm run qc -- <task_id> pass|fail "<text>"`.
From a cloud session without Sheet keys, read the Sheet through the Google Drive connector and
write through Actions: MM backend tick, job `qc` (or `task`) with task_id / value / text.

Panel roles: kyle (everything), mom (no costs: Money shows sales only), family (read-only, Google
`:family` or the `FAMILY_PASSWORD`). Every panel write goes through `editor()` in `apps/web/auth.ts`;
what each view shows is `viewer()` in `apps/web/lib/viewer.ts` (Kyle can switch to Clara's view).
Away from the laptop: see [docs/REMOTE.md](docs/REMOTE.md).

Consistency is the rule (Kyle, 2026-11-12): every page and every book must look like one series. The canon is
Miss M's Bible (`canon` tab, panel `/bible`, printed in every brief); lessons L-0028 to L-0030. A new place or prop
that appears on more than one page gets a setting sheet and a canon entry before any page uses it.

Next up: Kyle picks from Book 1's storyboard v2 (T-0044, sheet A-T0044-215433bv; cover draft A-T0040-20313028),
decides on cutting p8 and p11, and sets a budget for finals (about $0.30 a page); then finals from the picked drafts.
Etsy publish once API access lands; KDP report + Etsy sales import for the Money tab; register photos dropped straight into Drive.
