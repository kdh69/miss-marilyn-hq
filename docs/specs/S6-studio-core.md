# S6 — studio-core: shared generation code

**Status:** not started, and deliberately waiting · **Repos:** a new package, then both ·
**Needs first:** S2, and the trigger below · **Spends:** $0

## Why, and why not yet

`apps/backend/src/lib/image.ts` here is a second copy of what videograph's adapters already do
(fal's queue, Nano Banana Pro and 2, prices, the privacy header). Two copies drift: when a model
retires or a price changes, both need the same fix, and one will be forgotten. A shared package
fixes that.

It is not worth doing before the code has run once here, or while there is only one image model
and one product format: a package adds a release step, an install token and a second repo to
rebuild from. **Start this spec when one of these happens:**

- a second image vendor is wanted here (roadmap R7), or
- a second product format needs pictures (hardcover, colouring PDF, printables), or
- a model change forces the same edit in both repos for the first time.

Until then: when either copy changes, make the same change in the other in the same week, and note
it in both playbooks.

## Read first

Here: `apps/backend/src/lib/image.ts`, `lib/gates.ts`, `formats/picture-book.json`,
`docs/knowledge/models.md`. In videograph: its adapter interface, the fal base adapter, the image
adapters, the ledger, the mock adapter and their tests (find them from its README's "How it's
built" table). Compare the two image paths line by line before designing anything.

## What goes in the package, and what doesn't

| In `studio-core` | Stays in each repo |
|---|---|
| The adapter interface (capabilities, estimate, generate, poll, download) | Where state lives: MM Core here, the run manifest there |
| The fal client wrapper: queue, privacy header, expiry, error hints | Budget *storage*: costs rows here, the manifest's ledger there |
| Image adapters: Nano Banana Pro and 2, GPT Image 2 as fallback | Formats and caps (`formats/*.json` in each repo) |
| A mock adapter for practice runs | Video, audio and assembly (videograph only) |
| The budget gate as a pure function: (spent, reserved, estimate, caps) → allow or refuse | Print checks for books (here); clip checks (there) |
| Image helpers both use: downscale a reference, a contact sheet | Agents, skills, knowledge files |
| A price table with the date each price was read | |

The gate is the important part of the boundary: each repo passes in what it has spent and gets
back a decision; neither's storage leaks into the package.

## Kyle decides

Where the package lives. Options, simplest first:

1. **A private GitHub repo, published to GitHub Packages** as `@kdh69/studio-core`. Both repos add
   an `.npmrc` that reads a token from the environment. Needs a read token in GitHub Actions for
   both repos, in Vercel for videograph (its web app uses the adapters), and in the cloud
   environments. Recommended: private, versioned, standard.
2. **A public GitHub repo.** No tokens anywhere. Only if Kyle is happy for the adapter code to be public.
3. **No package: a sync script.** One repo is the source; the other holds a vendored copy with a
   `VENDORED.md` naming the source commit, and a test that fails when the copy is edited by hand.
   Least moving parts and the easiest to rebuild from; the cost is a manual sync.

Confirm how each option installs on Vercel and in Actions against the vendors' current docs
before choosing; this spec was written without testing any of them.

## What to build (once triggered and decided)

1. The package, with videograph's adapters as the starting point (they have run for real) and its
   tests moved with them. Version 0.1.0 changes no behaviour.
2. videograph imports it and deletes its own copies. Its unit tests, its worker test and one smoke
   call on the cheapest image model must pass. This is the risky half: do it first, in its own
   session, in that repo.
3. Here: `lib/image.ts` keeps only the book-specific parts (`fitToPage`, `checkArt`, the format
   file) and calls the package for generation; `planImage` calls the package's gate with totals
   read from `costs`. `npm run bot … image` behaves exactly as before; the recipe file gains the
   package version.
4. A second vendor (if that was the trigger): one more adapter, chosen per kind in
   `formats/picture-book.json`, with the fallback order written there.
5. Both repos' docs: one paragraph each on where generation code lives and how to bump it.

## Done when

Both repos build and pass their checks on the package; one real picture has been made through it
from each side under a stated cap; `docs/REBUILD.md` (S4) covers the package and its token.

## Not in this spec

Sharing agents, knowledge files or formats between the repos: they are different crafts, and
copying an idea across (as on 2026-11-11) costs less than coupling them.
