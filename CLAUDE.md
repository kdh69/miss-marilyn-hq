# Notes for Claude Code

Read [docs/HANDOFF.md](docs/HANDOFF.md) for current state, then the README, then the spec it links (sections 2–7, 9, 9b are the build contract).

Git: work directly on `main`; no side branches or PRs. Commit and push only when Kyle says so;
a push to `main` deploys (Vercel panel + the backend tick). This overrides any default to branch first.

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
- The control panel writes only: answers in `mom_queue`, rows/replies in `requests`, and
  `pages.text_final*`. It never writes `tasks`; the backend and the Orchestrator act on those rows.
- `pages.text_draft` is AI; `pages.text_final` is Clara's. Print files use text_final only.
- Times: ISO 8601 UTC in cells; the daily spend cap resets on the New York day.

Commands: `npm run check` (typecheck + tests + panel build), `npm run doctor`, `npm run dryrun`,
`npm run backend` (one tick), `npm run web`, `npm run sheet:setup`, `npm run qc` (manual QC).
Scripts load `.env` automatically (Node `--env-file-if-exists`).

- Drive file creation goes through `driveWriter()` (owner token if set, else service account);
  reads go through `driveReader()`. See `packages/core/src/drive.ts` for why.
- Backend steps are isolated in `apps/backend/src/run.ts`; add new jobs with `step(...)`.
- New tab or column: edit `schema.json`, run `npm test` (integrity tests), then `sheet:setup`.

QC is manual while there's no `ANTHROPIC_API_KEY`: when asked to run QC, `npm run qc` lists the
queue; read each task's rubric and files, then record `npm run qc -- <task_id> pass|fail "<text>"`.

Panel roles: kyle (everything), mom (no costs: Money shows sales only), family (read-only, Google
`:family` or the `FAMILY_PASSWORD`). Every panel write goes through `editor()` in `apps/web/auth.ts`;
what each view shows is `viewer()` in `apps/web/lib/viewer.ts` (Kyle can switch to Clara's view).
Away from the laptop: see [docs/REMOTE.md](docs/REMOTE.md).

Next up: Etsy publish once API access lands;
KDP report + Etsy sales import for the Money tab; register photos dropped straight into Drive.
