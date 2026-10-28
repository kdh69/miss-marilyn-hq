# Handoff — where things stand (2026-10-27)

Read this first when picking the project back up. Setup steps in full: [`SETUP.md`](SETUP.md).
Live checklist: [Launch Checklist](https://claude.ai/artifact/FzUU8wZjrWifR9sv6Ejrpy).

## State right now

- **Code:** all checks pass (typecheck, 100 tests, 5 KDP preflight tests). Nothing is connected yet.
- **Panel:** live at **https://missmarilyn.vercel.app**, in **preview mode**: sample data, open to
  anyone with the link, nothing saves. The sidebar's *Preview as Clara / Kyle* switch flips views.
- **MM Core Sheet:** not built yet (`npm run sheet:setup` needs the Google keys).
- **Backend on GitHub Actions:** skips every run until the secrets are set.
- **Grok bots:** not tested against the Sheet yet. The Grok row test is the biggest unknown.

## Kyle — outstanding, in order

1. **Bot Gmail**: create it, turn on 2-step. In Grok → Connect apps, disconnect personal Gmail and
   connect Gmail + Drive with the bot account. Then put it in the Sheet's `config` → `bot_account_email`.
2. **Google Cloud** (project *Miss Marilyn HQ*, Clara's business Gmail as owner):
   enable the Sheets and Drive APIs; create service account `mm-backend` + JSON key; OAuth consent
   screen (External, Clara and Kyle as test users); OAuth client ID (Web) with redirect URIs
   `https://missmarilyn.vercel.app/api/auth/callback/google` and `http://localhost:5179/oauth2callback`.
3. **Share Drive**: *Miss Marilyn Business* + MM Core → service account (Editor);
   MM Core + MM Work → bot Gmail (Editor); MM Brand → bot Gmail (Viewer).
4. **Local `.env`** (already created from `.env.example`): fill `GOOGLE_SERVICE_ACCOUNT_JSON`,
   `ANTHROPIC_API_KEY` (set a $20/month limit in the Anthropic console), `KYLE_EMAIL`.
   Then `npm run sheet:setup` and `npm run doctor` until green.
5. **Grok row test**: paste the prompt from SETUP.md §4 into the Orchestrator. If columns shift or
   rows can't be appended, stop and build the bot API fallback.
6. **GitHub secrets**: `GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`, `ANTHROPIC_API_KEY`,
   `KYLE_EMAIL` (optional ones in SETUP.md §5). Then Actions → *MM backend tick* → `doctor`, then `dryrun`.
7. **Vercel env**: add sign-in **first or together with** the Sheet keys — `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, `PANEL_USERS`, then `GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`.
   (Sheet keys without sign-in would put real data on a public page.) Sign in as yourself and as Clara.
8. **Connect Vercel to GitHub** (project → Settings → Git) so pushes to `main` deploy automatically.
   Today's deploy was made from a local folder with `vercel deploy --prod`.
9. **Later**: Resend + verified brand domain (`RESEND_API_KEY`, `NOTIFY_FROM`); paste the 7 prompts
   from [`bot-prompts.md`](bot-prompts.md) into Grok; check whether Grok can schedule the Orchestrator.

## Clara — outstanding

- **First, because it blocks the most:** pick the pen name. The KDP packet and the Etsy shop name both wait on it.
- **Accounts:** business Gmail with 2-step; a password manager shared with Kyle.
- **Photos:** 15–20 photos and 2–3 videos of Miss M, uploaded through the panel once sign-in works.
- **Business setup:** LLC + EIN, a business bank account and card, the brand domain.
- **Selling accounts:** Amazon KDP, Etsy shop, the Etsy developer app, Meta Business Suite, Pinterest,
  an email list tool.
- **Brand docs:** approve [`brand/series-bible.md`](brand/series-bible.md) and
  [`brand/style-guide.md`](brand/style-guide.md), which then go into MM Brand.

## Code — next up

- **Panel → real data.** The UI is built against the real schema. Once the Sheet and sign-in are
  connected, check each page against real rows. Known spots:
  - Book progress counts tasks per product, so a book with only a few tasks can look further along
    than it is.
  - The *Ask the team to make this* button on Trends writes an `idea` request to the Orchestrator;
    the Orchestrator prompt needs to handle it.
  - Nobody has reviewed the redesigned pages on a phone yet.
- **Bot API fallback**, only if the Grok row test fails.
- **Etsy publish**, once API access is approved (stub in `apps/backend/src/jobs/etsyPublish.ts`).
- **Money tab imports:** KDP royalty report + Etsy sales CSV → `transactions`.
- **Photos dropped straight into Drive** (not via the panel) → register them as `assets`.

## Things to know

- **Public repo:** keeps GitHub Actions free, but:
  - GitHub pauses scheduled workflows after 60 days with no commits.
  - The MM Core Sheet ID is visible in `.env.example`, so keep the Sheet's General access on **Restricted**.
- **Sample data** lives in `apps/web/lib/sample.ts`. The panel uses it whenever the Sheet keys are
  missing.
- **Preview mode** is on while `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` or `AUTH_SECRET` is missing.
  The preview switch only sets a cookie; every save is refused without a real sign-in.
- **Vercel project** `missmarilyn` (team *kdh69s-projects*) builds from `apps/web`. `AUTH_SECRET` is
  already set for production. Vercel installs only the panel's own packages, so anything the panel
  build needs must be listed in `apps/web/package.json`, not just the root.
- **Windows:** Python runs as `python`, not `python3`. Scripts pick the right one, and `PYTHON` in
  `.env` overrides it. KDP preflight uses the project `.venv` because the main Python needs admin
  rights to install packages.
- **Kyle's laptop** has about 6 GB of RAM. `next build` and `next dev` can run out of memory with
  other apps open; close Chrome tabs first, or let Vercel do the build.
