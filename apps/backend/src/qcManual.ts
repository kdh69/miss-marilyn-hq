/**
 * npm run qc — manual QC when there's no ANTHROPIC_API_KEY (Kyle reviews in Claude Code).
 *   npm run qc                                      list tasks waiting at ready_for_qc
 *   npm run qc -- T-0012 pass "summary for Clara"   record a pass (→ Clara's queue or done)
 *   npm run qc -- T-0012 fail "what to fix"         record a fail (→ qc_fail, or escalated)
 * Verdicts go through the same gate as automatic QC: completeness and KDP preflight
 * still run first and can turn a pass into a fail.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Core } from "@mm/core";
import { qcGate } from "./jobs/gatekeeper";
import { activeLessons, parkedBooks, rubricPath } from "./lib/qc";

async function list(core: Core) {
  const types = new Map(core.rows("task_types").map((t) => [t.task_type, t]));
  const assets = new Map(core.rows("assets").map((a) => [a.asset_id, a]));
  const parked = parkedBooks(core);
  const waiting = core.rows("tasks").filter((t) => t.status === "ready_for_qc");
  const queue = waiting.filter((t) => !parked.has(t.product_id));
  if (waiting.length > queue.length) console.log(`Skipping ${waiting.length - queue.length} on paused or retired books.`);
  if (!queue.length) return console.log("Nothing waiting for QC.");
  for (const t of queue) {
    const type = types.get(t.task_type);
    const file = rubricPath(type?.qc_rubric ?? "");
    console.log(`\n${t.task_id}  ${t.task_type}  ${t.priority}  — ${t.title}`);
    console.log(`  product ${t.product_id}${t.sku ? ` / ${t.sku}` : ""}, owner ${t.owner}, attempt ${(Number(t.qc_attempts) || 0) + 1}`);
    console.log(`  rubric  ${fileURLToPath(existsSync(file) ? file : rubricPath(""))}`);
    console.log(`  goes to Clara on pass: ${type?.needs_mom === "TRUE" ? "yes" : "no"}`);
    console.log(`  brief   ${t.brief.replace(/\n/g, "\n          ")}`);
    for (const id of t.output_asset_ids.split(",").map((s) => s.trim()).filter(Boolean)) {
      const a = assets.get(id);
      console.log(`  asset   ${id}: ${a ? `${a.asset_type}${a.page_number ? ` p${a.page_number}` : ""}, rights_source=${a.rights_source}, made_with=${a.made_with}\n          ${a.file_url || "(no file_url)"}` : "(missing from assets)"}`);
    }
    for (const rule of activeLessons(core, t)) console.log(`  lesson  ${rule}`);
  }
}

async function record(core: Core, taskId: string, verdict: string, text: string) {
  const task = core.rows("tasks").find((t) => t.task_id === taskId);
  if (!task) throw new Error(`no task ${taskId}`);
  if (task.status !== "ready_for_qc") throw new Error(`${taskId} is ${task.status}, not ready_for_qc`);
  if (verdict !== "pass" && verdict !== "fail") throw new Error(`verdict must be pass or fail, got "${verdict}"`);
  if (!text) throw new Error(verdict === "pass" ? "add a one-sentence summary for Clara" : "add what needs fixing");

  const result = verdict === "pass"
    ? { result: "pass" as const, notes: "manual QC: ok", summaryForMom: text }
    : { result: "fail" as const, notes: `manual QC: ${text}`, summaryForMom: "" };
  await qcGate(core, true, taskId, async () => result);

  const after = (await Core.load(["tasks"])).rows("tasks").find((t) => t.task_id === taskId);
  console.log(`${taskId}: ${after?.status}${after?.qc_notes ? `\n  ${after.qc_notes.replace(/\n/g, "\n  ")}` : ""}`);
}

async function main() {
  const [taskId, verdict, ...words] = process.argv.slice(2);
  const core = await Core.load();
  if (!taskId) await list(core);
  else await record(core, taskId, verdict ?? "", words.join(" ").trim());
}

main().catch((e) => {
  console.error(e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
