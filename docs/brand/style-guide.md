# Miss Marilyn Publishing — Style Guide

**Draft v0.1.** For the Illustrator (art) and the Builder (layout and files). Read with
`series-bible.md`. Values marked "starting point" get locked after Clara approves the
character sheet and the first test spread.

---

## 1. Art direction

**Look:** soft, warm, painterly-but-clean picture-book art. Think gentle gouache or watercolour
texture with clear shapes and clean edges: readable at arm's length, calm enough for bedtime.

- **Shapes:** rounded, simple, chunky. Characters read clearly in silhouette.
- **Lines:** soft, slightly darker than the fill, or no outlines with clear colour separation.
  Pick one approach on the character sheet and keep it for the whole series.
- **Texture:** light paper or brush texture in fills; never noisy, never photoreal.
- **Light:** warm, daylight or lamp-lit. Soft shadows. No harsh contrast, no dark scenes beyond
  a cozy night (stars, lamp glow).
- **Faces:** big readable eyes, simple expressions. Feelings must read at a glance (excited,
  nervous, proud, sleepy, mid-sneeze).
- **Backgrounds:** simplified, fewer details than you think. The character is always the clearest
  thing on the page.
- **Composition:** one moment per page. Leave a calm area for text (section 4).

**Consistency over novelty.** Every page must look like the same book: same proportions,
colours, markings, line style, texture and palette. A plain page that matches beats a striking
page that doesn't. If two attempts don't match the character sheet, set the task to blocked.

### Character sheets (build before any page art)

For each recurring character (Miss M, Zoey, Mama, Papa, Nonna, Poppy, and each book's new
friends), the Illustrator delivers one character sheet that Clara approves:

- **Turnaround:** front, three-quarter, side, back, all at the same scale.
- **Expressions:** happy, excited, nervous/worried, sad, proud, sleepy, surprised, and the
  sneeze sequence (tickle face → eyes squeezed shut → "Achoo!" pose with puff lines).
- **Key poses:** standing, sitting, walking, hugging, reaching up.
- **Scale chart:** all family members standing side by side.
- **Callouts:** exact hex colours for coat, markings, eyes, nose, collar; a marking map
  (which side each patch is on). Mirrored markings are the most common consistency error.
- **Reference:** Miss M and Zoey come from Clara's real photos in MM Brand.
  [TO FILL FROM PHOTOS: coat colours and markings for Miss M and Zoey]
  [TO FILL: collar colours]

Save the approved sheet as an asset; every art brief references its asset_id.

## 2. Palette

Locked character colours come from the character sheet. Until then:

| Use | Hex | Note |
|---|---|---|
| Miss M coat / markings | [TO FILL FROM PHOTOS] | from real photos only |
| Miss M collar | [TO FILL] | |
| Zoey coat / markings | cream-to-apricot goldendoodle, wavy-curly coat, pink harness | from real photos only (`zoey-*`) |

**World palette — starting point** (warm, soft, slightly muted; not neon, not grey):

| Role | Hex | Name |
|---|---|---|
| Warm cream (paper, text panels) | `#FBF3E4` | Cream |
| Soft sky | `#BFDDEB` | Sky |
| Sage green (gardens, trees) | `#A9C3A0` | Sage |
| Butter yellow (sunlight, accents) | `#F6D57A` | Butter |
| Peach / coral (warm accents, cheeks) | `#F2A88B` | Peach |
| Dusty rose | `#D9939B` | Rose |
| Soft lavender (evening, night) | `#B7A9D1` | Lavender |
| Warm brown (wood, furniture) | `#9C6B4E` | Cocoa |
| Text / deep ink | `#3B2F2A` | Ink (warm near-black; use for all body text) |

Rules: max one strong accent colour per page. Night scenes use Lavender and deep blue-greys,
never pure black. Body text is always Ink on light, or Cream on a dark panel; never pure
`#000000`, never coloured text for body copy.

## 3. Typography

Both fonts are free Google Fonts under the SIL Open Font License (commercial print use allowed).
Download the font files into the repo; the Builder uses only these. **All fonts must be
embedded in every PDF** (preflight fails otherwise).

| Use | Font | Size | Notes |
|---|---|---|---|
| Interior body text | **Andika** Regular (Bold for emphasis) | 22 pt (range 20–24) | Designed for early readers: single-storey "a", clear letter shapes |
| "ACHOO!" and sound words | **Fredoka** SemiBold or Bold | 36–48 pt | Own line; can tilt up to 5°; never in the art |
| Refrain lines | Andika Bold | same as body | Optional; keep it subtle so it doesn't look like a different book |
| Cover title | **Fredoka** Bold | 60–80 pt (fit to width) | Max 2 lines |
| Series badge | Fredoka SemiBold | 14–18 pt | "The Adventures of Miss Marilyn" |
| Cover author line | Andika Regular | 18–22 pt | |
| Back cover blurb | Andika Regular | 14–16 pt | |
| Copyright page | Andika Regular | 9–10 pt | |
| "Meet the Real Miss Marilyn" | Fredoka SemiBold heading 28–32 pt, Andika body 16–18 pt | | |

- **Line spacing:** 1.35x the font size (22 pt text → ~30 pt leading).
- **Max lines per page:** 5 at body size. More than 5 means the text is too long for the page;
  send it back, don't shrink the font below 20 pt.
- **Line length:** about 35–45 characters per line; break lines at natural spoken pauses, not
  mid-phrase.
- **Alignment:** left or centred, consistent within a book. No justified text, no hyphenation.
- **Punctuation:** straight from pages.text_final. The Builder never edits the words.

## 4. Layout rules (interior)

**Page geometry** (8.5 x 8.5 in trim, KDP bleed):

- Each page file is **8.625 x 8.75 in** (2588 x 2625 px at 300 DPI): 0.125 in bleed on the top,
  bottom and outside edge; no bleed on the inside (gutter) edge.
- **Bleed:** 0.125 in. Art must fill it; nothing important lives there.
- **Text safe margin:** all text at least **0.5 in inside the trim** on every side (preflight checks).
- **Art safe margin:** faces, paws and anything important at least **0.375 in inside the trim**;
  keep faces out of the inner 0.5 in at the gutter so they don't disappear into the binding.
- **Spreads:** if one image spans two pages, nothing important crosses the centre fold.

**Text placement zones.** The art brief names one zone per page, and the Illustrator keeps that
zone calm (sky, wall, floor, grass):

- **Top band:** top ~30% of the page (default).
- **Bottom band:** bottom ~25% of the page.
- **Side column:** outer ~40% of a single page, for quiet moments.
- **Full-page text** (rare): on a plain Cream page facing a full-bleed illustration.

**Readability:**
- Never place text over busy art (faces, patterns, high-contrast detail). If the zone isn't calm
  enough, add a **soft panel**: Cream `#FBF3E4` at 80–90% opacity with rounded corners (~0.15 in)
  and 0.2 in padding, or a soft feathered glow behind the text.
- Text contrast must be clear at a glance; Ink on light, Cream on dark.
- Same zone style for the same kind of page across the book (don't jump around).

**Fixed pages:** title page (cover art crop or a vignette + title + series + author), copyright
page (plain Cream, small Andika), the last page (24) "Meet the Real Miss Marilyn" (photo + text, layout in
the series bible section 9).

## 5. Cover rules

Full wrap, one PDF: **back + spine + front**, plus 0.125 in bleed on all outer edges. Height 8.75 in;
width 17.25 in + spine (spine = page count x `config!kdp_spine_per_page_in`, 0.002347 in per page
for premium colour; ~0.056 in at 24 pages). Preflight checks size and spine.

**Front (right-hand panel):**
- Miss M is the focal point, recognisable at thumbnail size (~1 in wide on Amazon).
- **Title** in the top third, Fredoka Bold, max 2 lines, Ink or Cream with a soft shadow/panel if
  needed. Must read at thumbnail size.
- **Series badge** above or below the title: "The Adventures of Miss Marilyn" in a small rounded
  badge (Butter or Peach fill, Ink text). Same badge position on every book.
- **Author line** at the bottom: [TO FILL: author name as Clara wants it shown].
- Cover art is delivered without any text; the Builder adds all lettering.

**Spine:** no text while the book is under 79 pages (KDP rule). Continue the background colour
across it; nothing important within 0.0625 in of either fold.

**Back (left-hand panel):**
- **Blurb area:** top half to two-thirds, 50–90 words on a calm area or soft panel, Andika 14–16 pt.
  Written by the Publisher, rewritten/approved by Clara. Addressed to parents.
- Optional small vignette of Miss M or Zoey; optional age line ("For ages 2–6").
- **Barcode area:** leave the bottom-right **2 x 1.2 in** as flat background, at least 0.25 in
  from the trim edges. KDP places the barcode there; nothing else goes in it.
- Brand mark / imprint name if Clara adopts one: [TO FILL].

## 6. Printables (Etsy and lead magnets)

- Two versions of every file: **US Letter (8.5 x 11 in)** and **A4 (210 x 297 mm)**, 300 DPI.
- Keep everything at least **0.5 in** from the page edge (home printers can't print edge to edge).
- Colouring pages: clean black line art, line weight 2–3 pt (no thinner than 1.5 pt), closed
  shapes, big areas a 2-year-old can colour, no grey fills.
- Ink-friendly: white backgrounds; colour only where the product needs it.
- Small footer on each page: brand name and where to find the books (Andika 9 pt).

## 7. File naming

`{asset_id}_{short-desc}_v{n}.{ext}`

- `asset_id`: the ID from the assets tab (exact case).
- `short-desc`: lowercase, hyphens, 2–4 words, no spaces (e.g. `p07-plane-window`,
  `cover-front`, `char-sheet-miss-m`).
- `v{n}`: version number starting at 1; a revision is a new file with the next number, never an
  overwrite.
- Examples: `T-0042-A3_p07-plane-window_v2.png`, `T-0050-A1_interior_v1.pdf`,
  `T-0051-A1_cover-wrap_v1.pdf`, `T-0060-A1_coloring-pages-letter_v1.pdf` (asset IDs are `{task_id}-A{n}`).
- Prompts saved next to the art as `{asset_id}_{short-desc}_v{n}_prompt.txt`.

## 8. Never

- **No text in the art**: no letters, numbers, signs with words, logos, signatures or watermarks.
  Signs and books in scenes are blank or use simple shapes. All words are set by the Builder.
- **No named-artist style imitation**: never prompt "in the style of" any artist, illustrator,
  studio or franchise.
- **No existing characters**: nothing resembling characters from existing books, films, shows,
  games or toys, and no brand products or logos in scenes.
- No photos of children anywhere in books, printables or marketing.
- No fonts other than those in section 3; no unembedded fonts.
- No pure black backgrounds, no neon colours, no frightening imagery.
- No art that changes a character's markings, colours or proportions from the approved sheet.

---

*Kyle updates this file after Clara approves changes. Bots never edit it.*
