# S3 — The panel starts the backend tick

**Status:** not started · **Repo:** miss-marilyn-hq · **Needs first:** nothing · **Spends:** $0

## Why

The backend is scheduled for :07 and :37 every hour, but GitHub runs scheduled workflows when it
has room: between 2026-11-08 and 2026-11-11 it ran 12 times, 4 to 10 hours apart. Clara approves
something and nothing happens for hours. The tick should run because she did something, with the
schedule kept as the backstop.

## Read first

`apps/web/app/actions.ts` (every save goes through `editor()`), `apps/web/auth.ts`,
`.github/workflows/backend.yml` (`workflow_dispatch`, `concurrency: mm-backend`),
`apps/backend/src/run.ts`, `docs/REMOTE.md`.

## Needs from Kyle

A fine-grained GitHub token limited to this repository with **Actions: read and write** and nothing
else, saved in Vercel as `GITHUB_DISPATCH_TOKEN` (Production). Kyle creates it; never paste it in chat.

## What to build

1. `apps/web/lib/tick.ts`: `requestTick(reason: string): Promise<void>`.
   - No token → return silently (local runs, previews).
   - `POST https://api.github.com/repos/kdh69/miss-marilyn-hq/actions/workflows/backend.yml/dispatches`
     with `{ "ref": "main", "inputs": { "job": "tick" } }`. Take owner and repo from an env var with
     that default, not a second hard-coded copy.
   - Never throws and never delays the save: catch everything, log one line without the token.
   - **Debounce:** Clara answers several cards in a row. Keep `config!last_tick_request_at` in the
     Sheet (add the key to the `config` seed in `schema.json`; `sheet:setup` adds missing config
     rows). Skip the dispatch if the last one was under 3 minutes ago. The workflow's concurrency
     group already queues rather than overlaps, so a rare double dispatch is harmless.
2. Call it, after the write has succeeded, from the actions whose effect the backend applies:
   `answerItem`, `approvePage`, `markDone`, `askMarketing`, `sendMessage` (only when `to` is the
   orchestrator and `requests_default_to` routes straight to the team), `triageRequest` (forward),
   `setSystemStatus`. Not from `savePageText` (she types a lot; her words are applied when she
   approves) or photo uploads.
3. The panel says what will happen: where it now says the change applies at the next tick, say
   "applying now, usually within a few minutes" when a tick was requested, and keep the old wording
   when it wasn't. Find the strings with grep; don't add a new component.
4. `npm run doctor`: a line for `GITHUB_DISPATCH_TOKEN` (set / not set, and that it belongs in Vercel).
5. Docs: `README.md` ("What runs every 30 minutes" becomes "when Clara acts, and on a schedule as a
   backstop"), `docs/HANDOFF.md` (remove the warning under Things to know), `docs/SETUP.md` §6,
   `.env.example`.

## Tests

- Unit: `requestTick` with no token does nothing; with a token builds the right request (inject
  `fetch`); a failed request doesn't throw; the debounce skips a second call inside 3 minutes.
- Live, after deploy: approve a test card (or pause and resume the bots as Kyle) and confirm a
  `workflow_dispatch` run of MM backend tick starts within a minute and the change is applied.
  Record the measured delay in `docs/playbook.md`.

## Done when

`npm run check` passes; a save in the deployed panel starts a tick within a minute; the schedule
still runs; the docs say what is true.

## Not in this spec

Moving the backend off GitHub Actions. A websocket or live refresh in the panel (it re-reads the
Sheet every 60 s already).
