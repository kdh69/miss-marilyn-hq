# Handoff — where things stand (2026-10-29, evening)

Read this first when picking the project back up. Setup steps in full: [`SETUP.md`](SETUP.md).
Working away from the laptop: [`REMOTE.md`](REMOTE.md). Bot descriptions: [`bot-prompts.md`](bot-prompts.md).

## How it fits together

```
Grok bots ──write──▶ MM Core Sheet ◀──read/write── Backend (GitHub Actions, every 30 min)
                          │
                          ▼ re-read every 60 s
            missmarilyn.vercel.app  (Kyle, Mom, family)
                          │
      Mom's approvals, page wording, messages ──▶ back into the Sheet
```

Claude (in Claude Code) runs QC by hand with `npm run qc` and fixes the plumbing.

## State right now

- **Panel:** live at **https://missmarilyn.vercel.app** on real Sheet data, behind sign-in.
  - Kyle and Mom: *Continue with Google* (emails in `PANEL_USERS`). Mom never sees costs or the Money tab.
  - Family: shared password (`FAMILY_PASSWORD` in `.env` and Vercel) opens a read-only view: no
    Money, Accounts or Messages, no saving. Changing the password signs every family browser out.
  - Vercel is connected to GitHub: merging to `main` deploys production; other branches get previews.
- **MM Core Sheet:** built and shared with the service account (Editor on *Miss Marilyn Business*) and the
  bot Gmail (Editor on MM Core + MM Work, Viewer on MM Brand). `npm run doctor` is green except uploads.
- **Google Cloud:** project `miss-marilyn-513120` under a plain Gmail (an organization blocked service
  account keys on the first try). Service account key and OAuth client are in `.env` and Vercel.
- **Grok:** connected with the bot Gmail; the row test passed. The bots synced both books into the Sheet.
  Grok names map to Sheet roles: Producer=`story_producer`, Lister=`publisher`, Marketer=`growth`.
- **QC is manual** (no `ANTHROPIC_API_KEY`): the backend leaves work at `ready_for_qc` and Kyle reviews
  with Claude. Adding a key later turns automatic QC back on.
- **Backend on GitHub Actions:** live since 2026-10-30, every 30 minutes from `main`. Secrets set:
  `GOOGLE_SERVICE_ACCOUNT_JSON`, `MM_CORE_SHEET_ID`, `KYLE_EMAIL`, `CLARA_EMAIL`, `PANEL_URL`.
  `doctor` and `dryrun` both pass on Actions. Uploads are the only red item, so the weekly backup step
  fails (and GitHub emails Kyle) until the owner token is set.

### The board after today's QC

- **Passed, waiting on Mom:** T-0003 Ollie front cover (on her Today list to approve).
- **Failed, back to the bots** (notes in each task's `qc_notes`):
  - T-0013 Miss M cover: yarn ball instead of red string, no nose beauty mark, propeller plane, Mama too orange.
  - T-0001 Ollie story: no `art_brief`/`characters` on any page, brave pebble/pocket continuity, p31 notes missing.
  - T-0006 / T-0016 KDP packets: missing AI-content answers, ISBN, trim, bleed, paper, file links.
  - T-0007 / T-0017 Etsy listings: bundle files not made yet, no page count; T-0017 title is 165 chars.
- **Blocked:** the Ollie interior art and print files (T-0002, T-0004, T-0005). The art was lost in an
  Oct 28 reset; only low-res Oct 24 PDFs survive, in Kyle's Orchestrator chat. Probably a redraw.
- **In progress:** Miss M character sheets and redraw (T-0012), Miss M story (T-0011), interior (T-0014).

## Kyle — outstanding, in order

Done 2026-10-30: merged `panel-preview` into `main` (#9), set the GitHub secrets, ran `doctor` and
`dryrun` on Actions, connected Vercel to GitHub.

1. **Pass the QC results back:** send the Orchestrator the QC hand-back (failed tasks back to todo with
   fixes, printable_set tasks for both bundles, MM-B01-PB price, Miss M lessons).
2. **Uploads:** Google Cloud → OAuth consent screen → **Publish app**, then `npm run google:authorize`
   (laptop) and sign in as the owner of *Miss Marilyn Business*. Save `GOOGLE_OWNER_REFRESH_TOKEN` to
   `.env`, GitHub secrets and Vercel, then redeploy. Until then the panel's photo upload shows a
   friendly "not switched on yet" message; drop photos in Drive under MM Brand → photos instead.
3. **Grok:** paste each bot's new description from [`bot-prompts.md`](bot-prompts.md) (house rules + role),
   and rename the room from "Coloring Books For Kids" to "Miss Marilyn HQ". Send Scout the
   story-plus-coloring research topic.
4. **Ollie art:** attach the Oct 24 Ollie PDFs in the Orchestrator chat, then decide recover vs. redraw.
5. Delete the service account key file from Downloads (its copies live in `.env` and the secrets).
6. **Later:** Resend + a verified brand domain (`RESEND_API_KEY`, `NOTIFY_FROM`); a password manager
   (Bitwarden's free plan covers two people); whether Grok can schedule the Orchestrator's sweeps.

## Mom — outstanding

- **Pick the author name** (pen name or real name). It blocks the Ollie upload and both KDP packets.
- **Rewrite each page in her own words** on the panel's Books page. Builder prints only her words
  (`text_final`); both books have none yet.
- **Approve the Ollie cover** on her Today list.
- **Miss M material:** 15–20 photos and 2–3 videos; Zoey's photos and description; the rescue story and
  dedication for the "Meet the Real Miss Marilyn" page.
- **Business setup:** LLC + EIN, business bank account and card, brand domain; then KDP, Etsy,
  Meta Business Suite, Pinterest and an email list tool.

## Decisions made on 2026-10-29

- QC stays manual for now, through Kyle's Claude subscription (no API key).
- Bot costs are Kyle's only. Family gets a read-only view behind a shared password.
- Coloring versions: **not a product yet.** When they happen, each book gets a free coloring PDF
  ("Color & Tell Your Own Story") through a QR code / link page at the back of the book that collects
  the parent's email. No coloring SKUs and no new format. Illustrator saves ink line layers now so it's ready.
- Bots work on both series, upload every source file to Drive (the Oct 28 reset lost files kept only
  locally), and label everything they make `rights_source=AI`.
- Miss Marilyn art: watercolor and ink, beauty mark on every page, no humans, red string (never a yarn
  ball), Mama cream/ginger, Papa gray tabby. These belong in the `lessons` tab; check the Orchestrator wrote them.

## Code — next up

- Verify the panel on a phone with real data, signed in as each role.
- Book progress counts tasks per product, so a book with few tasks can look further along than it is.
- **Etsy publish** once API access is approved (stub in `apps/backend/src/jobs/etsyPublish.ts`).
- **Money tab imports:** KDP royalty report + Etsy sales CSV → `transactions`.
- **Photos dropped straight into Drive** (not via the panel) → register them as `assets`.

## Things to know

- **Public repo:** keeps GitHub Actions free, but GitHub pauses scheduled workflows after 60 days with
  no commits, and the Sheet ID is visible in `.env.example`, so keep the Sheet's General access on
  **Restricted**. Never commit `.env`, emails other than commit metadata, or the family password.
- **`.vercelignore`** keeps `.env` and key files out of `vercel deploy` uploads.
- **Panel roles** come from `PANEL_USERS` (`email:mom`, `email:kyle`, `email:family:Name`) plus the
  family password. Every write in `apps/web/app/actions.ts` goes through `editor()`, which refuses family.
- **Sample data** in `apps/web/lib/sample.ts` is used only when the Sheet keys are missing.
- **Vercel project** `missmarilyn` (team *kdh69s-projects*) builds from `apps/web` and installs only the
  panel's own packages, so anything the panel build needs must be in `apps/web/package.json`.
- **Windows:** Python runs as `python`; KDP preflight uses the project `.venv`.
- **Kyle's laptop** has about 6 GB of RAM. Let Vercel do `next build`; typecheck locally with
  `npx tsc --noEmit -p apps/web`.
