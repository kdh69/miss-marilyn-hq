# Setup — from zero to everything connected

Live checklist (tick boxes there): [Launch Checklist](https://claude.ai/artifact/FzUU8wZjrWifR9sv6Ejrpy).
Accounts: [`ACCOUNTS.md`](ACCOUNTS.md). This file is the repo copy of Kyle's steps.

**Critical path:** GitHub repo → bot Gmail → Google Cloud keys → `npm run doctor` green →
Grok row test → Vercel → `npm run dryrun` green.

## 1. Today
- [ ] Bot Gmail (2-step on). In Grok → Connect apps: disconnect any personal Gmail, connect Gmail + Drive
      with the **bot Gmail**. Don't connect 1Password.
- [ ] Put the bot Gmail in the Sheet's `config` → `bot_account_email`.

## 2. Google Cloud (console.cloud.google.com)
- [ ] Project **Miss Marilyn HQ** (owned by Clara's business Gmail; Kyle co-owner).
- [ ] Enable **Google Sheets API** and **Google Drive API**.
- [ ] IAM → Service accounts → `mm-backend` → Keys → JSON key.
- [ ] Share the **Miss Marilyn Business** folder (and MM Core) with the service account email as **Editor**.
- [ ] Share MM Core + MM Work with the bot Gmail as **Editor**, MM Brand as **Viewer**.
- [ ] OAuth consent screen → External. Add Clara + Kyle as test users.
- [ ] Credentials → OAuth client ID → Web application. Redirect URIs:
      `https://<vercel-domain>/api/auth/callback/google` and `http://localhost:5179/oauth2callback`.

## 3. Local
```bash
npm install
cp .env.example .env        # fill it in; scripts load it automatically
npm run sheet:setup         # 18 tabs, headers, dropdowns, seed rows, locked columns
npm run doctor              # every connection, with the fix for anything red
```

### Uploads (only if doctor says so)
Google service accounts created since 2025 have no Drive storage, so they can't own uploaded
photos in a free-Gmail Drive. Doctor tests this. If it fails:
1. OAuth consent screen → **Publish app** (In production). Unverified is fine for two people;
   Testing-mode tokens expire after 7 days.
2. `npm run google:authorize`, sign in as the owner of *Miss Marilyn Business*.
3. Put the printed `GOOGLE_OWNER_REFRESH_TOKEN` in `.env`, GitHub secrets and Vercel.

## 4. Grok row test (the biggest unknown)
Paste to the Orchestrator:

```text
Connection test. In the Google Sheet "MM Core": (1) read the value of system_status in the config tab; (2) append one row to the tasks tab with task_id T-9999, product_id OL-B01, task_type book_plan, title "Connection test", brief "Delete me", owner orchestrator, status todo, priority P3, created_by orchestrator, and created_at and updated_at set to the current UTC time in ISO format, updated_by orchestrator; (3) append one row to the log tab: ts now, actor orchestrator, task_id T-9999, from_status empty, to_status todo, message "connection test". Do not edit any other row or row 1. Reply with system_status and the row numbers you wrote.
```

Pass = every value under the right header, dropdowns accepted, row 1 untouched, the task shows on
the panel's Progress page within a minute. Then set its status to `cancelled` (as `kyle`).
If columns shift or rows can't be appended: stop and ask Claude for the bot API fallback.

## 5. GitHub (repo → Settings → Secrets and variables → Actions)
Required: `GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`, `KYLE_EMAIL`.
Optional: `ANTHROPIC_API_KEY` (without it QC is manual, see below), `CLARA_EMAIL`, `RESEND_API_KEY`, `NOTIFY_FROM`, `PANEL_URL`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, `GOOGLE_OWNER_REFRESH_TOKEN`.
Then Actions → **MM backend tick** → Run workflow → `doctor`, then `dryrun`. Both green = live.

## 6. Vercel
- [ ] Import `miss-marilyn-hq`, **Root Directory** `apps/web`.
- [ ] Env: `GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
      `AUTH_SECRET`, `PANEL_USERS` (+ `GOOGLE_OWNER_REFRESH_TOKEN` if you made one).
- [ ] Sign in as you and as Clara; each sees their own name in the sidebar.

## 7. Alerts, content, bots
- [ ] Resend + verified brand domain → `RESEND_API_KEY`, `NOTIFY_FROM` (Kyle alerts, Clara's Sunday email).
- [ ] Clara approves `docs/brand/series-bible.md` and `style-guide.md` → upload to **MM Brand**.
- [ ] Paste the prompts from `docs/bot-prompts.md` into the 7 bots.
- [ ] Confirm whether Grok can schedule the Orchestrator (else send `@Orchestrator sweep` twice a day).

## Manual QC (no ANTHROPIC_API_KEY)
The backend leaves finished work at `ready_for_qc`. In Claude Code, ask Claude to run QC:
`npm run qc` lists each waiting task with its brief, files, rubric and lessons; after review,
`npm run qc -- T-0012 pass "one sentence for Clara"` or `npm run qc -- T-0012 fail "what to fix"`.
Completeness and KDP preflight still run first. A pass goes to Clara's queue (or `done`); the
second fail escalates. Check the queue at least daily, or bots sit idle waiting on it.

## Weekly
- Compare Grok billing to `costs` (`ai_credits`). Clear **escalated**/**blocked**. Triage Clara's messages.
