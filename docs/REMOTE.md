# Working away from the laptop

Three ways to work, from most to least capable:

1. **Remote Control:** drive the Claude session running on the laptop from your phone. Needs the
   laptop on, awake and the Claude app open. Everything below works, because it *is* the laptop.
2. **A cloud Claude Code session** (claude.ai/code): Claude works on a fresh copy of the GitHub repo
   in Anthropic's cloud. It has no `.env`, no Vercel login and no browser of yours.
3. **Just your phone:** the web dashboards (panel, Grok, Google, GitHub, Vercel).

## What works where

| Task | Phone only | Cloud Claude session | Needs the laptop |
|---|---|---|---|
| Use the panel, approve, message the bots | ✅ | | |
| Talk to Grok bots, paste descriptions | ✅ | | |
| Look at or edit the Sheet and Drive | ✅ | | |
| Run the backend (`doctor`, `dryrun`, a tick) | ✅ GitHub → Actions → Run workflow | | |
| Change GitHub secrets / Vercel env vars | ✅ their web dashboards | | |
| Redeploy the panel as it is | ✅ Vercel dashboard → Redeploy | | |
| Change code, run typecheck and tests, push, open a PR | | ✅ | |
| Deploy a code change to the panel | | ✅ once Vercel is connected to GitHub: merge to `main` | until then: `vercel deploy --prod` |
| Run QC (`npm run qc`), peek at the Sheet, `sheet:setup`, `doctor` locally | | ⚠️ only with Sheet keys set up (below) | ✅ |
| `npm run google:authorize` (uploads token) | | ❌ | ✅ (the callback is `localhost`) |
| Anything using `.env` values | | ⚠️ only what you add to the cloud environment | ✅ |

## Making cloud sessions useful

- **Connect Vercel to GitHub first** (HANDOFF step 3). Then a cloud session can ship panel changes:
  it pushes a branch, Vercel builds a preview, and merging the PR to `main` deploys production.
- **Run the backend from GitHub** (HANDOFF steps 1–2). The every-30-minutes tick then needs no laptop at
  all, and you can trigger `doctor` or `dryrun` from the GitHub app.
- **For QC from a cloud session**, add `GOOGLE_SERVICE_ACCOUNT_JSON` and `MM_CORE_SHEET_ID` as secret
  environment variables in that cloud environment's settings, and make sure its network access allows
  Google's APIs (`googleapis.com`, `oauth2.googleapis.com`). Then "run QC" works the same as on the laptop.
  Without them, a cloud session can change code but can't read or write the Sheet.

## Never from the cloud

- Don't paste `.env` contents, keys or the family password into a chat or a commit. Set them in the
  dashboard that needs them (GitHub secrets, Vercel env, cloud environment settings).
- The repo is public: anything a cloud session commits is visible to everyone.
