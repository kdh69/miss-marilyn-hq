/**
 * npm run task -- T-0024 cancelled "superseded by T-0038"
 * Kyle's own status change (spec §6: Kyle may make any move), written as kyle with its log row,
 * so the integrity check sees a logged, legal change. For working away from the laptop the
 * MM backend workflow runs it (Actions → Run workflow → job "task").
 */
import { Core, schema } from "@mm/core";

async function main() {
  const [taskId, to, ...words] = process.argv.slice(2);
  const why = words.join(" ").trim();
  if (!taskId || !to || !why) throw new Error('usage: npm run task -- <task_id> <status> "<why>"');
  if (!schema.lists.task_status.includes(to)) throw new Error(`"${to}" isn't a task status (${schema.lists.task_status.join(", ")})`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const core = await Core.load(["tasks", "log"]);
    const task = core.rows("tasks").find((t) => t.task_id === taskId);
    if (!task) throw new Error(`no task ${taskId}`);
    if (task.status === to) return console.log(`${taskId} is already ${to}`);
    const patch = to === "blocked" ? { status: to, blocked_reason: why } : { status: to };
    if (await core.update("tasks", taskId, patch, "kyle")) {
      await core.log("kyle", taskId, task.status, to, why);
      return console.log(`${taskId}: ${task.status} → ${to} (${why})`);
    }
  }
  throw new Error(`${taskId} kept changing under us (a bot is writing it); try again in a minute`);
}

main().catch((e) => {
  console.error(e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
