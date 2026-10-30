# Panel redesign: Clara's view and Kyle's view

Goal: phone and desktop equally good. Not a phone layout stretched to a desktop, and not a
desktop layout squeezed onto a phone. Each screen is laid out for both: the phone gets a bottom
tab bar, one column, a sticky save button and stacked rows; the desktop gets a sidebar, the
editor beside the art, tables, and keyboard arrows to move between pages.

Why: the old panel was a long scroll of cards with no clear next step. Only four of the eight
tabs fit on a phone, the Today page spent a whole screen on stat tiles before anything Clara
could act on, and the book editor sat below a grid of six page thumbnails. Clara's priorities,
in order, are: **write and edit books → see progress → jot ideas → accounts, socials and a
to-do list → money**. The panel reads in that order on every screen size.

Status: everything below is built (branch `panel-view-toggle`), including the follow-up pass
in section 11. What's left is polish from real use: Clara's first session on her phone will
tell us which words still read wrong.

The view toggle (done): Kyle's sidebar has a *Viewing as: Clara / Kyle* switch. It changes what
is rendered, never who is writing; server actions always use the signed-in identity. Clara never
sees the switch. Preview mode (no sign-in) defaults to Clara's view.

## 1. Two views, one app

| | Clara's view | Kyle's view |
| --- | --- | --- |
| Bottom tabs (phone) / sidebar (web) | **Books · Progress · Ideas · To-do · Money** | **Books · Progress · Inbox · System · Money** |
| Home | Books, with a "Needs you" strip on top | Inbox (routing, QC escalations, spend, halts) |
| Language | Plain words, no IDs, no status codes | IDs, task statuses, log, config |
| Writes | Book text, answers, notes, ideas, photos | Everything Clara can, plus routing, pause/resume, accounts |

Clara's "Needs you" strip replaces the Today page. It is one row per item: what it is, one button.
When empty it says so in one line and gets out of the way. Today's content moves into the
tabs where it belongs: approvals and questions attach to the book they are about, photos
attach to the request that asked for them, "Tell the team" becomes Ideas.

## 2. Books (the command center)

**Shelf** (`/books`): one tile per book with cover art or a placeholder, the stage in plain
words ("Writing · 4 of 12 pages are yours"), and a "Needs you" badge if anything is waiting.
Tap to open. Clara can **Start a new book**: title, who it's about, lesson, age range. That
writes a `book_plan` request (kind `idea`, product_id blank) for the Orchestrator; the Sheet's
`products` row is created by the backend after Kyle OKs it, so the panel still never writes
`tasks`.

**Book** (`/books/[id]`), phone layout top to bottom:
1. Title, stage, one-line status ("Art for pages 3–6 is being drawn").
2. "Needs you" for this book: approvals and questions, inline, one button each.
3. **Page strip**: horizontal, thumb-sized, with a dot on pages already in her words.
   Swipe or tap to move. Arrows + page counter ("Page 4 of 12").
4. **The page**: art large, then her text, then a save button that is always visible (sticky on
   phones). Autosave on blur after a short delay; "Saved" confirmation; conflict message if a
   bot changed the row (`Core.update` returns false).
5. "Show the AI draft" collapsed below her words. "Use the draft" copies it in.
6. "Note on this page" and the page's conversation, collapsed by default.
7. Book-wide: "Tell the team about this book" and the thread, collapsed.

Web gets the same order, with the art and her words side by side and the page full width;
the book thread sits below it. The data model does not change: `pages.text_final*` stays Clara's, `text_draft` the AI's.

Smaller editor wins: bigger type (17px) in the textarea, no "Sign in to edit" copy in her view
(preview mode says "Preview only"), save errors in words she can act on.

## 3. Progress

One list, grouped by book, each book a card with a stage track:
**Story → Art → Layout → Publish → On sale**, the current stage lit (cover art counts as Art,
cover layout as Layout). Under it,
at most three lines: what's happening now, what's waiting on her, what's next. Stage comes from
`tasks.task_type` and status, mapped in `lib/data.ts` (`STAGES` already exists; label it).
No task table, no log in Clara's view. Kyle's Progress keeps the open-task table and log, plus
QC results and attempts.

## 4. Ideas

A notepad: a big text box at the top ("Jot an idea"), then her ideas newest first, each with
where it went ("Kyle saw it", "Team is on it", "Became: Book 2"). Backed by `requests` with
kind `idea` (and `rule` for "always do this", shown as a second tab "House rules"). Scout's
research shows here as "Ideas from the team" cards she can accept ("Make this a book" → an
`idea` request citing the `research_id`). Dismiss is left out: it would mean the panel writing
the `research` tab, which the panel rules don't allow. Scout's own review marks it instead.
The Trends tab goes away in her view.

## 5. To-do, accounts and socials

**To-do**: her open items in date order, each one tappable to where she does it (a book, an
account, a photo request). Sources: `mom_queue` items without an answer, `requests` to her
without a reply, `accounts` owned by Clara with status `todo`/`in_progress`, and `content` rows
scheduled this week. A checkbox finishes what the panel is allowed to finish (`mom_queue`
Done, request reply, Clara's own accounts). This needs one new write: Clara may set status on
accounts she owns (today only Kyle can).

**Accounts & socials**: same page, lower half. Per service: a two-letter tile (no brand
logos), status, an "Open" link to the service's sign-in page (a small map in `lib/labels.ts`;
the accounts tab has no URL column), and the login email. Grouped "Set up now / Later" instead of phase
codes. Passwords stay out, as now.

**Schedule**: the content calendar (`content` rows approved or scheduled) as a week strip at
the top of To-do.

## 6. Money

Unchanged in substance, simpler in words: "Sales so far", "Spent so far", "Profit", then per
book. Bot spend today moves to Kyle's view only. Shows "Sales start after launch" until the KDP
and Etsy imports land.

## 7. Kyle's view

Technical and dense is fine. Inbox = messages to route + escalations + QC fails + halts +
spend. System = pause/resume, config, backend health (last tick from `log`), integrity notes.
Books and Progress reuse Clara's components with IDs and statuses turned on.

## 8. Mobile shell

- Bottom tab bar on phones (five tabs, icons + labels), sidebar on web. Toggle lives in a
  small account sheet (tap the avatar) on phones, in the sidebar on web.
- Sticky page header with the back link and the one primary action.
- Cards flatten to full-width sections with 16px gutters; no two-column grids under 768px.
- Minimum tap target 44px; inputs 16px+ so iOS doesn't zoom.
- No horizontal page scroll anywhere; tables become stacked rows on phones.

## 9. Build order (all done)

1. **Shell**: bottom tabs, role-based tab sets, account sheet, Today removed. Old routes
   (`/messages`, `/next`, `/trends`, `/accounts`) redirect to their new homes.
2. **Book editor**: page strip + single page + sticky save + autosave + draft toggle.
3. **Needs you strip** on the shelf and inside each book.
4. **Progress** stage track per book.
5. **Ideas** notepad + Scout cards.
6. **To-do + Accounts** with Clara's account write (owner check in `setAccountStatus`) and the
   week strip.
7. **Money** copy pass.
8. **New book** flow (one `idea` request row).

## 10. Phone vs desktop checklist

| | Phone | Desktop |
| --- | --- | --- |
| Navigation | bottom tab bar, 6 tabs, icons + labels | sidebar, same 6 |
| Account / view switch | avatar → sheet | bottom of sidebar |
| Book editor | art, then words, Save rides above the tab bar while unsaved | art beside words, Save inline, ← → keys change page |
| Tables | stacked label/value rows | real tables |
| Header actions | stack under the title | sit to the right of the title |
| Inputs | 16px so iOS doesn't zoom | inherit |
| Sideways scroll | none (checked) | none (checked) |

## 11. Follow-up pass

- **Untouched drafts are never saved as her words.** A page with only the AI draft saves only
  after she edits it or taps "Use the draft". Before this fix, the editor autosaved the draft
  as `text_final` two seconds after opening the page.
- **No lost words.** Switching pages (arrows, strip, swipe) saves what she typed; closing the
  browser tab with unsaved words asks first; a failed save keeps her words and says so.
- **Swipe** the art left or right to turn pages on a phone.
- **Sticky back bar** on phones: "← All books" and the title stay under the top bar.
- **To-do ticks** close Done-type asks (photos, rewrite) and her own accounts. Approvals and
  publish asks have no tick: they open the book, so she sees what she is OK-ing.
- **Accounts** grouped "Set up now / Later", with Open links.
- **Her notes say where they went**: "Kyle saw it", "Sent to the team", "Team is on it".
- **New book** asks for an age range. The book thread is collapsed under "Talk to the team".
- **Kyle**: QC result and attempts in Progress; recent backend notes on System.

## 12. Overview tab (added after review)

The old Today page was missed: a single screen that says what's up. It's back as **Overview**,
the first tab and the home page for both views (six tabs now; labels still fit on a 375px
phone). It replaces "Books is home" from section 1.

- **Clara:** greeting and one line; four numbers (needs you, books going, pages in her words,
  sales); *Keep writing* → opens her next draft-only page directly (`/books/[id]?page=N`);
  "Needs you"; *Tell the team*; photos; each book's stage track; coming up; Scout's latest.
- **Kyle:** to route, stuck, on Clara, bots today; his questions; *Tell the bots*; books;
  coming up; latest activity and last backend tick.
- On phones the numbers are one compact strip, so *Keep writing* and "Needs you" are on the
  first screen. On desktop they are the big tiles, with what-to-do on the left and
  where-things-are on the right.
- The Books shelf drops its "Needs you" strip (it lives on Overview and inside each book) and
  links back to Overview when something is waiting.

## Rules kept

- The panel still writes only `mom_queue` answers, `requests`, `pages.text_final*`, photos, and
  (Kyle) pause and accounts. Adding "Clara can update her own accounts" is the one new write.
- Nothing publishes or spends without her Approve in `mom_queue`.
- Status words come from one map in `lib/data.ts`, not from strings scattered in pages.
