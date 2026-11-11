# Working away from the laptop

Three ways to work, from most to least capable:

1. **Remote Control:** drive the Claude session running on the laptop from your phone. Needs the
   laptop on, awake and the Claude app open. Everything below works, because it *is* the laptop.
2. **A cloud Claude Code session** (claude.ai/code): Claude works on a fresh copy of the GitHub repo
   in Anthropic's cloud. It has no `.env`, no Vercel login and no browser of yours.
3. **Just your phone:** the web dashboards (panel, Claude, Google, GitHub, Vercel).

## What works where

| Task | Phone only | Cloud Claude session | Needs the laptop |
|---|---|---|---|
| Use the panel, approve, message the team | ✅ | | |
| Run the team (`/sweep`, "ask Scout…", "run QC") | ✅ start a cloud session from the Claude app | ✅ on the **miss-marilyn-hq** environment | ✅ |
| Look at or edit the Sheet and Drive | ✅ | | |
| Run the backend (`doctor`, `dryrun`, a tick) | ✅ GitHub → Actions → Run workflow | | |
| Record a QC verdict, or change a task's status as Kyle | ✅ Actions → MM backend tick → job `qc` or `task` | ✅ Claude triggers the same workflow | |
| Change GitHub secrets / Vercel env vars | ✅ their web dashboards | | |
| Redeploy the panel as it is | ✅ Vercel dashboard → Redeploy | | |
| Change code, run typecheck and tests, push, open a PR | | ✅ | |
| Deploy a code change to the panel | ✅ merge the PR in the GitHub app | ✅ push a branch, open a PR, merge to `main` | |
| Run QC (`npm run qc`), peek at the Sheet, `sheet:setup`, `doctor` locally | | ✅ on the **miss-marilyn-hq** environment | ✅ |
| `npm run google:authorize` (uploads token) | | ❌ | ✅ (the callback is `localhost`) |
| Anything using `.env` values | | ⚠️ only what you add to the cloud environment | ✅ |

## Making cloud sessions useful

- **Vercel is connected to GitHub** (since 2026-10-30): a cloud session pushes a branch, Vercel builds a
  preview, and merging the PR to `main` deploys production.
- **The backend runs from GitHub** every 30 minutes with no laptop, and you can trigger `doctor` or
  `dryrun` from the GitHub app (Actions → MM backend tick → Run workflow).
- **GitHub Actions minutes are free** because the repo is public. Scheduled runs pause after 60 days
  with no commits; any commit restarts them.
- **For the team and QC from a cloud session**, the session's cloud environment needs the Sheet keys.
  In Claude Code on the web: the environment menu → the environment this repo uses → Edit →
  environment variables:
  - `GOOGLE_SERVICE_ACCOUNT_JSON` (the whole key JSON on one line) and `MM_CORE_SHEET_ID`: reads and
    writes of MM Core, reading Drive files. With these, `/sweep`, "run QC" and "status" work the same
    as on the laptop.
  - `GOOGLE_OWNER_REFRESH_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: uploads to Drive as the folder
    owner (`npm run google:authorize` on the laptop makes the token). Without them a maker has to
    create each file through the Google Drive connector and register it with `npm run bot -- <role> asset`.
  - The fal.ai key, for pictures (`npm run bot -- illustrator image`): best as a network secret for
    `queue.fal.run` (header Authorization, prefix Key), which keeps it out of the session; a `FAL_KEY`
    variable works too. fal's hosts aren't on the default network list.
  The environment **miss-marilyn-hq** (made 2026-11-11) has Google's and fal's hosts, a setup script
  and, since 2026-11-11, every key above except fal's (the board printed from a session there). Start
  this repo's sessions on it. When a key is added to `.env`, add it here too.
  Use an environment of its own for this repo, so the key isn't in the sessions of other projects.
  Google's APIs (`sheets.googleapis.com`, `www.googleapis.com`, `oauth2.googleapis.com`) answered from
  the default trusted network on 2026-11-11; a custom allowlist has to include them.
  Without the keys, a cloud session can change code but can't read or write the Sheet.
- **Its setup script** runs `npm ci` and installs PyMuPDF. It hasn't run in a fresh session yet.

## Never from the cloud

- Don't paste `.env` contents, keys or the family password into a chat or a commit. Set them in the
  dashboard that needs them (GitHub secrets, Vercel env, cloud environment settings).
- The repo is public: anything a cloud session commits is visible to everyone.
