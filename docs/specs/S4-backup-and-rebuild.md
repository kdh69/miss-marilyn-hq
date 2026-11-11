# S4 — Nightly backup and the rebuild drill

**Status:** not started (backup and restore commands exist, unit-tested only) ·
**Repo:** miss-marilyn-hq · **Needs first:** S2 (keys proven live) · **Spends:** $0

## Why

MM Core is the business, and today it has no working backup: the weekly copy inside Drive fails
without the owner token, and a copy inside the same Google account wouldn't survive losing that
account anyway. Losing Grok cost the chat history. Losing the Sheet would cost everything. This
spec puts a copy somewhere else every night and proves it can be turned back into a working Sheet.

## Read first

`apps/backend/src/backup.ts` (`planRestore`), `scripts/setup-sheet.ts`, `.github/workflows/backend.yml`,
`apps/backend/src/jobs/housekeeping.ts` (`weeklyBackup`), `AGENTS.md`, roadmap §2.

## Needs from Kyle

- A **private** GitHub repo (suggested name `miss-marilyn-backup`), empty. This repo is public, so
  backups can never go here.
- A deploy key for that repo with write access: public half on the backup repo, private half as
  the Actions secret `BACKUP_DEPLOY_KEY` on this repo. Kyle creates both.
- For the drill: a blank Google Sheet shared with the service account as Editor, and its ID.

## What to build

1. **Run the existing commands live first.** `npm run backup -- <dir>` against MM Core; check
   `manifest.json`'s row counts against the Sheet. Fix what breaks.
2. **Nightly job.** A second workflow, `.github/workflows/backup.yml`: daily at an off-hour, plus
   `workflow_dispatch`. Steps: checkout this repo; `npm ci` for the backend; `npm run backup -- out`;
   clone the backup repo over SSH with the deploy key; replace its `mm-core/` folder with `out/`;
   commit as "MM Core <date>" only if something changed; push. Git history is the retention: every
   night's state is recoverable, and a diff shows what changed that day.
   - The log prints row counts only. No cell contents in a public Actions log.
   - It skips cleanly, green, when the secrets aren't set (same pattern as `backend.yml`).
   - Because GitHub's schedule is best-effort (see S3), also run it at the end of the backend tick
     when the last backup is more than 24 hours old (`config!last_offsite_backup_at`, a new config
     seed row).
3. **Staleness alarm.** `npm run doctor` and the backend's alerts: warn Kyle when the last off-site
   backup is older than 48 hours.
4. **Files (roadmap R3), first step only.** A doctor check that every `assets.file_url` on a
   non-superseded asset of a live or in-production product still opens (Drive `files.get`, in
   batches). Copying Drive files off Google is a later spec; knowing when one goes missing is this one.
5. **The drill.** With `MM_CORE_SHEET_ID` pointed at the scratch Sheet (in the shell only, never
   committed): `npm run sheet:setup`, `npm run restore -- <backup dir>`, then `npm run doctor` and
   `npm run bot -- kyle board`. The board must match the live one. Then `npm run sim` against the
   scratch Sheet to prove it works as a Sheet, not just holds rows. Time it.
6. **`docs/REBUILD.md`.** From nothing to a working business, as numbered steps with the command
   for each and the time each took in the drill: new Google project and service account; new Sheet;
   `sheet:setup`; `restore`; Drive folders and their IDs in `config`; secrets, by name, and where
   each goes (GitHub, Vercel, the cloud environment); Vercel project; the team on Claude Code, and
   on another agent via `npm run team:export`. End with what a restore does not bring back (Drive
   files, Google sharing, protected ranges' editors).
7. `restore` details to settle while drilling: seeded tabs (`config`, `task_types`, `accounts`) get
   the backup's values; the Drive folder IDs in `config` point at the old folders, so print a
   reminder to review them; `lists` is rebuilt from the schema and never restored.

## Tests

Unit tests for anything added to `planRestore`. The drill itself is the test that matters.

## Done when

- A commit lands in the private repo from the nightly job two nights running.
- The drill has been run end to end on a scratch Sheet, with its time in `docs/REBUILD.md` and
  `docs/playbook.md`.
- Doctor shows the backup's age; the handoff no longer says the Sheet has no backup.

## Not in this spec

Copying Drive files off Google (R3's second half), a password manager (R6), a second image vendor (R7).
