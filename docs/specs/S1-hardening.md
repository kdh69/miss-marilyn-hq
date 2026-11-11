# S1 — Hardening before the first live sweep

**Status:** not started · **Repo:** miss-marilyn-hq · **Needs first:** nothing · **Spends:** $0

## Why

`npm run bot` has only run against an in-memory Sheet. Several agents use it at once, each a
separate process with its own snapshot of MM Core. Three things break under that, and they are
cheaper to fix now than to clean out of the live Sheet later.

## Read first

`apps/backend/src/bot.ts`, `apps/backend/src/lib/team.ts`, `apps/backend/src/lib/gates.ts`,
`packages/core/src/sheet.ts` (`Core.append`, `Core.update`), `apps/backend/src/jobs/gatekeeper.ts`
(`spendGuard`, `integrityCheck`), `tests/team.test.ts`, `tests/gates.test.ts`.

## What to build

### 1. IDs that can't collide between processes

Today `MINT` in `lib/team.ts` takes "highest number + 1" from the caller's snapshot. Two agents
appending at the same moment get the same ID.

| Tab | Who appends, and when | Change |
|---|---|---|
| `costs` | any maker, in parallel | `C-<yyyymmddHHMMSS>-<4 random base36 chars>`. Update `mintCostId` and the `cost` and `image` commands. Nothing reads the old `C-####` shape (check with grep before changing) |
| `content` | several Marketers in parallel, one per task | `C-<task id without the dash>-<nn>`, counted within the task: `C-T0043-01`. The panel's "Posted <id> <link>" mark takes any ID (`MARK` in `jobs/marketing.ts`) |
| `assets` | already per task (`A-T0026-01`) | none |
| `tasks`, `requests`, `products`, `skus` | the Orchestrator only | none in code; add the rule to `.claude/skills/sweep/SKILL.md`: one Orchestrator runs at a time, never beside another |
| `lessons` | the Orchestrator and the critic | none in code; the sweep already runs the critic last, alone |
| `research` | Scout, alone | none |

Existing rows keep their IDs. Tests: two `planOps` calls on the same snapshot produce different
content IDs for different tasks; `mintCostId` called twice returns different IDs.

### 2. Reserve before the call, settle after it (pictures)

Today `image` checks the caps, calls fal, then writes the costs row. Two calls at the same moment
both pass the check, and a crash between the call and the row loses the record of a paid call.
Do what videograph's ledger does:

1. `planImage` as now (attempts, task cap, day cap).
2. **Reserve:** append the costs row first, with the estimate and a note ending `· reserved`.
3. **Re-check:** load `costs` and `config` again. If the day's total or the task's total (reserved
   rows included) is now over its cap, or this subject now has more than `maxAttemptsPerImage`
   live rows, **release**: set this row's `amount_usd` to 0 and its note to end `· released`, and
   refuse with the same messages `planImage` uses.
4. Call the model.
5. **Settle:** on success, drop `· reserved` from the note. On failure, set `amount_usd` to 0 and
   end the note `· failed, not billed` (fal doesn't bill failed jobs).

Attempts count rows for that task and subject whose note doesn't end in `released` or
`failed, not billed`. Guard against a loop of failures: refuse when a subject has 6 rows of any
kind. Put the pure parts (what counts as an attempt, the re-check) in `lib/gates.ts` with tests;
`costs` has an ID column and no `updated_at`, so `Core.update` works on it without the conflict check.

`spendGuard` in the backend sums `ai_credits` rows by `amount_usd`, so reserved rows count toward
HALT while a call is in flight and released or failed rows count as 0. No backend change.

### 3. One orchestrator, stated

In `.claude/skills/sweep/SKILL.md`, step 2 and step 8: say that the Orchestrator runs alone (no
maker running, no second Orchestrator), because it is the only minter of task and request IDs.

### 4. Findings from the 2026-11-11 code review

An independent review of the same files ran on 2026-11-11. Its confirmed findings are listed in
[`S1-review-findings.md`](S1-review-findings.md) when that file exists; fix each one marked high
or medium with a test, and say in the session report which you fixed and which you judged not a
defect and why. If the file doesn't exist, run `/code-review` on the files under "Read first" and
treat its confirmed findings the same way.

### 5. Kyle's settings file

Claude isn't allowed to write `.claude/settings.json` for itself. Give Kyle this to add by hand
(it allows the team's own commands without prompts, blocks direct calls to fal and Google, and
runs the setup script at session start):

```json
{
  "permissions": {
    "allow": ["Bash(npm run bot *)", "Bash(npm run qc*)", "Bash(npm run doctor*)", "Bash(npm run knowledge*)",
              "Bash(npm test*)", "Bash(python3 -I apps/backend/preflight/preflight.py *)",
              "Read(.mm-work/**)", "Write(.mm-work/**)"],
    "deny": ["Bash(curl *fal.run*)", "Bash(curl *fal.ai*)", "Bash(curl *googleapis*)", "Read(.env)", "Write(.env*)"]
  },
  "hooks": { "SessionStart": [{ "hooks": [{ "type": "command", "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/setup.sh\" --quiet", "timeout": 300 }] }] }
}
```

## Done when

- `npm run check` passes, with new tests for 1 and 2.
- The in-memory walk-through still works: create a task, start it, `image … dry=1`, `check`,
  `contact`, `verify`, hand-in refused without a review. (The harness from the 11-11 session wasn't
  kept; a committed version is part of this spec: `tests/bot.flow.test.ts`, the real `Core` and
  `run()` from `bot.ts` over a fake Sheets API object.)
- `docs/TEAM.md` and `docs/knowledge/models.md` describe reserve and settle.

## Not in this spec

Running anything live (S2). A lock or queue across processes: the reserve-and-re-check is enough at
this size.
