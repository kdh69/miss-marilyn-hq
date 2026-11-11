# Miss Marilyn HQ — for any coding agent

This repo makes children's picture books with a team of AI agents, a Google Sheet (MM Core) as the
only source of truth, and a small backend. It is written for Claude Code, but nothing that matters
depends on it: the rules are enforced by a command, not by a model.

Start here, in this order: [`CLAUDE.md`](CLAUDE.md) (the project's rules; they apply to you too),
[`docs/HANDOFF.md`](docs/HANDOFF.md) (where things stand), [`docs/ROADMAP.md`](docs/ROADMAP.md) (the
plan), [`docs/TEAM.md`](docs/TEAM.md) (how the team works).

## Working on the code

- Node 22 (`.nvmrc`), `npm ci`, then `npm run check` (typecheck, tests, KDP preflight tests, panel build).
- `packages/core/schema.json` is the source of truth for the Sheet. Read and write rows by header name.
- Commit and push only when Kyle says so. The repo is public: no keys, no story text, no emails.

## Being the team without Claude Code

The roles live in `.claude/agents/*.md`. Claude Code runs them as subagents; any other agent can
play one:

1. `npm run team:export` writes each role as plain text (house rules + description) to
   `.mm-work/team-export/`. Give one file to an agent as its instructions.
2. That agent needs a shell in this repo and the keys in `.env` (`.env.example` lists them).
3. Every read and write of MM Core and Drive goes through `npm run bot -- <role> <command>`
   (`apps/backend/src/bot.ts`). Who may write what, the budget gate for paid pictures and the print
   checks are all inside that command, so they hold for any agent.
4. A sweep is the sequence in `.claude/skills/sweep/SKILL.md`: orchestrator → makers → quality
   checker → hand-in → QC → orchestrator → critic. A person or a script can drive it; after each
   agent finishes, check its last line with `npm run bot -- <role> verify "<line>"`.

A chat-only platform with no shell can't run `npm run bot`, so it can't be given the Sheet safely.
Use it for drafting only, and bring its work in through an agent that can.

## If something is lost

`npm run backup -- <dir>` copies every tab of MM Core to JSON; `npm run sheet:setup` builds an empty
Sheet from the schema and `npm run restore -- <dir>` fills it. The roadmap's "Recreatable" section
lists what else is needed and what is still missing.
