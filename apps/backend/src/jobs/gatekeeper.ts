/**
 * Job 1 — Gatekeeper (spec §9): spend guard → integrity check → QC gate.
 * Runs first on every schedule tick. Order matters: a HALT stops QC spend.
 */
import { Core, isLegalTransition, nowIso, type Row } from "@mm/core";
import { notifyKyle } from "../lib/notify";
import { autoQcEnabled, runQc, type QcResult } from "../lib/qc";
import { pushToMom } from "./momSync";
import { needsPreflight, preflight } from "../lib/preflight";

const QC_PER_RUN = 5;

/** YYYY-MM-DD in New York — the day the $15 cap resets on. */
const nyDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

const sumToday = (core: Core, category: string) =>
  core
    .rows("costs")
    .filter((c) => c.category === category && c.date === nyDay())
    .reduce((s, c) => s + (Number(c.amount_usd) || 0), 0);

export async function spendGuard(core: Core): Promise<{ halted: boolean; qcBudgetLeft: boolean }> {
  const botSpend = sumToday(core, "ai_credits");
  const botCap = Number(core.config("daily_bot_cap_usd") || 15);
  let halted = core.config("system_status") === "HALT";
  if (!halted && botSpend >= botCap) {
    await core.update("config", "system_status", { value: "HALT" });
    await notifyKyle(`HALT: bot spend today $${botSpend.toFixed(2)} hit the $${botCap} cap. Set config!system_status back to RUN to resume.`);
    halted = true;
  }
  const qcCap = Number(core.config("daily_qc_cap_usd") || 5);
  return { halted, qcBudgetLeft: sumToday(core, "qc_api") < qcCap };
}

/**
 * Spec §6 integrity check: the last to_status in `log` is the task's last legal
 * status. Illegal jumps are reverted; legal changes with no log row get one.
 */
export async function integrityCheck(core: Core): Promise<void> {
  const lastLogged = new Map<string, string>();
  for (const l of core.rows("log")) if (l.task_id && l.to_status) lastLogged.set(l.task_id, l.to_status);
  const needsQc = new Map(core.rows("task_types").map((t) => [t.task_type, t.needs_qc === "TRUE"]));

  for (const task of core.rows("tasks")) {
    const prev = lastLogged.get(task.task_id);
    const cur = task.status;
    if (!cur || prev === cur) continue;
    if (prev === undefined) {
      // New task: only the Orchestrator creates them, always as todo.
      if (cur !== "todo") await revert(core, task, "todo", `created as ${cur}; tasks start at todo`);
      else await core.log(task.updated_by || "orchestrator", task.task_id, "", "todo", "backfilled log row");
      continue;
    }
    const actor = task.updated_by === "kyle" ? "kyle" : "bot";
    if (isLegalTransition(actor, prev, cur, { needsQc: needsQc.get(task.task_type) })) {
      await core.log(task.updated_by || "unknown", task.task_id, prev, cur, "backfilled log row");
    } else {
      await revert(core, task, prev, `illegal ${prev} → ${cur} by ${task.updated_by || "unknown"}`);
    }
  }
}

async function revert(core: Core, task: Row, to: string, why: string) {
  await core.update("tasks", task.task_id, { status: to });
  await core.log("backend", task.task_id, task.status, to, `reverted: ${why}`);
  await notifyKyle(`${task.task_id} reverted to ${to} — ${why}`);
}

export type Judge = (task: Row, assets: Row[], rubric: string) => Promise<QcResult>;

/**
 * Moves ready_for_qc tasks through completeness → preflight → `judge`. The judge is
 * Claude (runQc) when ANTHROPIC_API_KEY is set; otherwise tasks wait at ready_for_qc
 * until Kyle records a verdict with `npm run qc`, which passes its own judge.
 */
export async function qcGate(core: Core, qcBudgetLeft: boolean, onlyTaskId?: string, judge?: Judge): Promise<void> {
  if (!qcBudgetLeft) return;
  judge ??= autoQcEnabled() ? (task, assets, rubric) => runQc(core, task, assets, rubric) : undefined;
  if (!judge) return;
  const types = new Map(core.rows("task_types").map((t) => [t.task_type, t]));
  const assets = new Map(core.rows("assets").map((a) => [a.asset_id, a]));
  const maxAttempts = Number(core.config("qc_max_attempts") || 2);

  const queue = core
    .rows("tasks")
    .filter((t) => t.status === "ready_for_qc" && (!onlyTaskId || t.task_id === onlyTaskId))
    .sort((a, b) => (a.priority || "P9").localeCompare(b.priority || "P9") || a.updated_at.localeCompare(b.updated_at))
    .slice(0, QC_PER_RUN);

  for (const task of queue) {
    if (!(await core.update("tasks", task.task_id, { status: "in_qc" }))) continue; // a bot touched it; next run
    await core.log("backend", task.task_id, "ready_for_qc", "in_qc");

    // Completeness gate — no Claude spend, doesn't count as an attempt.
    const ids = task.output_asset_ids.split(",").map((s) => s.trim()).filter(Boolean);
    const missing = ids.filter((id) => !assets.get(id)?.file_url);
    if (!ids.length || missing.length) {
      await finish(core, task, "qc_fail", { qc_result: "fail", qc_notes: `incomplete handoff: ${ids.length ? `no file_url on ${missing.join(",")}` : "output_asset_ids is empty"}` });
      continue;
    }

    const type = types.get(task.task_type);
    const taskAssets = ids.map((id) => assets.get(id)!);

    // KDP preflight (job 3): deterministic checks first; a failure skips the Claude call.
    const pre = needsPreflight(task.task_type) ? await preflight(core, task, taskAssets).catch((e) => [`preflight error: ${String(e).slice(0, 150)}`]) : [];
    const result = pre.length
      ? { result: "fail" as const, notes: `PREFLIGHT (KDP specs):\n${pre.join("\n")}`, summaryForMom: "" }
      : await judge(task, taskAssets, type?.qc_rubric ?? "");
    const attempts = (Number(task.qc_attempts) || 0) + 1;
    const patch = { qc_result: result.result, qc_notes: result.notes, qc_at: nowIso(), qc_attempts: String(attempts) };

    if (result.result === "pass") {
      const toMom = type?.needs_mom === "TRUE";
      await finish(core, task, toMom ? "awaiting_mom" : "done", patch);
      if (toMom) {
        // Story drafts are rewritten page by page in the panel's book workspace.
        const preview = type!.mom_item_type === "rewrite" ? `/books/${task.product_id}` : (assets.get(ids[0])?.file_url ?? "");
        await pushToMom(core, task, type!.mom_item_type, result.summaryForMom, preview);
      }
    } else {
      const to = attempts >= maxAttempts ? "escalated" : "qc_fail";
      await finish(core, task, to, patch);
      if (to === "escalated") await notifyKyle(`${task.task_id} escalated after ${attempts} QC fails: ${result.notes.slice(0, 200)}`);
    }
  }
}

async function finish(core: Core, task: Row, to: string, patch: Partial<Row>) {
  await core.update("tasks", task.task_id, { ...patch, status: to });
  await core.log("backend", task.task_id, "in_qc", to, patch.qc_notes?.slice(0, 120) ?? "");
}
