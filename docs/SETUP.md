# Setup — from zero to everything connected

Live checklist (tick boxes there): [Launch Checklist](https://claude.ai/artifact/FzUU8wZjrWifR9sv6Ejrpy).
Accounts: [`ACCOUNTS.md`](ACCOUNTS.md). This file is the repo copy of Kyle's steps.

**Critical path:** GitHub repo → Google Cloud keys → `npm run doctor` green → team connection test →
Vercel → `npm run dryrun` green.

## 1. The team
The makers are Claude agents in this repo (`.claude/agents/`, described in [`TEAM.md`](TEAM.md)); there
is nothing to connect or paste. They reach the Sheet and Drive with the same keys as the backend, so
they work wherever those keys are: the laptop's `.env`, or a cloud environment ([`REMOTE.md`](REMOTE.md)).

## 2. Google Cloud (console.cloud.google.com)
- [ ] Project **Miss Marilyn HQ** (owned by Clara's business Gmail; Kyle co-owner).
- [ ] Enable **Google Sheets API** and **Google Drive API**.
- [ ] IAM → Service accounts → `mm-backend` → Keys → JSON key.
- [ ] Share the **Miss Marilyn Business** folder (and MM Core) with the service account email as **Editor**.
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

## 4. Team connection test
In a Claude Code session on this repo (laptop, or a cloud session with the keys):

```bash
npm run bot -- kyle board      # reads MM Core: products, open tasks, what to do now
```

Then type `/sweep`. Pass = the Orchestrator's changes show on the panel's Progress page within a
minute and every status change has its log row. Uploads need the owner token (below).

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
- [ ] Choose the Illustrator's image model and connect it (`.claude/agents/illustrator.md`).
- [ ] Schedule the sweep: a Claude scheduled task that runs `/sweep` at 9am and 6pm New York.

## Manual QC (no ANTHROPIC_API_KEY)
The backend leaves finished work at `ready_for_qc`. In Claude Code, ask Claude to run QC:
`npm run qc` lists each waiting task with its brief, files, rubric and lessons; after review,
`npm run qc -- T-0012 pass "one sentence for Clara"` or `npm run qc -- T-0012 fail "what to fix"`.
Completeness and KDP preflight still run first. A pass goes to Clara's queue (or `done`); the
second fail escalates. A `/sweep` ends with this step (the `qc` agent).

## Weekly
- Compare the image tool's billing to `costs` (`ai_credits`). Clear **escalated**/**blocked**. Triage Clara's messages.
