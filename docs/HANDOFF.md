# Handoff — where things stand (2026-11-11)

Read this first when picking the project back up. Setup steps in full: [`SETUP.md`](SETUP.md).
Working away from the laptop: [`REMOTE.md`](REMOTE.md). The team: [`TEAM.md`](TEAM.md). The plan:
[`ROADMAP.md`](ROADMAP.md) (parity with the Grok team, recreatable, best in class). What we know:
[`knowledge/`](knowledge/README.md) and [`playbook.md`](playbook.md).

**2026-11-11: the team moved from Grok to Claude.** Grok is no longer used and its chat history is
gone. MM Core is intact (read 11-11); the Drive files weren't checked one by one. The eight roles are now Claude agents in `.claude/agents/`, run by `/sweep` in a Claude Code
session, and they write the Sheet through `npm run bot`, which enforces what each role may do. Built
and unit-tested; **not yet run against the live Sheet**, because cloud sessions don't have the keys
yet (Kyle — outstanding, 1).

**The same day the team took videograph's method** (Kyle's video repo): pictures come from fal.ai
(Nano Banana Pro and 2, with reference images) through `npm run bot -- illustrator image`, behind a
budget gate; art goes sheets → drafts → finals; files are checked for print specs before any review;
a Stop hook checks each agent's report against the Sheet; a critic writes lessons after each sweep;
and `docs/knowledge/` holds what is known, labelled and dated. The picture path is ported from code
that works in videograph but **has not made a picture here yet**: it needs `FAL_KEY` (2).

## How it fits together

```
The team ──npm run bot──▶ MM Core Sheet ◀──read/write── Backend (GitHub Actions, every 30 min)
(Claude agents, /sweep)
                          │
                          ▼ re-read every 60 s
            missmarilyn.vercel.app  (Kyle, Mom, family)
                          │
      Mom's approvals, page wording, messages ──▶ back into the Sheet
```

### How work moves now

A sweep is `/sweep` in a Claude Code session; the session dispatches the agents ([`TEAM.md`](TEAM.md)).
Nothing happens between sweeps except the backend tick. "Ring" in the older lessons now means "the
dispatcher starts that agent".

1. **Orchestrator** turns requests into tasks with full briefs, sends failed work back to `todo`,
   creates the next task in each book's chain and returns the list of tasks to dispatch.
2. **The maker** reads its knowledge files, works the task, uploads its files (print files are
   checked on upload), then runs its **self-check** (lesson L-0012) against its task type's list in
   `apps/backend/rubrics/`. Art goes in stages: character sheets, drafts of every page, then finals.
3. **Quality Checker** (role `quality_checker`) reviews while the task is still `in_progress`
   (L-0013): it logs `review pass:` or `review fail:` with numbered fixes and never changes statuses.
   `npm run bot -- <role> handin` refuses until the latest review of that round is a pass. After two
   fails the Orchestrator sends the task to Kyle (L-0014).
4. **Claude's QC** is the final gate, the last step of a sweep (the `qc` agent) or on its own: ask
   Claude to "run QC". `npm run qc` lists the queue with each maker's self-check line and the Quality
   Checker's latest verdict; Claude records pass or fail.
5. **The critic** ends a sweep: what failed, what it cost, what Kyle or Clara overruled → lessons,
   plus proposed entries for `docs/knowledge/` and the playbook.
6. **Mom** approves in the panel, in the step the work belongs to (Script, Illustrations, Building,
   Full book review). The next backend tick (:07 and :37) applies it: Approve → `approved` → `done`;
   Changes → `changes_requested` with her note; Reject → `cancelled`. Each change gets a log row.

## The board (2026-11-01, ~05:45 UTC)

Not re-read in full on 11-11. The `tasks` tab still ends at T-0039 (40 rows), so the 11-01 message
to the Orchestrator was never carried out: T-0026–T-0037 are still blocked and the rest of Book 1's
chain doesn't exist. `npm run bot -- kyle board` prints the current board once a session has the keys.

- **Book 1 = MM-B02 "Miss Marilyn Makes a Friend"**: Clara's playground story, `in_production`, P1,
  `series_no` 1. Kyle's brief with her story is request `Q-20261030020904-01` (in progress, on T-0023).
  - **T-0023 book plan** (Orchestrator): in progress, due 11-10.
  - **T-0038 story v2** (Kyle's rewrite brief: warmer, no "Hello first!" refrain): passed Claude's QC
    11-01 (about 270 words, story text on 15 pages, max spread 49, Achoo x3 with Gussie's echo, proud ending).
    `awaiting_mom` on her Script step (M-T-0038-1). p14 sets at 6 lines (style guide max 5): keep it short
    when she writes her words.
  - **T-0024 story v1**: `cancelled` 11-01, superseded by T-0038; its card M-T-0024-1 is closed.
  - **T-0025 character sheets**: done (passed on attempt 3).
  - **T-0039 full-book draft pictures**: done 11-01. All 24 pages are in `pages.art_asset_id`, so Clara sees
    pictures on the Books page; dummy PDF A-T0039-51. On-model and close to final. Minor: p16 has no tickle
    face before p17's ACHOO, p24 doodle in the outer 4%, p10 ink speckle.
  - **T-0026–T-0037 final page art**: `blocked` "waiting on Clara's approval of T-0024". Kyle decided 11-01 to
    start them now from the T-0039 drafts; the Orchestrator has to be told (see Kyle — outstanding).
  - Not created yet: cover art, interior layout, cover wrap, KDP packet.
  - Gussie is a dog, drawn from his photos: assets P-20261030-001/002 (MM Brand → photos → inbox → Gussie).
    Zoey isn't in this book.
- **Book 2 = MM-B01 "Flies to See Her Grandparents"**: `paused`, `series_no` 2. Every open task is
  `blocked` with "Book paused"; QC skips paused books. Its 32-page draft gets cut to 24 when it resumes.
  `npm run sim` uses a throwaway copy of it to test the whole flow after the script (see Code).
- **Ollie (OL-B01)**: archived. Product and SKUs `retired`, every task `cancelled`, requests closed.
  Rows and Drive files are kept; the panel and the bots ignore it.
- **Open question for Mom:** the author name (request R-0003). It only blocks the KDP packet.

## Rules the bots follow (all in the `lessons` tab)

Every brief (`npm run bot -- <role> brief <task>`) prints the active lessons that apply, so **rule
changes go in `lessons`** (`npm run lesson`), not in the agent files. Active: L-0001–L-0007 (Miss M art: red string, beauty mark,
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

**The team reads its reference docs from the repo:** `docs/brand/series-bible.md`,
`docs/brand/style-guide.md` and the checklists in `apps/backend/rubrics/`. MM Brand (Drive) holds copies
for Clara (*Miss Marilyn Series Bible*, *Style Guide*, *QC Checklists*), so **update the repo file
first, then the Doc**.
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
- **The team:** ten agents in `.claude/agents/` (the eight roles plus `qc` and `critic`), the `/sweep`
  skill, and `npm run bot` with the role rules in `apps/backend/src/lib/team.ts` and the budget and
  report gates in `lib/gates.ts`. Book specs, image models, prices and caps: `formats/picture-book.json`. The descriptions are current
  (one series, 24 pages), so the lessons no longer have to override them. Grok is gone: the bot Gmail
  (A02) isn't needed, and its Editor access to MM Core and MM Work can be removed.
- **QC is manual** (no `ANTHROPIC_API_KEY`). Automatic QC is built: adding the key as a GitHub secret
  (`gh secret set ANTHROPIC_API_KEY --repo kdh69/miss-marilyn-hq`) turns it on, capped at
  `daily_qc_cap_usd` ($5/day). Kyle chose the Quality Checker bot first.
- **Backend on GitHub Actions:** every 30 minutes from `main`. Uploads are the only red item, so the
  weekly backup step fails until the owner token is set.

## Kyle — outstanding, in order

1. **Give cloud sessions the Sheet key**, so the team can run from anywhere: in the cloud environment
   **miss-marilyn-hq** (made 11-11; it has the Sheet ID and the network list), add
   `GOOGLE_SERVICE_ACCOUNT_JSON` as an environment variable ([`REMOTE.md`](REMOTE.md)), and start this
   repo's sessions on that environment. On the laptop the team already works: `.env` has them. Then the first
   check is `npm run bot -- kyle board`, and the first sweep is `/sweep`.
2. **Connect the image model:** put the fal.ai key videograph uses in `.env` as `FAL_KEY`, and in the
   cloud environment as a network secret for `queue.fal.run` (`TEAM.md`, Pictures). Kyle approved a
   $3 cap for the first pictures (roadmap L3). Final page art
   (T-0026–T-0037) and the cover wait on this. The first art task is the first live test of `image`:
   run it with a small cap and look at what comes back. Planning prices: draft $0.08, sheet $0.15,
   print page $0.30, so Book 1's 24 finals are about $7 if each lands first time. Check fal's
   dashboard after it; the costs rows are estimates.
3. **Uploads:** Google Cloud → OAuth consent screen → **Publish app**, then `npm run google:authorize`
   and sign in as the owner of *Miss Marilyn Business*. Save `GOOGLE_OWNER_REFRESH_TOKEN` to `.env`,
   GitHub secrets, Vercel and the cloud environment (with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`).
   The team's `upload` needs it: every hand-in is a file in Drive. Until then a maker creates each file
   through the Google Drive connector and registers it (`npm run bot -- <role> asset`).
4. **Give the Orchestrator the 11-01 decisions** (the message is in the 2026-11-01 decision below): put
   it in the panel's Inbox box (*Instruction for the bots…*) or say it to the session before `/sweep`.
   Its art part waits on 2; the rest of Book 1's chain can be created now.
5. **Schedule the sweep** once 1 is done and this work is on `main`: a Claude scheduled task that runs
   `/sweep` at 9am and 6pm New York. Until then, `/sweep` after Mom answers things.
6. **Scout:** "ask Scout about comparable friendship / playground picture books" (Book 1's research).
7. **Zoey's photos** (for later books): upload to MM Brand → photos → inbox → Zoey.
8. **Create a private GitHub repo for the nightly Sheet backup** (roadmap R2) and tell Claude its name;
   until the owner token is set the weekly Drive backup fails, so the Sheet has no backup at all.
   On the laptop today: `npm run backup -- ../mm-backup`.
9. Remove the bot Gmail's access to MM Core and MM Work, and mark A02 `not_needed` and A09 as Claude
   on the panel's Accounts page (the live tab isn't re-seeded).
10. Delete the service account key file from Downloads (its copies live in `.env` and the secrets).
11. **Later:** Resend + a verified brand domain (`RESEND_API_KEY`, `NOTIFY_FROM`); a password manager
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

- **2026-11-11 (roadmap):** [`ROADMAP.md`](ROADMAP.md) is the plan of record: the full Grok team back,
  recreatable on other tools, then best in class. Sheet backups go to a private GitHub repo; character
  images live in Drive with a manifest here; both reviews stay until Book 1's numbers are in. Built
  the same day: `AGENTS.md`, `npm run team:export`, `npm run backup` / `restore` (not yet run live),
  a recipe beside every picture. Merged to `main`.
- **2026-11-11 (later):** the team works the way videograph does: a gate before every paid call,
  cheap stages before expensive ones, checks in code before any review, the Sheet over an agent's
  word, and a critic plus a dated knowledge library so each sweep leaves the next one better. Images:
  Nano Banana Pro / 2 through fal.ai, 3 attempts a picture, $6 a task, the existing daily cap.
- **2026-11-11:** the team runs on Claude. Roles are agents in `.claude/agents/`; a sweep is `/sweep`
  in a Claude Code session; the Sheet is written only through `npm run bot`, which checks each role's
  rights, mints IDs, stamps times and writes log rows (so a log row can't be overwritten and a hand-in
  can't skip the review). Claude runs on Kyle's subscription, so only paid calls (images) get costs
  rows; `daily_bot_cap_usd` caps those. The Quality Checker review and Claude's QC are both kept.

- **2026-11-01 (later):** listing and marketing join the flow. The Grok bots write everything (Lister:
  every store field in the listings row; Marketer: a marketing plan per book in the `plans` tab, then a
  week of posts at a time in `content`); Clara posts by hand from the panel. Platforms: Instagram,
  Facebook, Pinterest, TikTok; the plan sets the pace (about 15 minutes a day for Clara). The backend's
  autopilot asks for the plan at Building and for the next week of posts (`config!social_autopilot`).

- **2026-11-01:** T-0038 (story v2) replaces T-0024. Final page art starts now from the T-0039 drafts instead
  of waiting for Clara's script approval; a page whose story beat she changes gets redrawn. Message for the
  Orchestrator: *"Book 1, Kyle 11-01: T-0038 passed QC and is on Clara's Script step; T-0024 is cancelled
  (superseded); T-0039 is done. Start the final page art now: move T-0026–T-0037 to todo and add to each
  brief: start from the T-0039 draft for these pages (pages.art_asset_id), keep the composition, re-check
  the T-0025 rules and the full spec, and fix p16 (Gussie's tickle face before p17's ACHOO), the p24 doodle
  in the outer 4% and the p10 ink speckle. Also create the rest of the chain with full briefs: art_cover
  (Illustrator), interior_layout (Builder; prints pages.text_final only, so it starts when Clara approves
  the script), cover_wrap (Builder, 24 pages) and kdp_packet (Publisher; author name still open, R-0003).
  Tell Clara (R-0004) the new version is ready on her Script step. Log rows are append-only: never edit
  or overwrite an existing log row."*

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

- **From videograph, not built yet:** a format per product (one `formats/picture-book.json` serves
  every book for now); a second image vendor as fallback (GPT Image 2 there); sweeps that run in
  GitHub Actions instead of a Claude session; a project `.claude/settings.json` (Kyle adds it, see
  `TEAM.md`).
- **Launch (step 6) and Social** are built: `/launch` shows each listing field by field with Copy
  buttons, the files, how to post and *It's live*; `/social` shows today's posts ready to paste, how to
  post on each platform, *Posted*, the week ahead, approvals and the marketing plan. Marks are `requests`
  notes ("Posted C-0012 <link>", "Live <listing_id> <link>"); the backend's marketing job applies them.
  Bot rules for it: lessons L-0017–L-0020 (Orchestrator, Lister, marketing_plan, social_batch).
- **`npm run sim`** takes a copy of Book 2 through every step after the script with the real backend jobs
  and cleans up (Actions job `sim`; `--keep` to click through it in the panel, `--clean` to remove).
  Run it after any change to the backend flow. It doesn't cover the bots or Drive uploads. Since
  11-01 it continues past the final OK: listing live, marketing plan, a week of posts, one posted.
  First live run 2026-11-01 06:06 UTC: all checks green in ~4 min (Core paces itself to 50 Sheets
  calls a minute), 183 SIM rows removed.
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
- **A Grok bot overwrote a log row** on 10-31 (the Quality Checker's 03:00 fail on T-0039 became the
  Illustrator's self-check, row A181). `npm run bot` only ever appends to the log.
- **Grok-era log rows can be wrong** (made-up from-states and timestamps before L-0015). Trust the task
  row's `status` over the log when they disagree. Rows written through `npm run bot` carry the real ones.
- **Input paths like `/home/box/agent-data/…`** in old briefs pointed into Grok's workspace, which is
  gone. Only what was uploaded to Drive (an `assets` row with a `file_url`) still exists.
- **`.mm-work/`** is where agents download and build files; git ignores it and a cloud session loses it.
- **`.vercelignore`** keeps `.env` and key files out of `vercel deploy` uploads.
- **Panel roles** come from `PANEL_USERS` (`email:mom`, `email:kyle`, `email:family:Name`) plus the
  family password. Every write in `apps/web/app/actions.ts` goes through `editor()`, which refuses family.
- **Sample data** in `apps/web/lib/sample.ts` is used only when the Sheet keys are missing.
- **Vercel project** `missmarilyn` (team *kdh69s-projects*) builds from `apps/web` and installs only the
  panel's own packages, so anything the panel build needs must be in `apps/web/package.json`.
- **Windows:** Python runs as `python`; KDP preflight uses the project `.venv`.
- **Kyle's laptop** has about 6 GB of RAM: `npm run typecheck` and `next build` can run out of memory.
  Let Vercel and GitHub CI do the full checks; typecheck the panel with `npx tsc --noEmit -p apps/web`.
