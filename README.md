# Miss Marilyn HQ

Systems for Clara's publishing + merch business. **MM Core** (a Google Sheet) holds all state;
Grok bots and Claude QC write into it; a backend runs every 30 minutes on GitHub Actions; Clara
works from her own panel (Next.js on Vercel).

- Design: [Phase 1 Build Spec](https://claude.ai/artifact/SK5iZFL8TkRLKDzAwv5ihP) · panel redesign: [`docs/PANEL-PLAN.md`](docs/PANEL-PLAN.md)
- **Picking this up? Start with [`docs/HANDOFF.md`](docs/HANDOFF.md)** — what is done and what is outstanding.
- Setup, in order: [`docs/SETUP.md`](docs/SETUP.md) · live checklist: [Launch Checklist](https://claude.ai/artifact/FzUU8wZjrWifR9sv6Ejrpy)
- Accounts: [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md) · bot prompts: [`docs/bot-prompts.md`](docs/bot-prompts.md)
- Brand drafts for MM Brand: [`docs/brand/`](docs/brand/)

```
packages/core            schema.json (tabs, columns, dropdowns, status rules) + Sheet/Drive clients
apps/backend             the 30-min tick: gatekeeper, Clara sync, messages, Etsy, alerts, digest, backup
apps/backend/preflight   KDP PDF checker (Python, PyMuPDF) + tests
apps/backend/rubrics     Claude QC rubric per task type
apps/web                 the panel: Overview, Books, Progress, Ideas, To-do, Money (Clara) · Overview, Books, Progress, Inbox, System, Money (Kyle)
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

Tabs on the phone's bottom bar and the desktop sidebar: five for Clara, six for Kyle, three for
family (read-only). Kyle can flip to Clara's view with the *Viewing as* switch (it only changes
what is shown; writes stay his).
Plan and rationale: [`docs/PANEL-PLAN.md`](docs/PANEL-PLAN.md).

- **Overview** (home): greeting, headline numbers, *Keep writing* (straight to her next page
  still in the draft's words), a "Needs you" strip (approvals, questions, photo asks — one
  button each), *Tell the team*, photo upload, each book's stage, what's coming up, Scout's latest.
- **Books:** the shelf, with a badge on any book that needs her. In a book: one page at a time, art large, her words in big type, autosave,
  the AI draft under "Show the AI draft" (`pages.text_final` stays apart from `text_draft` for the
  KDP/copyright record). Page notes and the book thread sit below. **+ New book** sends the team
  a book idea.
- **Progress:** one card per book on the Story → Art → Layout → Publish → On sale track, with
  now / on you / next.
- **Ideas:** a notepad (ideas, notes, "always do this" house rules), plus Scout's finds with
  a *Let's make this* button.
- **To-do:** everything waiting on her in date order, this week's posts, and her accounts and
  socials (she can mark her own accounts done).
- **Money:** sales by book. Costs and profit are Kyle's only.
- **Kyle — Overview:** what to route, what's stuck, what's on Clara, bot spend, books, latest
  activity. **Inbox:** Clara's notes to route (*Send to bots*, *I handled it*, *Not doing*), stuck
  tasks, what's waiting on Clara, bot spend. **System:** pause/resume, last tick, config, accounts.
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
| Panel: Clara/Kyle views, phone tab bar, book editor, ideas, to-do, inbox, system | built |
| Rubrics (all task types), brand bible + style guide drafts | written; Clara approves the brand docs |
| Etsy publish | stub until Etsy API approval (packet fallback) |
| Photo registration from Drive inbox (bot-side uploads) | uploads via panel are registered; manual Drive drops aren't yet |
| KDP / Etsy sales import (Money tab) | after launch |
| Bot API fallback | only if the Grok row test fails |
