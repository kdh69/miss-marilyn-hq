# Miss Marilyn HQ

Systems for Clara's publishing + merch business. **MM Core** (a Google Sheet) holds all state;
Grok bots and Claude QC write into it; a backend runs every 30 minutes on GitHub Actions; Clara
works from her own panel (Next.js on Vercel).

- Design: [Phase 1 Build Spec](https://claude.ai/artifact/SK5iZFL8TkRLKDzAwv5ihP)
- Setup, in order: [`docs/SETUP.md`](docs/SETUP.md) · live checklist: [Launch Checklist](https://claude.ai/artifact/FzUU8wZjrWifR9sv6Ejrpy)
- Accounts: [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md) · bot prompts: [`docs/bot-prompts.md`](docs/bot-prompts.md)
- Brand drafts for MM Brand: [`docs/brand/`](docs/brand/)

```
packages/core            schema.json (tabs, columns, dropdowns, status rules) + Sheet/Drive clients
apps/backend             the 30-min tick: gatekeeper, Clara sync, messages, Etsy, alerts, digest, backup
apps/backend/preflight   KDP PDF checker (Python, PyMuPDF) + tests
apps/backend/rubrics     Claude QC rubric per task type
apps/web                 Clara's panel: Today, Progress, Books, Messages, What's next, Money, Trends, Accounts
scripts                  sheet:setup, google:authorize
tests                    schema integrity + status-rule tests
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run doctor` | Checks every key and connection; prints the fix for anything red |
| `npm run dryrun` | Pushes a fake task through bot → QC → Clara → done, then cleans up |
| `npm run sheet:setup` | Builds or repairs MM Core (18 tabs, dropdowns, locked columns) from the schema |
| `npm run backend` | One backend tick by hand |
| `npm run web` | Clara's panel locally (sample data until the Sheet is connected) |
| `npm run check` | Typecheck + tests + preflight tests + panel build (what CI runs) |
| `npm run google:authorize` | One-time owner key, only if doctor says uploads need it |

GitHub → Actions → **MM backend tick** → Run workflow can also run `doctor` or `dryrun` in the cloud.

## Google Drive

In **Miss Marilyn Business**: **MM Core** (`1YAZyJ6mBA5Y02r3mO7svqet9nHI53rtBXO3eYWEMZkY`),
**MM Work** (`products/`, `packets/`, `reports/`), **MM Brand** (`photos/inbox/`) and `backups/`.
Folder IDs live in the Sheet's `config` tab.

## How Clara works in the panel

- **Today:** approvals, questions from the team, "Tell the team" (type, hit Enter), photo upload.
- **Books → a book:** every page with art and text. She rewrites the draft in her own words
  (`pages.text_final`, kept apart from the AI draft for the KDP/copyright record), leaves page notes,
  or messages about the whole book.
- **Messages:** both directions. Her notes go to Kyle first (`config.requests_default_to = kyle`):
  *Send to bots*, *I handled it* or *Not doing*. "Always do this" notes become standing rules.
- **Accounts:** which accounts exist and which are still to do. **Money**, **Trends**, **Progress**, **What's next**.
- If the bots are paused (spend cap hit), a banner says so; Kyle gets a **Resume** button.

## What runs every 30 minutes

1. **Spend guard** — `ai_credits` ≥ $15 today → HALT + alert. QC capped at $5/day.
2. **Integrity check** — illegal status jumps reverted and logged; missing log rows backfilled.
3. **QC gate** — completeness → KDP preflight (PDFs) → Claude with the task's rubric → pass/fail/escalate.
4. **Clara sync** — her answers applied; rewrites recorded as a human asset; photo requests queued.
5. **Messages** — rules → lessons. **Etsy publish** (stub until API access).
6. **Alerts** (one email per tick), **Sunday digest** to Clara, **weekly backup** of MM Core (keeps 8).

Each step is isolated: one failure is emailed and the rest still run; the Actions run goes red.

## Security

- Keys only in GitHub secrets, Vercel env and local `.env` (gitignored; CI runs gitleaks).
- The bot Gmail never owns or signs into any store, social, bank or registrar account.
- The panel signs in only the emails in `PANEL_USERS`; without sign-in it's read-only.
- The panel writes only Clara's answers, messages, page text, photos and (Kyle) pause/accounts —
  never `tasks`. Nothing publishes or spends without Clara's Approve.
- Protected ranges keep bots out of backend-only columns; the integrity check catches the rest.

## Status

| Piece | State |
| --- | --- |
| Schema, `sheet:setup`, doctor, dry run | built |
| Gatekeeper: spend guard, integrity, QC + preflight, image downscale | built |
| Clara sync, messages → lessons, rewrite record, alerts, digest, backup | built |
| Panel: 8 tabs, sign-in, book workspace, messages, uploads, pause/resume, accounts | built |
| Rubrics (all task types), brand bible + style guide drafts | written; Clara approves the brand docs |
| Etsy publish | stub until Etsy API approval (packet fallback) |
| Photo registration from Drive inbox (bot-side uploads) | uploads via panel are registered; manual Drive drops aren't yet |
| KDP / Etsy sales import (Money tab) | after launch |
| Bot API fallback | only if the Grok row test fails |
