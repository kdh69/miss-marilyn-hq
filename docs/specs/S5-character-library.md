# S5 — Character library

**Status:** not started · **Repo:** miss-marilyn-hq · **Needs first:** S2 · **Spends:** $0

## Why

Miss Marilyn has to be the same cat on page 3, on the cover, in Book 2 and in a video. Today her
look lives in scattered places: lessons L-0001 to L-0007, the series bible, the style guide, a
character-sheet task's output files, and photos in Drive. Each art brief has to gather them again,
and a video made in videograph would start from nothing. One library, with one entry per
character, fixes both. videograph does this for its own cast (`docs/<channel>/characters/`), and
its second episode reused two characters for $0.

## Read first

`docs/knowledge/illustration.md`, `docs/brand/series-bible.md`, `docs/brand/style-guide.md` §1–2,
`apps/backend/src/bot.ts` (`brief`, `image`, `fetchOne`), `apps/backend/src/lib/image.ts`,
`formats/picture-book.json`, the `lessons` tab (`npm run bot -- kyle rows lessons status=active`).

## Decisions already made

Images stay in Drive (this repo is public); the repo holds a manifest that points at them by asset
ID (roadmap D3). Descriptions of animals are fine in a public repo; photos and art are not.

## What to build

1. **`characters/characters.json`** (new top-level folder), one entry per character and stage:

   ```json
   {
     "id": "char_miss_marilyn",
     "name": "Miss Marilyn",
     "species": "cat",
     "stage": "adult",
     "series": "MM",
     "description": "60 to 150 words of prompt language: exact colours, size next to others, eye shape, marks by shape and place, how she moves. The resting look only, in positive words.",
     "must_show": ["red string", "nose-smudge beauty mark"],
     "style": ["watercolour and ink", "…from the style guide"],
     "sheets": ["A-T0025-01"],
     "photos": ["P-20261030-001"],
     "approved": "2026-11-…  by Clara",
     "notes": "what took more than one try"
   }
   ```

   `sheets` and `photos` are asset IDs in MM Core (the files are in Drive). Write the first entries
   from what exists: Miss Marilyn, Mama, Papa, Gussie. Take every fact from the lessons, the bible
   and the approved sheets; **Kyle or Clara approves each description before it is used** (show
   them the text beside the sheet). Where the lessons and the bible disagree, the lessons win, and
   say so in the report.
2. **`apps/backend/src/lib/characters.ts`**: load and validate the manifest (ids unique and
   `char_…`, description 60 to 150 words, every `must_show` phrase appears in the description,
   none of the words a negative would use: "no", "not", "without", "never"). A test runs the
   validator on the committed file, and a second test checks every asset ID exists when run with keys
   (doctor does this live; the unit test only checks shape).
3. **`npm run bot -- <role> character [id]`**: with no ID, the list; with one, the entry plus each
   sheet's and photo's file name and URL from `assets`.
4. **`image … character=char_miss_marilyn,char_gussie`**: for each character, append its
   description to the prompt under a `Characters:` heading and add its first sheet (then its first
   photo, if there is room) to the references, after any `ref=` the caller gave and within the
   model's limit (`maxRefs`). The recipe file records the characters used. Agents stop pasting
   descriptions into prompt files by hand.
5. **`brief`** prints the characters named on the task's pages (`pages.characters`) with their
   library IDs, so the Illustrator and the Quality Checker see the same canonical text.
6. **`npm run characters:export -- <dir>`**: for videograph (S7). Writes `<dir>/characters.json` in
   videograph's shape (`id`, `character`, `stage`, `name`, `kind: "character"`, `description`,
   `styleTokens`, `images`, `notes`) and downloads each character's sheet images into
   `<dir>/<character>/<stage>_<view>.png`. Never into this repo: refuse a target inside it.
7. **Docs and agents:** `illustrator.md` (use `character=`), `quality-checker.md` and `qc.md` (judge
   against the library entry), `orchestrator.md` (a new recurring character means a sheet task
   first, then a library entry), `docs/knowledge/illustration.md`, `docs/TEAM.md` commands table.
   A new lesson is not needed: the library replaces repeating L-0001 to L-0007 in prompts, but the
   lessons stay as the rules the entries are checked against.

## Tests

Validator tests (good entry, each kind of bad entry); `image` with `character=` builds the prompt
and reference list in the right order and respects `maxRefs` (pure function, no network);
`characters:export` writes videograph's shape (fixture in, JSON out).

## Done when

- `npm run check` passes; the manifest has the four characters with approved descriptions.
- One `image … dry=1 character=…` run shows the assembled prompt and references in the recipe file.
- If the fal key is in place and Kyle gives a cap: one real draft made with `character=` only (no
  hand-written description) sits beside the same page from T-0039 on a contact sheet.

## Not in this spec

A consistency score against the sheet (roadmap Q4). Stages (kitten Miss M) until a book needs one.
