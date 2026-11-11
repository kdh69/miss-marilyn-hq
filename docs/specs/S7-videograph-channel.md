# S7 — Miss Marilyn channel in videograph

**Status:** not started · **Repo:** videograph (Kyle's private video repo). This file is the brief;
the work, and every detail of how videograph does it, is committed there, not here.
**Needs first:** S5 (the character export) · **Spends:** about $5 for the first test clip, after Kyle's yes

## Why

The Marketer here already plans reels and shorts, and Clara posts them by hand. videograph already
makes vertical clips with hooks, captions and a post kit, and holds characters on-model with
reference images. Making Miss Marilyn a channel there gives the books their trailers and weekly
clips without building a video pipeline twice.

The strongest idea in this spec: **the book's own approved page art is the start frame of each
shot.** The video model animates a picture Clara has already approved, so the cat in the trailer
is the cat in the book.

## Read first (in videograph)

Its `CLAUDE.md` and handoff; how a channel is laid out (`docs/<channel>/`, the existing channel is
the pattern); its characters folder and README; two formats (the vertical short and a personal,
never-published one); the knowledge files on consistency, prompting and audio; its playbook's cost
table; the social clips doc. Here: `docs/specs/S5-character-library.md`, `docs/specs/S8-bridge.md`
(the contract this channel must accept and produce), `docs/brand/series-bible.md`.

## What to build (in videograph)

1. **The channel folder** `docs/miss-marilyn/`: `README.md` (what the channel is for: trailers and
   social clips for a picture-book series for ages 2 to 6, addressed to parents, PG, no humans, no
   children, nothing published from videograph), `plan.md`, `HANDOFF.md`, `characters/`, `episodes/`.
   Add the channel to the table in `CLAUDE.md`.
2. **Characters.** Import the bundle from `npm run characters:export` (S5) into
   `docs/miss-marilyn/characters/`, keeping the IDs (`char_miss_marilyn`, …). They are the same
   descriptions and sheets the book uses; never edit them there. A change is made in HQ's library
   and exported again.
3. **Format `mm-book-trailer`** (`formats/mm-book-trailer.json`), from the vertical-short format:
   - 9:16, 20 to 40 seconds, 5 to 8 shots, 3 to 6 seconds each.
   - Every shot is image-to-video from a supplied start frame (a page of the book). Motion is small
     and physical: a tail flick, a blink, a slow push-in, leaves moving. One change per shot.
   - Style tokens from HQ's style guide: watercolour and ink, the series palette.
   - Continuity on, with the imported characters; reference rendering off (nothing to render).
   - Narration: off by default; on-screen captions carry at most a dozen words from the book, and
     only words Clara approved (`text_final`), passed in by the brief. Music from the licensed
     library, no vocals. Never a generated voice presented as Clara's.
   - Publishing disabled, the same way the personal format disables it: this channel only ever
     hands files back to HQ.
   - QA rubric tuned for it: on-model against the sheet at the first, middle and last frame; no
     text or letters appearing in frame; no drift toward a generic cat; nothing frightening.
4. **Format `mm-clip`**: one 6 to 12 second moment for a weekly post, same rules, cheaper.
5. **A supplied start frame.** Today a shot's start frame is generated ahead of the video. Add the
   way to give a shot an existing image instead (a command on the shot, or a field the script
   accepts), stored and reviewed like a generated one. Crop a square page to 9:16 deliberately:
   the brief names the focus point for each page; default is centre.
6. **The inbound contract** (S8): a way to create a run from a brief file, for example
   `vg run create --format mm-book-trailer --brief-file <dir>/brief.json`, which sets the script's
   shots from the brief's `shots[]` (page image, focus, motion note, caption) instead of asking the
   writer to invent them. The writer node then only tightens motion prompts; it may not add shots
   or change captions.
7. **The outbound contract** (S8): at the end of a run, `runs/<id>/handoff/` holds `result.json`
   (run ID, per-clip file, duration, the models used per shot, cost from the ledger, captions as
   shown, the QA verdict per shot) plus the clips and covers. No upload step.
8. **Knowledge and lessons.** A `miss-marilyn` section in the lessons file, and channel notes in
   the knowledge library where a claim is specific to illustrated, watercolour sources (how each
   video model treats a painted start frame is unknown: say so and name the test).

## The first test (needs Kyle's cap)

One `mm-clip` from one approved draft page: a start frame in, a 6 second clip out, on two video
models, side by side. Question: which model keeps a watercolour looking like watercolour and the
cat on-model? Cap $5. Record the answer in videograph's knowledge library and playbook.

## Done when

- A dry run of `mm-book-trailer` from a sample brief passes end to end in practice mode ($0).
- The test clip has been made and judged by Kyle, with its cost and the chosen model recorded.
- `runs/<id>/handoff/result.json` matches the shape in S8.

## Not in this spec

Uploading anywhere. Long videos or read-alouds of the whole book (a separate product decision:
a full read-aloud gives the book away). Narration in Clara's voice.
