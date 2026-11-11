# Specs: the build queue

Written 2026-11-11 for Kyle to hand to Claude sessions one at a time. Each spec is one session's
work: it says why, what to read, what to build, how to test it and when it's done. The plan they
serve is [`../ROADMAP.md`](../ROADMAP.md); where things stand is [`../HANDOFF.md`](../HANDOFF.md).

## The shape we're building

```
            Miss Marilyn HQ  (this repo, public)                 videograph  (Kyle's video repo, private)
   ┌───────────────────────────────────────────────┐      ┌───────────────────────────────────────┐
   │ the business: MM Core, Clara's panel, backend │      │ the video studio: models, long videos,│
   │ the book team: /sweep, npm run bot            │      │ social clips                          │
   │ books and pictures are made here              │      │ video is made here                    │
   │                                               │      │                                       │
   │ character library ──── S5 export ───────────────────▶│ docs/miss-marilyn/characters   (S7)   │
   │ video brief (pages, art, words) ── S8 ──────────────▶│ format mm-book-trailer         (S7)   │
   │ social_video assets + posts ◀──── S8 ───────────────── finished clips + post kit              │
   └───────────────────────┬───────────────────────┘      └───────────────────┬───────────────────┘
                           └──────── studio-core: image adapters, budget gate (S6, later) ─────────┘
```

Books and pictures stay here; video stays in videograph; one character library feeds both; nothing
publishes from either without Clara's Approve in the panel.

## The queue

| # | Spec | Repo | Needs first | Needs from Kyle | Spends |
|---|---|---|---|---|---|
| S1 | [Hardening before the first live sweep](S1-hardening.md), with the [review's findings](S1-review-findings.md) | HQ | | How picture budgets work (finding F6) | $0 |
| S2 | [First live run](S2-first-live-run.md) | HQ | S1 | Sheet key in the cloud environment; fal key; a yes on $3 | up to $3 |
| S3 | [The panel starts the backend tick](S3-panel-starts-tick.md) | HQ | | A GitHub token in Vercel | $0 |
| S4 | [Nightly backup and the rebuild drill](S4-backup-and-rebuild.md) | HQ | S2 (keys proven) | A private GitHub repo and a deploy key; a scratch Sheet | $0 |
| S5 | [Character library](S5-character-library.md) | HQ | S2 | Approval of each character's description | $0 |
| S6 | [studio-core: shared generation code](S6-studio-core.md) | new + both | S2, and its trigger | Where the package lives | $0 |
| S7 | [Miss Marilyn channel in videograph](S7-videograph-channel.md) | videograph | S5 | A cap for the first test clip | about $5 |
| S8 | [The bridge: book to trailer and back](S8-bridge.md) | both | S5, S7 | An environment with both repos and their keys | per trailer |

Order: **S1 → S2** first, because everything else assumes the team has run once. **S3** can go any
time. **S4** right after S2 (the Sheet has no working backup today). Then **S5 → S7 → S8**. **S6** waits
for its trigger (a second image vendor, a second product format, or the first model retirement that
needs the same fix in both repos).

## How to run one with Opus

Start a Claude Code session on the repo the spec names (for S8, both repos), on the cloud
environment `miss-marilyn-hq` or on the laptop, and paste:

```text
Read CLAUDE.md, docs/HANDOFF.md and docs/specs/README.md, then execute docs/specs/<file>.
Follow the spec's "Done when" list exactly; where the spec and the code disagree, the code is the
fact: say so and adapt. Stop and ask before anything the spec marks "Kyle decides" or that spends
money. Finish with: what changed, what you tested and its result, what you could not test, and an
update to docs/HANDOFF.md and the spec's Status line. Do not commit or push until I say so.
```

## Rules for every spec

- `CLAUDE.md` applies in full: schema first, rows by header name, every status change logged,
  nothing spends without a stated cap and Kyle's yes, commit and push only on his word.
- This repo is public. No keys, emails, story text, photos or private-repo internals in it.
  Anything about videograph beyond a file path and a command belongs in videograph's own docs.
- A spec is done when its checks pass **and** the thing was run for real where the spec asks for it.
  "Unit-tested only" is a status, not done. Say which one you reached.
- Where a mistake can be prevented in code, the spec's fix is code plus a test, not a note.
- Update the spec's **Status** line (not started / in progress / built, not run live / done, with
  the date) and `docs/HANDOFF.md` at the end of the session.
- After anything that ran live, put measured numbers in `docs/playbook.md` and evidence in
  `docs/knowledge/` with a dated label.

## What is not specced yet

The roadmap's Phase 4 (story checks in code, the layout engine, picture checks, the consistency
score, the model bench, practice mode in CI, the sales loop) gets specs after Book 1 gives the
baseline numbers. Writing them before the first live run would be guessing.
