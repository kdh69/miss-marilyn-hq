# Miss Marilyn HQ

Systems for Clara's publishing + merch business: the **MM Core** Google Sheet as the single
source of truth, a **backend** that runs every 30 minutes on GitHub Actions, and **Clara's
control panel** (Next.js on Vercel).

Full design: [Phase 1 Build Spec](https://claude.ai/artifact/SK5iZFL8TkRLKDzAwv5ihP).
Bot system prompts: [`docs/bot-prompts.md`](docs/bot-prompts.md).

```
packages/core     schema.json (every tab, column, dropdown, status rule) + Sheet client
apps/backend      the scheduled jobs: gatekeeper (QC + spend cap + integrity), mom sync, Etsy publish
apps/backend/preflight   KDP file checker (Python, PyMuPDF)
apps/web          Clara's workspace — Today, Progress, Books (page-by-page editor), Messages, What's next, Money, Trends, Accounts
scripts           setup-sheet.ts builds/repairs MM Core from the schema
```

## Google Drive (already created)

In **Miss Marilyn Business**:
- **MM Core** — the Sheet (`1YAZyJ6mBA5Y02r3mO7svqet9nHI53rtBXO3eYWEMZkY`), blank until `sheet:setup` runs
- **MM Work** — `products/`, `packets/`, `reports/` (bot account = Editor)
- **MM Brand** — `photos/inbox/` (bot account = Viewer)

## One-time setup

1. **Service account.** Google Cloud console → new project → enable *Google Sheets API* and
   *Google Drive API* → IAM → Service accounts → create → Keys → add JSON key.
2. **Share** MM Core and the *Miss Marilyn Business* folder with the service account's
   `client_email` as **Editor**.
3. **Build the Sheet:**
   ```bash
   npm install
   cp .env.example .env   # paste the key JSON on one line + fill the rest
   set -a; . ./.env; set +a
   npm run sheet:setup    # 17 tabs, headers, dropdowns, seed rows, protected ranges
   ```
4. **Bot account.** Share MM Core + MM Work with the bot Gmail as **Editor**, MM Brand as
   **Viewer**. Connect *that* Gmail (never a personal one) in Grok.
5. **GitHub secrets** (Settings → Secrets and variables → Actions): `GOOGLE_SERVICE_ACCOUNT_JSON`,
   `MM_CORE_SHEET_ID`, `ANTHROPIC_API_KEY`, `KYLE_EMAIL`. The schedule skips itself until they exist.
6. **Control panel.** Import the repo in Vercel with root directory `apps/web` and the env vars
   from `.env.example` (Google service account + sign-in). In the same Google Cloud project create
   an OAuth client (Web app) with redirect `https://<vercel-domain>/api/auth/callback/google`.
   `PANEL_USERS` lists who can sign in (Clara as `mom`, you as `kyle`). Without sign-in configured
   the site runs read-only in preview mode.

## How Clara works in the panel

- **Today:** approvals, questions the team asked her, and a "Tell the team" box (type, hit Enter).
- **Books → a book:** every page with its art and text. She rewrites the draft in her own words
  (saved to `pages.text_final`, kept apart from the AI draft for the KDP/copyright record), leaves
  a note on any page, or messages about the whole book.
- **Messages:** everything in both directions. Her notes go to **you** first by default
  (`config.requests_default_to = kyle`): you tap *Send to bots*, *I handled it* or *Not doing*.
  Set it to `orchestrator` later to send her notes straight to the bots.
- **"Always do this" notes** become standing rules (`lessons`) on the next tick; every bot follows them.

## Status

| Piece | State |
| --- | --- |
| Schema + `sheet:setup` | built |
| Job 1 Gatekeeper: spend guard, integrity check, QC gate | built; images over 4.5 MB aren't attached yet (needs downscale) |
| Job 2 Mom sync: push + pull, rewrite record, rules → lessons | built; photo registration and KDP listing → live TODO |
| Job 3 KDP preflight | checker built + tested; not yet wired into the gatekeeper |
| Job 4 Etsy publish | stub until Etsy API access |
| Control panel | 8 tabs on live Sheet data (sample data until connected); Google sign-in; book workspace with page editing, notes, two-way messages, Kyle triage; Drive image proxy |
| QC rubrics | default, story, art_page written; 8 more to write |
