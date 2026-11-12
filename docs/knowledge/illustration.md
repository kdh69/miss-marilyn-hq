# Illustration: keeping characters on-model
Last reviewed: 2026-11-11

How to get the same Miss Marilyn, in the same watercolour and ink, on all 24 pages, and how to
spend as little as possible finding out a page is wrong.

## Rules

- Character sheets come first and pass QC before any page art; every page call passes the approved sheets (and Miss M's photos) as reference images. [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)
- Drafts before finals: make a cheap draft of every page (`kind=draft`), put them on one contact sheet, and let Kyle or Clara see the whole book before any print-size page is paid for. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- Open every picture yourself, next to the character sheet, before the next paid call. [videograph, checked 2026-11-06]
- Describe the resting look only, in positive words. Ask for what you want, never what you don't. [videograph, checked 2026-11-04]
- Name a small feature by its shape and compare its size to something nearby, or the model draws the full-size version. [videograph, checked 2026-11-05]
- No text, letters or watermark in any picture: the Builder sets all words. [proven, checked 2026-11-11] [art_page checklist](../../apps/backend/rubrics/art_page.md)
- Keep faces, paws and anything that matters at least 0.375 in inside the trim (out of the outer 4% of the picture), and keep the page's text zone calm. [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)
- A fix note is concrete and physical: where, what, how big. Never "more consistent". [videograph, checked 2026-11-06]
- Paid attempts per picture are limited (`maxAttemptsPerImage` in `formats/picture-book.json`: 3, raised to 4 by Kyle on 2026-11-11 for p15 after its third final lacked the nose smudge); then block the task and show a person what keeps going wrong. `image` enforces the limit, counted per task, kind and page; from 2026-11-12 it counts per round (since the task last went `in_progress`) with 6 rows of any kind ever as the lifetime limit. [proven, checked 2026-11-11] [gates.ts](../../apps/backend/src/lib/gates.ts)
- Before review, look at the whole book on one contact sheet (`contact`): a reviewer who sees one picture at a time misses drift between them. [videograph, checked 2026-11-05]
- Show Kyle a failed picture before paying to redo it when the fault is small. [videograph, checked 2026-11-06]

## The order of work

- Sheets, then drafts of all 24 pages, then finals. A reference image is the cheapest thing in the book to redo, and everything later is built on it. [videograph, checked 2026-11-04]
- Book 1 went this way: character sheets (T-0025) passed QC before the full-book drafts (T-0039), and Kyle decided on 2026-11-01 that final page art starts from those drafts and keeps their composition. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- For a final, pass the approved draft of that page as the first reference and say "keep this composition", then the character sheets. Test B1 is settled: it holds the composition at print size almost exactly (p3, p12, p13 of Book 1, 2026-11-11), including the draft's faults. [proven, checked 2026-11-11] [playbook](../playbook.md)
- A page whose story beat Clara changes gets redrawn; the others stand. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)

## Wording a prompt

- "No teeth visible" still drew teeth on a character; "a smooth, unbroken lip line" fixed the stills. Negatives name the thing you don't want, and the model draws it. [videograph, checked 2026-11-04]
- "Brow-horn stubs" came out as real horns; "a tiny rounded bump barely taller than the scales" worked. For Miss M that means describing her nose smudge and her red string by shape, size and place, not by name alone. [videograph, checked 2026-11-05]
- Keep the words for a failure out of the prompt altogether, even negated ("no extra paws"). [unproven, checked 2026-11-07]
- A sheet's description is prompt language: exact colours, size next to other characters, eye shape, marks, 60 to 150 words. No temporary states (a sneeze, a wet coat), which then contradict pages. [videograph, checked 2026-11-04]
- Ask for the subject alone on a character sheet; a first sheet in videograph came back with extra figures until the prompt said so. [videograph, checked 2026-11-04]
- Describe the page's one moment. A prompt that asks for two beats gets a muddle of both. [unproven, checked 2026-11-11]

## What the lessons already fix for Miss Marilyn

- Her comfort object is a red string; her nose-smudge beauty mark shows; no humans anywhere; watercolour and ink; Mama is cream and ginger, Papa a grey tabby; ink line layers are kept. The `lessons` tab (L-0001 to L-0007) is the authority and every brief prints it. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- Side characters can be any animal. Gussie is a dog, drawn from his photos (P-20261030-001 and -002). [proven, checked 2026-11-01] [handoff](../HANDOFF.md)

## What the first finals showed (Book 1, 2026-11-11)

- A draft's faults carry into the final: p12's tail on the left edge and Gussie sitting on his haunches were in T-0039's draft and came back in both attempts, even with the fix written in the prompt. Fix a draft's faults at the draft stage ($0.08), or drop the draft as a reference and describe the layout in words. [proven, checked 2026-11-11] [playbook](../playbook.md)
- When a fix in words is ignored once, a second try with the same reference and the same kind of words is unlikely to work; change the method (different references, layout in words only) before paying again. [proven, checked 2026-11-11] [playbook](../playbook.md)
- State margins in the prompt itself: every part of every character, tail included, at least 5% of the width from every edge. [unproven, checked 2026-11-11]
- Check the outer 4% (about 104 px of 2588) on every picture before the next paid call; a tail tip on the edge is the common miss. [proven, checked 2026-11-11] [playbook](../playbook.md)
- The ink line layer is a free local extract (blur difference), clean on figures but speckled on foliage, sky and grass; upload it with `version=ink` so it never becomes the page's picture. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)
- A good final prompt (T-0027 p3, T-0032 p13) names the one moment, each character by shape and colour as on its sheet, the calm text zone, and "keep this composition". The files are in `.mm-work/` only for this session; recipes are in Drive as page_plan assets. [proven, checked 2026-11-11] [playbook](../playbook.md)

- A free guide (the draft shrunk to about 84% on a cream canvas, used as the first reference) fixed p14's tail but added a cream vignette, and failed on the crowded p15; it helps only partly. [proven, checked 2026-11-11] [playbook](../playbook.md)
- Standing rules from this run are in the `lessons` tab: L-0021 (redraw the draft, not the final), L-0022 (change the method on a retry), L-0023 (read Clara's new requests before releasing art), L-0024 (state budgets as a dollar maximum), L-0025 (check for Clara's answer before calling something open). [proven, checked 2026-11-11] [playbook](../playbook.md)

## What our own runs showed

- T-0025 (character sheets) passed QC on its third attempt. That was with the Grok image model, so it says little about the current one. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)
- T-0039 (24 draft pictures) came out on-model and close to final, with three small faults that only a read-through found: no tickle face on p16 before p17's ACHOO, a doodle in the outer 4% of p24, an ink speckle on p10. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)

## Open questions

- B2: how many references help? The model takes five; videograph found a third view of a character was paid for and unused. [unproven, checked 2026-11-11]
- B3: first look (not a full test): the Nano Banana pictures sit well beside the Grok-made sheets (same watercolour and ink, same markings); the contact sheet of finals next to T-0039's drafts is still to be made. [unproven, checked 2026-11-11]
- B3 in full: does the watercolour-and-ink look hold across 24 separate calls, or does it need a style reference on every call? [unproven, checked 2026-11-11]
