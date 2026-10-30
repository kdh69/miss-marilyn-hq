# Handoff — where things stand (2026-10-30, late night)

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

### How work moves now

1. **Orchestrator** turns a request into tasks and rings the owner. Bots act only when rung or swept;
   send `@Orchestrator sweep` after anything changes (nothing schedules sweeps yet).
2. **The maker** works the task, then runs its **self-check** (lesson L-0012) against its task type's
   list in the Drive doc *Miss Marilyn QC Checklists* (MM Brand).
3. **Quality Checker** (Grok bot, role `quality_checker`) reviews while the task is still `in_progress`
   (L-0013): it logs `review pass:` or `review fail:` with numbered fixes and never changes statuses.
   The maker fixes and re-rings until it passes, then sets `ready_for_qc`. The Orchestrator re-rings
   missed reviews and sends a task to Kyle after two Quality Checker fails (L-0014).
4. **Claude's QC** is the final gate: ask Claude to "run QC". `npm run qc` lists the queue with each
   bot's self-check line and the Quality Checker's latest verdict; Claude records pass or fail.
5. **Mom** approves in the panel, in the step the work belongs to (Script, Illustrations, Building,
   Full book review). The next backend tick (:07 and :37) applies it: Approve → `approved` → `done`;
   Changes → `changes_requested` with her note; Reject → `cancelled`. Each change gets a log row.

## The board (2026-10-30, ~03:40 UTC)

- **Book 1 = MM-B02 "Miss Marilyn Makes a Friend"**: Clara's playground story, `in_production`, P1,
  `series_no` 1. Kyle's brief with her story is request `Q-20261030020904-01` (in progress, on T-0023).
  - **T-0023 book plan** (Orchestrator): in progress, due 11-10.
  - **T-0024 story**: passed Claude's QC on attempt 2 (24 pages, 284 words, 49-word max spread,
    refrain "Hello first!", Achoo echo with Gussie). Now `awaiting_mom`: on her Script step to read and
    rewrite in her own words (`mom_queue` M-T-0024-1).
  - **T-0025 character sheets** (Illustrator): in the Quality Checker loop. Claude failed round 1 (Miss M's
    markings changed between views, no Mama/Papa expressions, lineup scale, 2-step sneeze); the Quality
    Checker has failed two rounds since with precise fixes. Gussie, Mama and Papa pass; Miss M's marking
    map, the lineup and the colour Doc are still being fixed. **Page art and the cover wait for T-0025.**
  - Gussie is a dog, drawn from his photos: assets P-20261030-001/002 (MM Brand → photos → inbox → Gussie).
    Zoey isn't in this book.
- **Book 2 = MM-B01 "Flies to See Her Grandparents"**: `paused`, `series_no` 2. Every open task is
  `blocked` with "Book paused"; QC skips paused books. Its 32-page draft gets cut to 24 when it resumes.
- **Ollie (OL-B01)**: archived. Product and SKUs `retired`, every task `cancelled`, requests closed.
  Rows and Drive files are kept; the panel and the bots ignore it.
- **Open question for Mom:** the author name (request R-0003). It only blocks the KDP packet.

## Rules the bots follow (all in the `lessons` tab)

Every bot reads `lessons` and the MM Brand docs at the start of each run, so **rule changes go in
`lessons`, not in Grok descriptions**. Active: L-0001–L-0007 (Miss M art: red string, beauty mark,
no humans, watercolor and ink, Mama cream/ginger, Papa gray tabby, ink layers), plus:

| Lesson | Rule |
|---|---|
| L-0008 | Book order: MM-B02 is Book 1; MM-B01 is Book 2 and paused; Ollie retired; one series |
| L-0009 | No work on paused or retired products; lowest `series_no` first |
| L-0010 | Every book is 24 pages: 10 story spreads, text on 11–15 pages, 250–400 words, <50 a spread |
| L-0011 | Side characters can be any animal; Zoey only when a brief or Clara's story includes her |
| L-0012 | Self-check against *Miss Marilyn QC Checklists* before `ready_for_qc`, and log it |
| L-0013 | Ring Quality Checker before `ready_for_qc`; hand in only after `review pass:` |
| L-0014 | Orchestrator re-rings missed reviews; two Quality Checker fails → ask Kyle |
| L-0015 | Log only real changes, with the real from_status and time |
| L-0016 | Fix every QC item in the task that failed; no follow-up tasks for leftover fixes |

**MM Brand (Drive) holds the bots' reference docs:** *Miss Marilyn Series Bible*, *Miss Marilyn Style
Guide* and *Miss Marilyn QC Checklists*, all Google Docs. They're copies of `docs/brand/series-bible.md`,
`docs/brand/style-guide.md` and `apps/backend/rubrics/`, so **update the repo file and the Doc together**.
Both Miss Marilyn products link the bible in `products.bible_url`.

## Setup state

- **Panel:** live at **https://missmarilyn.vercel.app** on real Sheet data, behind sign-in; `main`
  deploys production. Books are listed in series order with "Book N", paused books last and out of
  "what's next". Mom signs in with her personal Google account (in `PANEL_USERS`, role mom). Family:
  read-only behind `FAMILY_PASSWORD`. Layout per person: [`PANEL-PLAN.md`](PANEL-PLAN.md).
- **MM Core Sheet:** `sheet:setup` has run with the new `paused` product status and `quality_checker`
  role; `doctor` is green except uploads. Kyle's Google account owns *Miss Marilyn Business*; the
  service account and Clara's two Google accounts (personal, and the new Business Gmail, A01) are
  Editors on the whole folder; the bot Gmail is Editor on MM Core + MM Work and Viewer on MM Brand.
- **Accounts:** A01 Business Gmail is `in_progress` (Clara is setting it up; its address is in the
  accounts tab). It owns the stores and socials; register every later account with it.
- **Grok:** 7 production bots + Scout + **Quality Checker**. Quality Checker's description and the
  Orchestrator's one-line Quality Checker addition are pasted. Other bots still carry older descriptions
  (two series, 32 pages); the lessons override them. Re-paste from `bot-prompts.md` only if a bot slips.
- **QC is manual** (no `ANTHROPIC_API_KEY`). Automatic QC is built: adding the key as a GitHub secret
  (`gh secret set ANTHROPIC_API_KEY --repo kdh69/miss-marilyn-hq`) turns it on, capped at
  `daily_qc_cap_usd` ($5/day). Kyle chose the Quality Checker bot first.
- **Backend on GitHub Actions:** every 30 minutes from `main`. Uploads are the only red item, so the
  weekly backup step fails until the owner token is set.

## Kyle — outstanding, in order

1. **QC when work comes back:** ask Claude to "run QC" (or "status" to read the board). Next up: T-0025
   once the Quality Checker passes it.
2. **Orchestrator sweeps:** ask Grok whether the Orchestrator can sweep on a schedule (9am and 6pm New
   York). Until then, send `@Orchestrator sweep` after Mom answers things.
3. **Uploads:** Google Cloud → OAuth consent screen → **Publish app**, then `npm run google:authorize`
   and sign in as the owner of *Miss Marilyn Business*. Save `GOOGLE_OWNER_REFRESH_TOKEN` to `.env`,
   GitHub secrets and Vercel, then redeploy. Until then drop photos in Drive (MM Brand → photos → inbox)
   and ask Claude to register them as `assets`.
4. **Zoey's photos** (for later books): upload to MM Brand → photos → inbox → Zoey.
5. Rename the Grok room from "Coloring Books For Kids" to "Miss Marilyn HQ". Send Scout the Book 1
   research topic (comparable friendship / playground picture books).
6. Delete the service account key file from Downloads (its copies live in `.env` and the secrets).
7. **Later:** Resend + a verified brand domain (`RESEND_API_KEY`, `NOTIFY_FROM`); a password manager
   (Bitwarden's free plan covers two people); `ANTHROPIC_API_KEY` for automatic QC.

## Mom — outstanding

- **Read Book 1 on the Script step and rewrite each page in her own words**, then approve it. Builder
  prints only her words (`text_final`).
- **Pick the author name** (pen name or real name). It blocks Book 1's KDP packet.
- **Finish the Business Gmail** (A01), then use it for KDP, Etsy, Meta, Pinterest and the email tool.
- **Miss M material:** 15–20 photos and 2–3 videos; the rescue story, one real fact and a quirk for
  the "Meet the Real Miss Marilyn" page; whether she wants a dedication.
- **Business setup:** LLC + EIN, business bank account and card, brand domain.

## Decisions

- **2026-10-30:** Ollie archived. Clara's playground story is Book 1 (MM-B02); the flying book is Book 2
  (MM-B01), paused. Product IDs don't change; `series_no` is the book number.
- **2026-10-30:** every book is 24 pages (KDP's minimum), 10 story spreads, story text on 11–15 pages.
- **2026-10-30:** side characters can be any animal (Gussie is a dog). Zoey isn't in every book.
- **2026-10-30:** bots self-check, then the Quality Checker reviews, before Claude's QC.
- **2026-10-29:** QC stays manual through Kyle's Claude subscription. Bot costs are Kyle's only. Family
  gets a read-only view behind a shared password.
- **2026-10-29:** coloring versions aren't a product yet; later each book gets a free coloring PDF
  through a QR code / link page that collects the parent's email. Illustrator saves ink line layers now.
- Bots upload every source file to Drive and label everything they make `rights_source=AI`.
- Mom's `text_final` rule covers book interiors and cover wraps only; printables take their wording
  from the brief and need only QC-passed art.

## Code — next up

- Verify the panel on a phone with real data, signed in as each role. First real saves to try: a
  page's words (Script), a picture approval (Illustrations), a page approval (Building).
- Book progress counts tasks per product, so a book with few tasks can look further along than it is.
- **Photos dropped straight into Drive** → register them as `assets` automatically (done by hand for Gussie).
- **Etsy publish** once API access is approved (stub in `apps/backend/src/jobs/etsyPublish.ts`).
- **Money tab imports:** KDP royalty report + Etsy sales CSV → `transactions`.

## Things to know

- **Public repo:** keeps GitHub Actions free, but GitHub pauses scheduled workflows after 60 days with
  no commits, and the Sheet ID is visible in `.env.example`, so keep the Sheet's General access on
  **Restricted**. Never commit `.env`, emails other than commit metadata, or the family password.
- **Bot log rows can be wrong** (made-up from-states and timestamps before L-0015). Trust the task row's
  `status` over the log when they disagree.
- **`.vercelignore`** keeps `.env` and key files out of `vercel deploy` uploads.
- **Panel roles** come from `PANEL_USERS` (`email:mom`, `email:kyle`, `email:family:Name`) plus the
  family password. Every write in `apps/web/app/actions.ts` goes through `editor()`, which refuses family.
- **Sample data** in `apps/web/lib/sample.ts` is used only when the Sheet keys are missing.
- **Vercel project** `missmarilyn` (team *kdh69s-projects*) builds from `apps/web` and installs only the
  panel's own packages, so anything the panel build needs must be in `apps/web/package.json`.
- **Windows:** Python runs as `python`; KDP preflight uses the project `.venv`.
- **Kyle's laptop** has about 6 GB of RAM: `npm run typecheck` and `next build` can run out of memory.
  Let Vercel and GitHub CI do the full checks; typecheck the panel with `npx tsc --noEmit -p apps/web`.
