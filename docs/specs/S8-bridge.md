# S8 — The bridge: book to trailer and back

**Status:** not started · **Repos:** miss-marilyn-hq (most of it) and videograph (S7 items 6 and 7)
**Needs first:** S5, S7 · **Spends:** per trailer, under a cap Kyle states each time (plan on $10)

## Why

S7 lets videograph make a Miss Marilyn clip. This spec makes it part of the book's flow: the
Marketer asks for a video, HQ packs what videograph needs, the clip comes back as an asset, QC
checks it, Clara approves it in the panel and posts it by hand. HQ stays the record of everything;
videograph is a tool it calls.

## How the two talk

**Files in a folder, not an API.** A brief goes out as a folder; a result comes back as a folder.
One Claude session with both repos checked out side by side moves them (the session that planned
this had both attached). Nothing has to be online at the same time, either side can be replaced,
and the contract can be read with a text editor. If videograph is ever swapped for another video
tool, only the contract has to be honoured.

```
HQ:  npm run bot -- growth video-brief <task>   →  .mm-work/<task>/video/brief/   (brief.json + images)
                                                        │  the session copies it across
videograph:  vg run create --format mm-book-trailer --brief-file …/brief.json  →  /produce  →  runs/<id>/handoff/
                                                        │  the session copies it back
HQ:  npm run bot -- growth video-result <task> <dir>  →  uploads clips, assets rows, costs row
```

### `brief.json` (contract `mm-video/v1`)

```json
{
  "contract": "mm-video/v1",
  "task_id": "T-0052", "product_id": "MM-B02", "title": "Miss Marilyn Makes a Friend",
  "format": "mm-book-trailer", "target_sec": 30, "cap_usd": 10,
  "characters": ["char_miss_marilyn", "char_gussie"],
  "style": ["watercolour and ink", "…"],
  "shots": [
    { "page": 3, "image": "pages/p03.png", "asset_id": "A-T0026-05", "focus": "centre",
      "motion": "her tail flicks once; a slow push-in", "caption": "Miss Marilyn saw someone new." }
  ],
  "end_card": { "image": "cover.png", "text": "Miss Marilyn Makes a Friend", "link": "" },
  "rules": ["no humans", "no text generated in frame", "captions are Clara's words exactly"]
}
```

- `image` paths are files in the same folder: QC-passed page art (and the cover) downloaded from
  Drive, plus the character bundle from S5's export.
- `caption` comes only from `pages.text_final`. A page without Clara's words can't have a caption;
  the command refuses a brief that uses `text_draft`.
- `cap_usd` is the brief's cap; videograph's own ledger enforces it on its side.

### `result.json` (written by videograph, S7 item 7)

```json
{
  "contract": "mm-video/v1", "task_id": "T-0052", "run_id": "…", "cost_usd": 6.4,
  "clips": [ { "file": "trailer.mp4", "cover": "trailer.jpg", "duration_sec": 31.2, "aspect": "9:16",
               "models": ["…per shot…"], "captions": ["…as shown…"], "qa": "passed" } ]
}
```

## What to build in HQ

1. **Schema** (`packages/core/schema.json`, then `sheet:setup`; push the schema and run setup
   before code that reads it): task type `social_video` (default owner `growth`, needs QC, needs
   Clara, item type `approve`, rubric `social_video`). `asset_type` already has `social_video`;
   `content_type` already has `reel` and `short`. Add the type to the Launch stage in
   `apps/web/lib/labels.ts` (`STAGE_TRACK`).
2. **Rubric** `apps/backend/rubrics/social_video.md`. Blocking: a character off-model against the
   library at any point in the clip; any generated text or letters in frame; a caption that isn't
   Clara's words exactly; any human or child; audio that isn't from the licensed library; a clip
   outside the platform's length; more than a few seconds of the book's story given away in order
   (a trailer shows moments, not the plot). Minor: a motion that reads as a glitch, a weak first
   two seconds.
3. **`video-brief <task>`** (`growth` only, task in progress, type `social_video`): builds the
   folder from the task's brief (which pages, target length), `pages`, the assets and the
   character library. Refuses when a chosen page has no QC-passed final art, or a caption has no
   `text_final`. Prints the folder and the cap.
4. **`video-result <task> <dir>`**: validates `result.json` (contract version, same task, clips
   exist, `cost_usd` within the brief's cap); runs a deterministic check on each clip with ffprobe
   (9:16, duration within the format's range, has a video stream, audio stream optional); uploads
   each clip and cover (`asset_type` social_video and social_image, `made_with` "videograph run
   <id>: <models>", `rights_source` AI); writes one costs row (vendor "videograph", the reported
   cost, estimated FALSE); prints the asset IDs for the Marketer's `content` rows.
5. **The Marketer** (`.claude/agents/marketer.md`): a `social_video` task is: choose 5 to 8 moments
   that tease without telling the story, write the motion note for each, `video-brief`, report
   "brief ready" (a new closing line the gate accepts), and after the result comes back, write the
   `content` rows (channel, `content_type` reel or short, the clip's asset ID, hook, body, notes
   with the platform's AI-label reminder) and go to review as usual. The Marketer never runs
   videograph itself.
6. **The Orchestrator**: a book gets one `social_video` task (the trailer) when its cover and page
   art have passed QC and Clara has approved the script; weekly clips only if the approved
   marketing plan asks for video. Never two open for one book.
7. **A skill, `.claude/skills/trailer/SKILL.md`**, for the session that has both repos: check both
   are present and which keys each has; state the cap and get Kyle's yes; run the Marketer to
   "brief ready"; copy the brief into videograph's inbox folder; run videograph's pipeline for
   that brief (its own orchestrator skill, its own checkpoints: it asks before spending and never
   uploads); copy `handoff/` back; `video-result`; then Quality Checker, hand-in and QC as in a
   sweep. If videograph isn't in the session, stop after "brief ready" and say where the folder is.
8. **The panel**: Clara's approval card for a `social_video` task opens the Social page with the
   clip playable (the asset route already serves Drive files; check that video streams or add a
   plain download link). No other panel change.
9. **Docs**: `docs/TEAM.md` (commands, the flow), `docs/knowledge/` a new `video.md` (what a
   trailer may show, the AI-label rule per platform as official claims with dates, what the first
   run measured), `docs/HANDOFF.md`, the roadmap.

## Needs from Kyle

A cloud environment (or the laptop) with both repos and both sets of keys: HQ's Sheet and upload
keys, and videograph's own (its `.env.example` lists them). Simplest: add videograph to the
`miss-marilyn-hq` environment's repositories and its hosts and keys to that environment. A cap
for each trailer, said in the session.

## Tests

Unit: brief building from fixture rows (refuses draft text, refuses un-passed art), result
validation (wrong task, over cap, missing clip), the `social_video` type in the schema integrity
tests, the ffprobe check on a tiny generated clip. `npm run sim`: extend it with a `social_video`
task through QC and Clara's approval using a stand-in clip, so the backend flow is covered.
End to end: one real trailer for Book 1 under the cap, start to Clara's card.

## Done when

- `npm run check` and `npm run sim` pass with the new type.
- One trailer for Book 1 has gone brief → videograph → result → QC → Clara's card, with its cost
  in both playbooks and what was learned in `docs/knowledge/video.md`.
- Removing videograph from the session stops the flow cleanly at "brief ready".

## Not in this spec

Posting for Clara. A service or webhook between the repos. Turning videograph into the image
generator for books: pictures stay here (see the README's diagram).
