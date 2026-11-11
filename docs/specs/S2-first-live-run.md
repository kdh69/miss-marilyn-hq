# S2 — First live run

**Status:** not started · **Repo:** miss-marilyn-hq · **Needs first:** S1 · **Spends:** up to $3,
only after Kyle's yes in the session

## Why

Everything about the Claude team is built and unit-tested and none of it has touched the real
Sheet, Drive or fal. This session is the test, done in steps that each prove one thing before the
next one can do damage. It is a runbook more than a build: fix what breaks as it breaks, with tests.

## Needs from Kyle before the session

- The session runs on the cloud environment **miss-marilyn-hq** (or the laptop), with
  `GOOGLE_SERVICE_ACCOUNT_JSON` set. `MM_CORE_SHEET_ID` is already on the environment.
- For step 6: the fal key (a network secret for `queue.fal.run`, header Authorization, prefix Key;
  or `FAL_KEY`), and his yes on the $3 cap.
- For uploads without the Drive connector: the owner token (`GOOGLE_OWNER_REFRESH_TOKEN`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`). Not required to start.

## Read first

`docs/TEAM.md`, `.claude/skills/sweep/SKILL.md`, `docs/playbook.md`, `docs/knowledge/models.md`,
`docs/knowledge/illustration.md` (tests B1 to B3), and the 2026-11-01 decision in `docs/HANDOFF.md`.

## Steps

Stop at the first step that fails, fix the cause, and run that step again before going on.

1. **Environment.** `bash .claude/setup.sh` (lists which keys are set), `npm run doctor`. Record
   which lines are red and why. The setup script on the environment has never run in a fresh
   session: note whether `node_modules` and PyMuPDF were already there.
2. **Read-only.** `npm run bot -- kyle board`. Compare with `docs/HANDOFF.md`'s board: 40 tasks
   ending at T-0039, T-0038 `awaiting_mom`, T-0026 to T-0037 `blocked`. Any difference goes in the
   report before anything is written.
3. **Backup before the first write.** `npm run backup -- <a folder outside the repo>`. Check the
   row counts in `manifest.json` against the Sheet. On a cloud session the folder is lost with the
   session: download it or copy it to Drive by hand, and say where it went.
4. **One harmless write, by hand.** As the Orchestrator, add one request to Kyle with `apply`
   (`to: kyle`, body "Connection test from the Claude team, safe to close"). Check in the Sheet
   that it landed under the right headers with the ID the command printed, and that the panel's
   Inbox shows it. Then run one backend tick by hand (Actions → MM backend tick) and confirm it
   exits green and reverts nothing: this proves the log rows match what `integrityCheck` expects.
5. **First sweep, no art.** Give the Orchestrator the 11-01 decisions (the message in
   `docs/HANDOFF.md`), then `/sweep`. Expected: the rest of Book 1's chain is created (cover art,
   interior layout, cover wrap, KDP packet, each with a full brief), the Lister drafts the KDP packet
   with `[AUTHOR NAME TBD]`, Scout takes "comparable friendship and playground picture books".
   Art tasks are left alone: no cap has been given yet. Watch for: an agent's Stop hook firing
   (does the gate run, does it send an agent back, does it ever trap one), parallel agents hitting
   Sheets' rate limit, uploads (owner token, or the Drive connector plus `asset`).
6. **First pictures, cap $3** (only with the fal key and Kyle's yes, stated in the session):
   - a `dry=1` picture first, to rehearse the steps for $0;
   - **B3:** two page drafts (`kind=draft`, $0.08 each) with the existing character sheets as
     references, on a contact sheet beside the same pages from T-0039;
   - **B1:** one print-size page (`kind=page`, $0.30) with its draft as the first reference, and the
     same page without it. Run `check` on both: is a 4K result big enough to crop to 2588 x 2625?
   - Stop there and show Kyle the contact sheets. Do not start the 24 finals in this session.
   - Compare the costs rows with fal's dashboard.
7. **Write it down.** `docs/playbook.md`: minutes per step, Sheets calls, what one sweep used of
   the Claude allowance if it can be read, picture prices as billed. `docs/knowledge/`: turn the
   claims this run settled from unproven or videograph into proven, with the date and the task;
   answer B1 and B3. `docs/HANDOFF.md`: the board as it now is. Run the critic if anything failed.

## Done when

- Steps 1 to 5 passed on the live Sheet, and the report says what each agent did and what broke.
- Step 6 either ran within $3 with the contact sheets shown to Kyle, or is recorded as waiting on
  the key or the yes.
- Every fix made along the way has a test, and `npm run check` passes.
- Playbook, knowledge and handoff are updated; this spec's Status says which steps are done.

## Not in this spec

The 24 final pages, scheduled sweeps (roadmap L5: set up after two clean manual sweeps), and
anything in videograph.
