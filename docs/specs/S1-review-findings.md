# S1 — Findings from the 2026-11-11 code review

An independent read of `bot.ts`, `lib/team.ts`, `lib/gates.ts`, `lib/image.ts`, `backup.ts` and the
Stop hook, against the Sheet client, the schema and the backend jobs. Findings 1, 3 (renaming), 5,
10, 11 and 12 were reproduced against an in-memory board; the rest come from reading the code
paths. Nothing was run against the Sheet, Drive or fal. Line numbers are as of commit `9b13a29`.

Each finding has a disposition: **S1** (fix in the hardening session, with a test), **S4** (belongs
to the backup spec), or **accept** (known, with the reason).

## High

**F1. Concurrent processes mint the same ID.** `lib/team.ts` (`MINT`, `mintAssetId`), `bot.ts`
(`register`, `image`, `cost`). Every new ID is "highest in my snapshot + 1" and nothing re-checks at
write time.
- `content`: two Marketer tasks both mint `C-0011`. The backend approves posts by `content_id` and
  `Core.update` takes the first row with that ID, so Clara approving one batch can approve the
  other's posts.
- `assets`: two uploads to one task in parallel both mint `A-T0039-01`; `fetch` resolves to the
  first row, the QC gate to the last.
- `costs`: any two overlapping `image` runs. Cosmetic until something updates costs by ID, which
  S1's reserve-and-settle does.
- `tasks`: two overlapping sweeps (a scheduled one and a manual one) duplicate `T-####`, which also
  merges their log history in the integrity check.
- **S1.** See S1 §1, which now covers assets and overlapping sweeps too.

**F2. A billed picture can leave no costs row and no attempt.** `lib/image.ts` (`generateImage`),
`bot.ts` (`image`). The row is written only after the call returns, and three paths throw after fal
has taken the job: the 6-minute poll timeout (the job isn't cancelled and may still finish), a failed
download of the result, a status poll that fails. Each is billed, records $0 and counts no attempt,
so retries are unlimited and no cap moves. Also: if the costs append fails, the picture is lost,
because the file is written after it.
- **S1.** Reserve before the call (S1 §2). On a timeout, cancel the fal job, and keep the row at
  full price with the note `· unconfirmed (request <id>)`: assume billed until proven otherwise.
  Write the picture to disk before touching the Sheet again.

## Medium

**F3. The gate checks a stale snapshot, and attempts are keyed on free text.** `lib/gates.ts`.
- Parallel calls all see the same spend: overshoot of up to N−1 calls on every cap. **S1** §2.
- The same subject in parallel writes the same file name; several are paid for, one survives.
  **S1**: the file name carries the costs row's ID, not the attempt number.
- `page=5` is refused after three attempts, but `page=05` or `name=page5` starts again at
  attempt 1. **S1**: normalise the subject (`page` parsed as an integer, `name` lower-cased), and
  refuse a `name` that looks like a page.
- `planImage` allows spend up to exactly the daily cap (`>`), while the backend's spend guard HALTs
  at `>=`: the last allowed picture halts every write until Kyle sets RUN. **S1**: refuse at `>=`
  less one picture's price, so the team stops before the guard does.

**F4. `restore` fights the integrity check.** `backup.ts`, `jobs/gatekeeper.ts`.
- `--into-live` rewrites task statuses from the backup and leaves the live log alone, so on the
  next tick every rolled-back status is an unlogged, mostly illegal change and is reverted, with an
  alert each.
- A fresh restore that fails partway through the log can only be rerun with `--into-live`, which
  then skips the log for good; the next tick reverts tasks to whatever the partial log says.
- **S4.** See S4 item 7.

**F5. The three-in-progress limit counts tasks on paused and retired books.** `lib/team.ts`
(`planMove`, start). A paused book with three in-progress tasks for a role blocks that role from
starting anything on any book, while the board shows none in progress. **S1**: exclude parked
products, as the board does.

**F6. The caps don't fit the art workflow.** `lib/gates.ts`, `formats/picture-book.json`.
- A page-art task for a whole book is 24 × $0.30 = $7.20 with no retries, over the $6 task cap. It
  is refused at page 21, sooner with retries.
- Attempts never reset. A page that used its three attempts can't be fixed when QC sends the task
  back, which is exactly when it needs fixing.
- **S1, with a decision for Kyle.** Recommended: the task cap becomes a per-picture budget times
  the pictures the task covers (`perImageCapUsd`, default 2.5 × the kind's price, so a page gets
  two retries and a few spare across the task); attempts count per **round** (since the task last
  entered `in_progress`), with a lifetime limit of 6 per picture before a person decides. The daily
  cap stays as it is. Art tasks cover a few pages each, as T-0026 to T-0037 do.

**F7. A log row can carry a stale status that the integrity check then acts on.** `bot.ts`
(`note`, `review`; moves write the status first and the log row second). If another process's
transition lands between the load and the write, the last `to_status` in the log is the old status,
and the next tick can revert a legal change (for example QC's `awaiting_mom`, which then closes
Clara's card). The window is a second or two, longer under rate-limit backoff.
- **S1.** `note` and `review` rows are written with an empty `to_status` and `from_status`: the
  integrity check ignores rows without a `to_status`, and `latestReview` reads only the actor and
  the message. Check `npm run qc`'s listing and the panel's log views still show them. For moves,
  the order (status, then log) matches the backend's own; leave it.

**F8. `apply` writes one call per row and isn't atomic.** `bot.ts` (`apply`). Twelve new tasks are
24 writes; a failure at row 7 leaves six written, and a rerun mints fresh IDs for them, so they are
duplicated. **S1**: one `Core.append` per tab (it already takes an array), log rows for new tasks in
one append, and the printed result says exactly which rows landed. Updates stay one at a time.

## Low

**F9. `upload` validates after the file is in Drive, and misreads Sheets errors.** `bot.ts`.
`asset_type`, `rights_source` and `made_with` are checked after `files.create`, so a refused call
leaves an orphan file and the retry uploads it again; a Sheets 429 ("Quota exceeded") is reported as
Drive refusing the upload; and the advice after a failed link appends a second assets row.
**S1**: validate first; separate the Drive call's errors from the Sheet's; make `asset` skip a file
whose URL already has a row for that task.

**F10. `verifyClaim` reads every line, not the closing line.** `lib/gates.ts`. A sentence earlier
in the message that mentions a task and "blocked" or "review fail" is treated as the claim, which
can push an agent to block a healthy task. A maker that has already handed in has no valid closing
line. **S1**: judge only the last non-empty line; accept `T-#### handed in` when the board says
`ready_for_qc` or later.

**F11. Permission gaps.** `lib/team.ts`, `bot.ts`.
- A maker can change `file_url` or `status` on its own asset after QC passed or while Clara's card
  is open. **S1**: only while the asset's task is `in_progress` or `blocked`.
- The Orchestrator can set `from`, `reply` and `reply_by` on its own request. **S1**: `from` is
  never settable; `reply` and `reply_by` belong to whoever the request is addressed to.
- `cancel` works from `done`, `approved` and `publishing`. **S1**: refuse from those and from the
  statuses the backend holds; Kyle can still do it with `npm run task`.
- `cost` lets any role add a costs row to any task. **S1**: the task's owner only.
- The role is a command-line argument, so all of this assumes an agent uses its own role name.
  **Accept**: the agents are ours and the Stop hook and log name the role; a per-role secret would
  add ceremony without stopping a model that wanted to lie.

**F12. Crashes and waste.** `bot.ts`, `lib/team.ts`.
- `apply` with a null entry, and `check` with no file, throw raw errors. **S1**: usage messages.
- A new `pages` row given as `id` without `set.page_id` is refused. **S1**: `id` fills the ID column.
- Every command loads all tabs and the whole log, including `check`, `fetch` and `verify`.
  **S1**: `check` loads nothing; the others load only the tabs they read (`Core.load` takes a list).
- `taskFolder` makes three Drive list calls per upload. **Accept** for now; cache if S2 shows
  rate-limit trouble.

## What looked sound

- Rows and columns: everything goes through `Core.append` and `Core.update` by header name and ID,
  and the hand-built costs and assets rows match the schema.
- Lost updates: every update handles `Core.update` returning false.
- Permissions: `text_final` and the backend's columns are unreachable; the Publisher's and
  Marketer's status limits match what the backend expects; HALT and paused-book checks hold.
- The Stop hook fails open on missing keys, a timeout or a crash, and blocks only on a contradiction.
- `fitToPage` and `checkArt` agree with each other and with the format file.
- The normal path's log rows match what the integrity check expects, and all five moves are legal
  for a bot, so a missing row is backfilled, not reverted.
