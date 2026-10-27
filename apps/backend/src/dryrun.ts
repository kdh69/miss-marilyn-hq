/**
 * npm run dryrun — pushes one fake task through the real pipeline and cleans up:
 *   bot writes task + asset → QC (real Claude call) → Clara's queue → Clara approves
 *   → backend applies it → done; plus a message and a page edit round-trip.
 * Costs a few cents of QC. Touches only rows it creates (IDs start with T-DRY / Q-DRY / *-DRY).
 */
import { Core, nowIso } from "@mm/core";
import { qcGate } from "./jobs/gatekeeper";
import { momSync, processRequests } from "./jobs/momSync";

const stamp = nowIso().replace(/\D/g, "").slice(0, 12);
const TASK = `T-DRY${stamp}`;
const ASSET = `${TASK}-A1`;
const REQ = `Q-DRY${stamp}`;
const PAGE = `DRY${stamp}-P01`;
const results: [string, boolean, string?][] = [];
const check = (name: string, pass: boolean, detail = "") => {
  results.push([name, pass, detail]);
  console.log(`  ${pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}${detail ? ` — ${detail}` : ""}`);
  return pass;
};

async function main() {
  const now = nowIso();
  let core = await Core.load();
  check("Sheet loads with every tab", core.rows("config").length > 0);

  console.log("\n1. Bot hands off work");
  await core.append("tasks", [{
    task_id: TASK, product_id: "OL-B01", task_type: "dryrun", title: "Dry run — connection test",
    brief: "Automated connection test created by npm run dryrun. Not real work.", owner: "orchestrator",
    status: "ready_for_qc", priority: "P1", output_asset_ids: ASSET, created_by: "orchestrator",
    created_at: now, updated_at: now, updated_by: "orchestrator",
  }]);
  await core.log("orchestrator", TASK, "", "todo", "dryrun");
  await core.log("orchestrator", TASK, "todo", "ready_for_qc", "dryrun");
  await core.append("assets", [{
    asset_id: ASSET, task_id: TASK, product_id: "OL-B01", asset_type: "listing_copy", version: "1",
    file_url: `https://docs.google.com/spreadsheets/d/${process.env.MM_CORE_SHEET_ID}`, file_name: "dryrun",
    rights_source: "AI", made_with: "dryrun", status: "draft", created_by: "orchestrator", created_at: now, updated_at: now, updated_by: "orchestrator",
  }]);
  check("task + asset rows written", true, TASK);

  console.log("\n2. Backend QC (real Claude call)");
  core = await Core.load();
  await qcGate(core, true, TASK);
  core = await Core.load();
  let task = core.rows("tasks").find((t) => t.task_id === TASK);
  check("QC ran and logged a cost", core.rows("costs").some((c) => c.task_id === TASK && c.category === "qc_api"), task?.qc_notes?.slice(0, 60));
  if (!check("QC passed → waiting on Clara", task?.status === "awaiting_mom", `status=${task?.status}`)) return;
  const item = core.rows("mom_queue").find((m) => m.task_id === TASK);
  if (!check("item on Clara's Today list", !!item, item?.summary)) return;

  console.log("\n3. Clara approves (as the panel would)");
  await core.update("mom_queue", item!.item_id, { answer: "Approve", answered_at: nowIso() }, "mom");
  core = await Core.load();
  await momSync(core);
  core = await Core.load();
  task = core.rows("tasks").find((t) => t.task_id === TASK);
  check("approval applied → done", task?.status === "done", `status=${task?.status}`);
  const trail = core.rows("log").filter((l) => l.task_id === TASK).map((l) => l.to_status);
  check("every step logged", ["todo", "ready_for_qc", "in_qc", "awaiting_mom", "approved", "done"].every((s) => trail.includes(s)), trail.join(" → "));

  console.log("\n4. Messages + page text");
  await core.append("requests", [{ request_id: REQ, created_at: nowIso(), from: "mom", to: "kyle", kind: "rule", body: "Dry run rule — ignore", status: "new", updated_at: nowIso(), updated_by: "mom" }]);
  core = await Core.load();
  await processRequests(core);
  core = await Core.load();
  check("'Always do this' note became a lesson", core.rows("lessons").some((l) => l.evidence_task_id === REQ));
  await core.append("pages", [{ page_id: PAGE, product_id: "OL-B01", page_number: "99", text_draft: "draft", updated_at: nowIso(), updated_by: "story_producer" }]);
  core = await Core.load(["pages"]);
  check("Clara's page edit saves", await core.update("pages", PAGE, { text_final: "her words", text_final_by: "mom", text_final_at: nowIso() }, "mom"));
}

async function cleanup() {
  console.log("\nCleaning up");
  const core = await Core.load(["config"]);
  const mine = (v = "") => v.includes(`DRY${stamp}`);
  let n = 0;
  n += await core.deleteWhere("tasks", (r) => mine(r.task_id));
  n += await core.deleteWhere("assets", (r) => mine(r.asset_id));
  n += await core.deleteWhere("mom_queue", (r) => mine(r.task_id));
  n += await core.deleteWhere("log", (r) => mine(r.task_id));
  n += await core.deleteWhere("requests", (r) => mine(r.request_id));
  n += await core.deleteWhere("lessons", (r) => mine(r.evidence_task_id));
  n += await core.deleteWhere("pages", (r) => mine(r.page_id));
  console.log(`  removed ${n} test rows (the QC cost row stays — it was real spend)`);
}

main()
  .catch((e) => check("dry run crashed", false, String(e?.response?.data?.error?.message ?? e?.message ?? e).slice(0, 200)))
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup failed — delete rows containing", `DRY${stamp}`, e?.message));
    const failed = results.filter(([, p]) => !p).length;
    console.log(`\n${failed ? `\x1b[31m${failed} check(s) failed\x1b[0m` : "\x1b[32mEverything connects\x1b[0m"}\n`);
    process.exit(failed ? 1 : 0);
  });
