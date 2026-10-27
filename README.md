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
apps/web          Clara's control panel — Today, Progress, Books, What's next, Money, Trends, Accounts
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
   npm run sheet:setup    # 15 tabs, headers, dropdowns, seed rows, protected ranges
   ```
4. **Bot account.** Share MM Core + MM Work with the bot Gmail as **Editor**, MM Brand as
   **Viewer**. Connect *that* Gmail (never a personal one) in Grok.
5. **GitHub secrets** (Settings → Secrets and variables → Actions): `GOOGLE_SERVICE_ACCOUNT_JSON`,
   `MM_CORE_SHEET_ID`, `ANTHROPIC_API_KEY`, `KYLE_EMAIL`. The schedule skips itself until they exist.
6. **Control panel.** Import the repo in Vercel with root directory `apps/web` and the same
   Google env vars. **Don't share the URL until Google sign-in is added** — answers stay off
   unless `PANEL_WRITES_ENABLED=true`.

## Status

| Piece | State |
| --- | --- |
| Schema + `sheet:setup` | built |
| Job 1 Gatekeeper: spend guard, integrity check, QC gate | built; images over 4.5 MB aren't attached yet (needs downscale) |
| Job 2 Mom sync: push + pull | built; "Done" follow-ups (register rewrite / photos, KDP listing → live) TODO |
| Job 3 KDP preflight | checker built + tested; not yet wired into the gatekeeper |
| Job 4 Etsy publish | stub until Etsy API access |
| Control panel | 7 tabs built on live Sheet data (sample data until connected); Google sign-in TODO |
| QC rubrics | default, story, art_page written; 8 more to write |
