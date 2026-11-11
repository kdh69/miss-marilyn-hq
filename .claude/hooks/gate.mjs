#!/usr/bin/env node
/**
 * Verifier gate: the Stop hook on each maker and on the Quality Checker (the pattern from the
 * videograph repo). When an agent tries to finish, its last message is checked against MM Core:
 *   "T-#### ready for review" needs uploaded files on an in_progress task
 *   "T-#### blocked"          needs the board to say blocked
 *   "T-#### review pass|fail" needs that verdict in the log
 * A contradiction exits 2 with the reason, and the agent keeps working. Anything else lets it
 * stop: no keys, no network, a crash here. A broken gate must never trap an agent.
 *
 * Usage in agent frontmatter:  command: "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/gate.mjs illustrator"
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const role = process.argv[2];
let hook = {};
try {
  hook = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {}
// Already sent back once for this stop: let it go rather than loop.
if (!role || hook.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? hook.cwd ?? process.cwd();
const tsx = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const hasKeys = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || existsSync(path.join(root, ".env"));
if (!existsSync(tsx) || !hasKeys) process.exit(0);

const message = String(hook.last_assistant_message ?? "").slice(-4000);
const run = spawnSync(tsx, ["--env-file-if-exists=.env", "apps/backend/src/bot.ts", role, "verify", message], { cwd: root, encoding: "utf8", timeout: 45_000 });
if (run.status !== 2) process.exit(0);
console.error(`gate(${role}): ${run.stderr.trim()}\nFix it and finish again. If it can't be fixed, block the task with the reason and end with "T-#### blocked | <reason>".`);
process.exit(2);
