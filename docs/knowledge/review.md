# Review: how to judge work
Last reviewed: 2026-11-11

For the Quality Checker, Claude's QC, the critic and the dispatcher. The checklists in
`apps/backend/rubrics/` say what fails; this file says how to look.

## Rules

- Checks before eyes: run `check` on every picture and PDF first. A file that can't print doesn't get a visual review. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)
- Look at the files themselves, every one. If a file won't open or something can't be counted, that is a fail that says so; never pass on a guess. [proven, checked 2026-11-11] [quality-checker](../../.claude/agents/quality-checker.md)
- Review page art on a contact sheet as well as one by one (`contact`): drift between pages only shows side by side. [videograph, checked 2026-11-05]
- Count words, lines, characters and tags yourself. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- Be strict on Blocking items and on anything a parent, Amazon or Etsy would reject; mention taste, don't fail for it. [proven, checked 2026-11-11] [quality-checker](../../.claude/agents/quality-checker.md)
- Feedback is what the next attempt is built from: say where, what and how to change it, with the page or asset ID. [videograph, checked 2026-11-06]
- Check a report against the board before acting on it: `verify`, or `npm run bot -- kyle board`. [videograph, checked 2026-11-04]
- When Kyle or Clara overrules a verdict either way, the critic records it as a lesson, so the next review is closer to theirs. [videograph, checked 2026-11-06]

## Why these

- In videograph an agent reported 9 images when 6 existed and called clearly visible teeth "faint". A report is a claim; the record is the fact. Here the Stop-hook gate checks each maker's closing line against MM Core. [videograph, checked 2026-11-04]
- QA there judged one clip at a time and missed that an action changed at every cut; the owner saw it at once in a rough cut. Our rough cut is the contact sheet and the dummy PDF. [videograph, checked 2026-11-05]
- QA there was stricter than the owner, who kept 6 clips it had failed and saved about $5. A small fault is the owner's call before money is spent on a redo. [videograph, checked 2026-11-06]
- A clean first look doesn't mean a clean whole: there, defects started mid-clip. For a book, check the corners and the gutter side of every page, not only the faces. [unproven, checked 2026-11-11]

## What our own runs showed

- Claude's QC on story v2 recorded its own counts (about 270 words, the longest spread 49) and still noted p14 at 6 lines against a limit of 5: count lines as well as words. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- The read-through of the 24 drafts found three faults no single-page check would (a missing set-up on p16, a doodle in the outer 4% of p24, a speckle on p10). [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- Grok-era log rows carried made-up from-statuses and timestamps, and one verdict was overwritten. Rows written through `npm run bot` can't be: it only appends, with the real status and time. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)

## Open questions

- How often does the Quality Checker pass something Claude's QC then fails? Two reviews by the same model may be one too many, or the second may earn its keep; the critic counts it per sweep. [unproven, checked 2026-11-11]
