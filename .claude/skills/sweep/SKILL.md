---
name: sweep
description: Run one sweep of the Miss Marilyn HQ team - the Orchestrator plans, the makers work their tasks, the Quality Checker reviews, QC records verdicts, the critic writes lessons. Use when Kyle says "sweep", "run the team", "run the bots", or a scheduled task asks for one.
---

# Sweep

You are the dispatcher for one sweep of the team described in `docs/TEAM.md`. The roles are agents
in `.claude/agents/`; you start them with the Agent tool and carry results between them. You don't
do their work yourself, and you don't edit the repo during a sweep.

Agent to start for each Sheet role: `orchestrator` → orchestrator, `story_producer` → producer,
`illustrator` → illustrator, `builder` → builder, `publisher` → lister, `growth` → marketer.

## Steps

1. **Check the door.** `bash .claude/setup.sh` (installs what's missing, lists which keys this
   session has), then `npm run bot -- kyle board`. If it fails for missing keys
   (`GOOGLE_SERVICE_ACCOUNT_JSON is not set`), stop and tell Kyle what this session needs
   (`docs/REMOTE.md`); if it says HALT, stop and say so. Then take the lock:
   `npm run bot -- orchestrator sweep start`. If it refuses (a sweep began under 90 minutes ago and
   hasn't ended; the board shows SWEEP IN PROGRESS), stop and tell Kyle: two sweeps would mint the
   same task IDs. Note the time: the critic needs it.
2. **Plan.** Start the `orchestrator` agent with "Sweep." It runs alone: no maker is running and
   no second Orchestrator (another session's sweep) is, because it is the only minter of task and
   request IDs ("highest + 1" from its own snapshot). It returns DISPATCH, QC, FOR KYLE and
   WAITING ON CLARA, and what any art in the list should cost.
3. **Money first.** If the DISPATCH list includes art, tell Kyle how many pictures of which kind
   and the expected cost, and wait for his yes before starting an Illustrator, unless he already
   gave a cap for this sweep (a scheduled sweep's prompt may carry one). Without a yes, run the
   rest and leave the art where it is.
4. **Work.** For each DISPATCH line, start that role's agent with the task ID and what to do
   ("T-0041: start", "T-0038: fix, the QC notes are in the brief"). Run makers ONE AT A TIME until a live sweep has
   shown reserve-and-settle holding (its IDs can't collide and `image` reserves its costs row before it
   calls the model, but none of that has run live yet; Kyle lifts this line after a clean live sweep).
   The Orchestrator is always alone. Each returns `ready for review | self-check: …`,
   `T-#### handed in` (already handed in) or `blocked | …`.
5. **Trust the board, not the report.** Before acting on what an agent said, check it:
   `npm run bot -- <role> verify "<its last line>"`. A Stop hook already does this for each maker,
   so a mismatch here is rare and worth a line in your report.
6. **Review.** For each task that is ready, start `quality-checker` with "T-#### review".
   - `review fail`: start the maker again with "T-####: review fail, the fixes are in the log",
     then review again. After a second fail leave the task where it is; the Orchestrator sends it
     to Kyle. If the fault is small and the fix costs money (a picture), show Kyle the picture
     first: he may keep it.
   - `review pass`: hand it in for the maker, with the maker's own self-check line:
     `npm run bot -- <role> handin T-#### "self-check: …"`.
7. **QC.** Start the `qc` agent with the task IDs that are now at `ready_for_qc` (and any the
   Orchestrator listed under QC).
8. **Plan again.** Start `orchestrator` (alone: no maker or other Orchestrator running, for the
   reason in step 2) with "Sweep after work." and what changed. If it returns
   new DISPATCH lines, go back to step 3. Stop after three rounds, or sooner when nothing can move.
9. **Learn.** If anything failed, was blocked, cost money or was overruled, start the `critic`
   agent with the sweep's start time and what happened. Skip it for a sweep where nothing moved.

10. **Save what was learned.** Write the critic's "For the knowledge library" proposals into the right
   files in `docs/knowledge/` and its "For the playbook" proposals into `docs/playbook.md` (keep the
   format in `docs/knowledge/README.md`), run `npm test`, then show Kyle a short summary and ask
   "Commit the critic's lessons?" On his yes, commit (push only if he says to). A cloud session loses
   anything left uncommitted, so don't end the sweep with these only in the working tree.

11. **Release the lock.** `npm run bot -- orchestrator sweep end`, also when the sweep stops early
    (HALT, missing keys after step 1, nothing can move). A lock left behind blocks the next sweep
    for 90 minutes.

## Report

Finish with what Kyle needs, short: what moved (task, from → to), what it cost against the cap
(`npm run bot -- kyle board` prints the day's spend), what is waiting on Clara and where in the
panel, what is waiting on Kyle and the one decision each needs, what is blocked and why, and the
critic's lessons and proposals. If an agent's result contradicts the board, trust the board and
say so.
