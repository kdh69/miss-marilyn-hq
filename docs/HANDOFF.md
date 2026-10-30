# Handoff — where things stand (2026-10-30, evening)

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

### How an approval moves

1. **Mom clicks** Approve / Changes / Reject on her Today list → saved to `mom_queue` instantly.
2. **Next backend tick** (:07 and :37 past each hour) applies it: Approve → `approved` → `done` (nothing
   to publish yet); Changes → `changes_requested` with her note (Changes waits until she types one);
   Reject → `cancelled`. Each change gets a log row.
3. **The bots react only when the Orchestrator sweeps.** Grok bots don't watch the Sheet. On a sweep the
   Orchestrator sends `changes_requested` work back to its owner and creates the next task after a `done`.
   Nothing schedules sweeps yet, so send `@Orchestrator sweep` (or set up Grok scheduling, step 2 below).

## State right now

- **Panel:** live at **https://missmarilyn.vercel.app** on real Sheet data, behind sign-in.
  - Kyle and Mom: *Continue with Google* (emails in `PANEL_USERS`). Mom never sees costs: her Money tab
    shows sales only. Layout and tabs per person: [`PANEL-PLAN.md`](PANEL-PLAN.md).
  - Family: shared password (`FAMILY_PASSWORD` in `.env` and Vercel) opens a read-only view: no
    Money, Accounts, Ideas, To-do or messages, no saving (tabs: Overview, Books, Progress). Changing the
    password signs every family browser out.
  - Kyle's sidebar (or the avatar on a phone) has *Viewing as: Clara / Kyle* to see exactly what Mom sees.
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

### The board (after the book reorder, 2026-10-30)

- **Book 1 = MM-B02 "Miss Marilyn Makes a Friend"**, Clara's playground story, `in_production`, P1.
  Kyle's brief for the Orchestrator (her story plus the corrections) is the `kyle → orchestrator` idea
  in `requests`; the Orchestrator turns it into book_plan → story_draft → character sheets → art.
  Gussie is a dog (black-and-tan, photos in MM Brand → photos → inbox); the bible has his entry.
- **Book 1 progress (night of 2026-10-30):** T-0023 book plan (Orchestrator, in progress);
  T-0024 story passed QC on attempt 2 and is `awaiting_mom` on her Script step (rewrite in her words);
  T-0025 character sheets in the Quality Checker loop (Gussie redrawn from his photos and passing;
  Miss M's markings, the lineup scale and the colour Doc still being fixed). Page art and cover wait for T-0025.
  Gussie's photos are assets P-20261030-001/002 (MM Brand → photos → inbox → Gussie).
- **Book 2 = MM-B01 "Flies to See Her Grandparents"**, `paused`, `series_no` 2. Every open task is
  `blocked` with "Book paused"; QC skips paused books. Its 32-page draft gets cut to 24 when it resumes.
  The Miss M / Mama / Papa character sheets in T-0012 carry over into Book 1.
- **Ollie (OL-B01) is archived:** product and SKUs `retired`, all its tasks `cancelled`, its requests
  closed. Rows and Drive files are kept; the panel and the bots ignore it.
- **Quality Checker** (Grok bot, role `quality_checker`, description in `bot-prompts.md`) reviews work
  before it reaches Claude's QC (lessons L-0013/L-0014): the maker rings it while the task is still
  in_progress, it logs `review pass:` or `review fail:` and never changes statuses. `npm run qc` shows
  its latest verdict. Claude's QC stays the final gate.
- **Bots self-check before QC** (lesson L-0012): each bot runs its task type's list in the Drive doc
  *Miss Marilyn QC Checklists* (MM Brand) and logs `self-check passed: …` when it sets ready_for_qc;
  `npm run qc` prints that line. The doc copies `apps/backend/rubrics/`, so update both together.
  New team rules live in `lessons` (L-0008–L-0016; L-0015 honest log rows, L-0016 all QC fixes in the same task), which every bot reads each run, so Grok
  descriptions don't need re-pasting for rule changes. MM Brand also holds the series bible and style guide as Docs.
- **Every book is 24 pages now** (KDP's minimum): 10 story spreads, story text on 11–15 pages, under
  50 words a spread. Series bible §3, the story rubric and the Producer prompt say so.
- **Marketing and Etsy** for Book 2 stay blocked with it.

## Kyle — outstanding, in order

Done 2026-10-30: merged `panel-preview` into `main` (#9, #10), set the GitHub secrets, ran `doctor`
and `dryrun` on Actions, connected Vercel to GitHub, passed the QC results back to the Orchestrator.

1. **QC when work comes back:** ask Claude to "run QC" (or "status" to read the board).
2. **Orchestrator sweeps:** ask Grok whether the Orchestrator can sweep on a schedule (9am and 6pm New
   York). Until then, send `@Orchestrator sweep` after Mom answers things.
3. **Uploads:** Google Cloud → OAuth consent screen → **Publish app**, then `npm run google:authorize`
   (laptop) and sign in as the owner of *Miss Marilyn Business*. Save `GOOGLE_OWNER_REFRESH_TOKEN` to
   `.env`, GitHub secrets and Vercel, then redeploy. Until then the panel's photo upload shows a
   friendly "not switched on yet" message; drop photos in Drive under MM Brand → photos instead.
4. **Grok:** paste each bot's new description from [`bot-prompts.md`](bot-prompts.md) (house rules + role;
   changed 2026-10-30: one series, book order by `series_no`, no work on paused/retired books, 24 pages),
   and upload `docs/brand/series-bible.md` and `style-guide.md` to **MM Brand** (it has only `photos/`,
   and the bots are told to read them there). Rename the room from "Coloring Books For Kids" to
   "Miss Marilyn HQ". Send Scout the story-plus-coloring research topic.
5. Delete the service account key file from Downloads (its copies live in `.env` and the secrets).
6. **Later:** Resend + a verified brand domain (`RESEND_API_KEY`, `NOTIFY_FROM`); a password manager
   (Bitwarden's free plan covers two people).

## Mom — outstanding

- **Pick the author name** (pen name or real name). It blocks Book 1's KDP packet.
- **Rewrite each page in her own words** in the panel's **Script** step (the whole script, page by page), then approve it. Builder prints only her words
  (`text_final`). Book 1's pages come once the Producer drafts them.
- **Miss M material:** 15–20 photos and 2–3 videos; the rescue story and
  dedication for the "Meet the Real Miss Marilyn" page.
- **Business setup:** LLC + EIN, business bank account and card, brand domain; then KDP, Etsy,
  Meta Business Suite, Pinterest and an email list tool.

## Decisions made on 2026-10-29

- QC stays manual for now, through Kyle's Claude subscription (no API key).
- Bot costs are Kyle's only. Family gets a read-only view behind a shared password.
- Coloring versions: **not a product yet.** When they happen, each book gets a free coloring PDF
  ("Color & Tell Your Own Story") through a QR code / link page at the back of the book that collects
  the parent's email. No coloring SKUs and no new format. Illustrator saves ink line layers now so it's ready.
- Bots upload every source file to Drive (the Oct 28 reset lost files kept only
  locally), and label everything they make `rights_source=AI`.
- Miss Marilyn art: watercolor and ink, beauty mark on every page, no humans, red string (never a yarn
  ball), Mama cream/ginger, Papa gray tabby. These are in the `lessons` tab.
- 2026-10-30: Ollie archived; Clara's playground story is Book 1 (MM-B02); the flying book is Book 2 (MM-B01), paused.
  Product IDs don't change; `series_no` is the book number. Every book is 24 pages.
- Mom's `text_final` rule covers book interiors and cover wraps only. Printables take their wording from
  the brief and need only QC-passed art.

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
