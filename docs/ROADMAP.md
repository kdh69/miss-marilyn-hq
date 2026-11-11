# Roadmap: the full team back, recreatable, then best in class

Agreed with Kyle on 2026-11-11: the plan of record. Where things stand day to
day is [`HANDOFF.md`](HANDOFF.md); how the team works is [`TEAM.md`](TEAM.md).

**Spending rule:** every item that costs money needs Kyle's yes and a stated cap first.

**Specs:** the next eight pieces of work are written up one per file in [`specs/`](specs/README.md),
ready to hand to a session: hardening, the first live run, the panel starting the backend, backup and
the rebuild drill, the character library, shared generation code, the Miss Marilyn channel in
videograph, and the bridge between the two repos.

## The goal

1. **The full thing we had.** Every role, rule and habit of the Grok team, working on Claude.
2. **Recreatable across time and platform.** If Claude, fal, Google or GitHub cut us off tomorrow, the
   business stands again on other tools within a day, from files we hold. Losing Grok cost the chat
   history; the next loss should cost nothing.
3. **Best in class.** A repo that makes a print-ready picture book that is on-model on every page,
   right first time more often than not, at a known cost, and gets better with every book. The model
   is videograph: gates in code, cheap stages first, the record over the report, and a knowledge
   library fed by every run.

## 1. How close this is to the Grok team

| What the Grok setup gave us | On Claude | State |
|---|---|---|
| The bots (Orchestrator, Producer, Illustrator, Builder, Lister, Marketer, Quality Checker) and Scout, each with a pasted description | The same 8 roles as agents in `.claude/agents/`, plus `qc` and `critic`; descriptions are current (one series, 24 pages) and versioned | Built; not yet run on real tasks |
| House rules pasted in front of every description | `TEAM.md`, and enforced by `npm run bot` rather than trusted | Built; 129 tests |
| The group chat as doorbell ("@Role T-#### …"); Kyle sends `@Orchestrator sweep` | `/sweep`: the session starts each agent and carries results between them | Built. **Different:** no standing chat room; work happens during a sweep |
| Bots read and wrote MM Core through the bot Gmail | `npm run bot` through the service account | Built; needs the Sheet keys in the session; **not yet run live** |
| Bots uploaded files to Drive as the bot Gmail | `upload` as the folder owner | **Needs the owner token** (outstanding since October). Until then: the Drive connector plus `asset`, slower |
| Grok's image model for sheets, drafts and page art | Nano Banana Pro and 2 through fal.ai, with reference images | Built from videograph's adapter; needs `FAL_KEY`; **no picture made yet**; how its look sits next to the Grok-made sheets and drafts is unknown (test B3) |
| Grok's workspace for building PDFs | The session's own machine: Python, PyMuPDF, KDP preflight on upload | Built; the Builder hasn't run yet |
| Scout's web research | The `scout` agent with web search | Built; a cloud session's network may block some store pages, which the first topic will show |
| Talking to the bots from a phone | The Claude app: a cloud session on this repo. Or the panel's Inbox box, picked up at the next sweep | Works once the cloud environment has the keys |
| Lessons and brand docs read at the start of every run | Every brief prints the lessons that apply; brand docs and checklists are read from the repo | Built |
| Estimated cost rows and the $15 daily cap | A gate before every paid picture, the same cap, and the costs row written by the tool; Claude itself runs on the subscription | Built |
| Sweeps on a schedule | Grok never had this. A Claude scheduled task can run `/sweep` at 9am and 6pm New York | Not set up; after the keys |
| The chat as working memory | Nothing lives in chat: state in MM Core, roles and rules in the repo | Built |
| The board | Untouched in MM Core: 40 tasks, ending at T-0039 | Intact; the 11-01 instructions to the Orchestrator were never carried out |

**In one line:** every role and rule carried over and is built; three keys (Sheet, uploads, fal)
stand between built and live; two things behave differently (sweeps instead of a standing chat, a
different image model).

### Already better than Grok was

- A role can't break the rules by mistake: wrong tab, wrong column, illegal status, overwritten log
  row, hand-in without a review, upload that can't print. Each of those happened or could have.
- Files can't be lost in a workspace: no hand-in without an uploaded file and its assets row.
- Descriptions can't go stale in a chat app: one file per role, in git.
- Money is checked before it is spent, per picture, per task and per day.
- An agent's report is checked against the Sheet before anyone acts on it.

### Not as good yet, or unknown

- Nothing has run against the live Sheet, Drive or fal from Claude. The first sweep is the test.
- Art continuity across the change of image model (B3). The existing sheets and drafts become
  reference images, which is what references are for, but it is unproven.
- A sweep uses the Claude subscription's allowance. How much one sweep takes is unmeasured; the first
  real one goes in the playbook.
- The Quality Checker and Claude's QC are now the same model reading the same checklist. Kept for now;
  the critic counts how often the second catches what the first passed (decision D2).

## 2. Recreatable across time and platform

| Layer | Where it lives | If lost today | Plan |
|---|---|---|---|
| Roles, rules, checklists, knowledge, code | This repo (GitHub, plus every clone) | Nothing lost | R1 makes it usable off Claude |
| The team's door (`npm run bot`) | Plain Node and Google's APIs. The gates are in it, not in Claude, so any agent that can run a command gets the same rules | Nothing lost | R1 |
| Claude-only pieces | Agent files' headers, the Stop hook, `/sweep`, scheduled tasks | Conveniences; the work can be driven by hand | R1 |
| **State: MM Core** | One Google Sheet | **Everything since the last backup, and the weekly backup has been failing** (it needs the owner token) | **R2, first** |
| Files: art, PDFs, photos | Drive, in one Google account | The files | R3 |
| How each picture was made | The prompt is an asset; the references, model and settings are not recorded together | Hard to remake a page the same way | R4 |
| Approved characters | Drive, as task outputs | Re-render and re-approve | R5 |
| Secrets | `.env`, GitHub, Vercel; names in `.env.example` | Re-issue each | R6 |
| The image vendor | fal.ai, one model family, set in `formats/picture-book.json` | Art stops | R7 |

| # | Item | Why | Cost |
|---|---|---|---|
| R1 | **Built 11-11.** `AGENTS.md` at the root, and `npm run team:export`: each role's house rules plus description as plain text | Any agent with a shell in this repo can be a role, with the same rules, because the rules are in `npm run bot`. A chat-only platform can't be given the Sheet safely; it drafts, and its work comes in through an agent that can | Done |
| R2 | **Half built 11-11:** `npm run backup -- <dir>` and `npm run restore -- <dir>` exist and are unit-tested. Still to do: run both against the real Sheet and a scratch Sheet, then a nightly job that pushes the export to a private GitHub repo | The Sheet is the business. A backup that isn't on Google, with a restore that has been run | Kyle creates the private repo and a deploy key (D1) |
| R3 | Monthly copy of MM Work and MM Brand to a second place, and a doctor check that every `assets.file_url` still opens | Files outlive one Google account | Storage |
| R4 | **Built 11-11.** `image` writes a recipe beside every picture (prompt, reference asset IDs, model endpoint, size, date, attempt); the Illustrator uploads it and the picture's `prompt_ref` points at it | Any page can be remade, or moved to another model, from its recipe | Done |
| R5 | A characters library: each recurring character's approved sheet and description by ID, imported into a new book instead of rendered again | Book 2 starts with Miss M at $0, and she stays the same cat | Code; decision D3 |
| R6 | The shared password manager (still outstanding), and `doctor` listing every key by name and where it must be set | Keys are re-issued from a list, not from memory | Free tier |
| R7 | A second image vendor behind the same `image` command (videograph's fallback is GPT Image 2) | A model retiring or an account closing doesn't stop a book | About $1 to test |
| R8 | `docs/REBUILD.md`: from nothing to a working team on a scratch Sheet. Run it once a quarter and time it | A recovery plan nobody has run isn't one | An hour a quarter |

Already in place for "across time": dependencies pinned (`package-lock.json`, `.nvmrc`), the Sheet
rebuildable from `schema.json`, CI on every push, every knowledge claim dated and flagged at 60 days.

## 3. The road to best in class

### Phase 1: live (this week)

| # | Item | Done when |
|---|---|---|
| L1 | Keys in the cloud environment `miss-marilyn-hq` (created 11-11 with the Sheet ID and Google's and fal's hosts): the Sheet key, the fal key, later the owner token | `npm run bot -- kyle board` prints the real board from a cloud session |
| L2 | First sweep without art: deliver the 11-01 decisions, create the rest of Book 1's chain, draft the KDP packet, Scout's first topic | Each of those roles has taken a task to `ready_for_qc` and through QC |
| L3 | First pictures, cap $3: tests B1 and B3 on two pages | The contact sheet shows Grok-made drafts next to the new ones, and Kyle says keep or change |
| L4 | The owner token for uploads | `upload` works without the Drive connector |
| L5 | Scheduled sweeps, 9am and 6pm New York | Two days of unattended sweeps with a clean report |
| L6 | The panel starts a backend tick when Clara answers (a `workflow_dispatch` call from the panel's save action; needs a GitHub token in Vercel) | Her Approve shows as applied within a few minutes. Measured 11-08 to 11-11: GitHub ran the "every 30 minutes" schedule 12 times in three days |

### Phase 2: recreatable (R1 to R8, R2 first)

### Phase 3: Book 1 out, measured

Finals for all 24 pages, cover, interior, cover wrap, KDP packet, KDP's own previewer, a proof copy,
Clara's final OK. Every cost, attempt and minute goes in the playbook: this is the baseline every
later number is compared with.

### Phase 4: best in class

| # | Item | Why | Cost |
|---|---|---|---|
| Q1 | Story checks in code at hand-in: words per page, per spread and in total; lines per page at the body size; words outside a young reader's list | Counting is a machine's job; T-0038 passed on words and still had a 6-line page | Code |
| Q2 | A layout engine in the repo: pages rows plus art in, interior PDF and cover wrap out, the same file every time | Today the Builder writes a new script per task. Same inputs, same PDF is what "recreatable" means for print | Code |
| Q3 | Picture checks in code before any review: text in the image, anything in the outer 4%, distance from the style guide's palette, a calm text zone | Three of these were the faults in T-0039 or are Blocking on the checklist | Code; small API cost if a model reads the image |
| Q4 | A consistency score for each page against the character sheet, calibrated to Kyle's keep-or-redo calls | Turns "looks off" into a number that can gate a hand-in | Experiment, cap first |
| Q5 | A model bench: one prompt and its references across several image models on one contact sheet | Choose the model per kind by looking, as videograph does, and re-run it when a model changes | A few dollars a run |
| Q6 | Practice mode for the whole team: `npm run sim` driving the roles with practice pictures and a stand-in agent, in CI | A broken step shows up before a real book does (videograph's worker test) | Code |
| Q7 | Research into the knowledge library with official sources: KDP's content and AI-disclosure rules, copyright in AI-assisted books, picture-book craft, read-aloud pacing; Scout's comparables per book | The library is seeded from our runs and videograph; the outside world isn't in it yet | Claude time |
| Q8 | Clara's side: the contact sheet and the dummy book in the panel; every change she makes recorded so the critic can learn her taste | Her eye is the standard the reviews are trying to match | Code |
| Q9 | The sales loop: KDP and Etsy imports feeding lessons (`source: sales`) and the marketing plan | "Best" is finally measured by readers | Code, after launch |
| Q10 | More formats as config: hardcover, the free colouring PDF, Etsy printables; a format per product | One series, several products, no new code each time | Code |

### Tests

| # | Question | Design | Cap |
|---|---|---|---|
| B1 | Does a draft passed as the first reference hold its composition at print size? | Two pages: final with and without the draft as a reference | $1.20 |
| B2 | How many references help? | One page with 1, 3 and 5 references | $0.90 |
| B3 | Does the new model match the look of the Grok-made sheets and drafts across pages? | Two drafts and one final with the existing sheets as references, on a contact sheet beside T-0039's | $0.50 |

## 4. How we'll know

Set the targets after Book 1 gives the baseline.

| Measure | Baseline | Source |
|---|---|---|
| Picture cost per book, and attempts per page | Book 1 | costs rows, checked against fal's dashboard |
| Share of tasks that pass QC first time | Book 1 | log |
| Pages Kyle or Clara sent back after QC passed them | Book 1 | log, lessons |
| Kyle's hands-on time per book | Book 1 | his estimate |
| KDP rejections | 0 is the only acceptable number | KDP |
| Time to rebuild from nothing | First R8 drill | REBUILD.md |
| Claude allowance used per sweep | First real sweep | playbook |

## Decisions for Kyle

- **D1** Decided 11-11: the nightly Sheet backup goes to a private GitHub repo. Kyle creates it.
- **D2** Decided 11-11: keep both reviews (Quality Checker, then QC) until Book 1's numbers are in.
- **D3** Decided 11-11: approved character images live in Drive, with a manifest in the repo.
- **D4** Decided 11-11: $3 for the first pictures (L3).
- **D5** Open: whether this repo stays public. Public keeps Actions free; private would let backups, characters and fuller notes live here.
