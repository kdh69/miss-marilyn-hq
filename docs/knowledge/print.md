# Print: what the files must be
Last reviewed: 2026-11-11

The numbers our own checks enforce for an 8.5 x 8.5 in KDP paperback in premium colour. "Proven"
here means read in this repo's code; whether each number still matches KDP's live help pages is a
separate question, marked check-live.

## Rules

- Page art is a PNG of exactly 2588 x 2625 px (8.625 x 8.75 in at 300 DPI, bleed included), RGB with no transparency. `upload` refuses anything else as `page_art` or `cover_art` unless it is marked `draft=1`. [proven, checked 2026-11-11] [image.ts](../../apps/backend/src/lib/image.ts)
- Run `npm run bot -- <role> check <file>` before asking for a review; it runs the same checks as `upload` and the QC gate. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)
- The interior and the cover wrap print only `pages.text_final`. An empty `text_final` on a text page blocks the task. [proven, checked 2026-11-11] [CLAUDE.md](../../CLAUDE.md)
- Embed every font; use only Andika and Fredoka. [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)
- Keep all text at least 0.5 in inside the trim on every side. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Build PDFs with a script and upload the script, so a changed page is a re-run. [proven, checked 2026-11-11] [builder](../../.claude/agents/builder.md)

## Interior PDF (what preflight fails)

- Fewer than 24 pages, or an odd page count. (check live) [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Any page not 8.625 x 8.75 in. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Any placed image under 300 DPI. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Any text block within 0.5 in of the trim; both sides are held to it because the bleed side alternates. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Any font that isn't embedded. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)

## Cover wrap PDF

- One page: back, spine, front. Width is 2 x 8.5 + spine + 2 x 0.125 in; height is 8.75 in. [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- Spine width is page count x 0.002347 in for premium colour paper: 0.0563 in at 24 pages. (check live) [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)
- No text on the spine below 79 pages. (check live) [proven, checked 2026-11-11] [preflight.py](../../apps/backend/preflight/preflight.py)

## Layout

- Body text is Andika 22 pt (20 to 24), line spacing 1.35x, at most 5 lines a page; "ACHOO!" is Fredoka 36 to 48 pt on its own line and never in the art. [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)
- No bleed on the gutter edge; keep faces out of the inner 0.5 in so they don't sink into the binding. [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)
- Over busy art, text sits on a soft Cream panel (#FBF3E4 at 80 to 90%). [proven, checked 2026-11-11] [style guide](../brand/style-guide.md)

## Listing

- The KDP packet answers the AI-content questions for text and for images separately, from the `rights_source` of every asset in the book, so every asset row has to be right. [proven, checked 2026-11-11] [lister](../../.claude/agents/lister.md)
- The author name is still open (request R-0003) and blocks only the packet. [proven, checked 2026-11-01] [handoff](../HANDOFF.md)

## Open questions

- Nobody has uploaded one of our PDFs to KDP's own previewer yet; the first interior that passes preflight should go through it before Clara's final OK. [unproven, checked 2026-11-11]
