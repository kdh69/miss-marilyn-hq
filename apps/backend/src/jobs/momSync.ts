/**
 * Job 2 — Mom sync (spec §9 job 2 + §9b).
 * Push: awaiting_mom / photo_request tasks become mom_queue rows (cards on the
 *       control panel's Today tab).
 * Pull: answers Clara wrote via the panel are applied to tasks here, so the
 *       §6 status rules still hold — the panel itself never touches `tasks`.
 */
import { Core, nowIso, type Row } from "@mm/core";

const PLAIN: Record<string, string> = {
  approve: "Approve",
  photos: "Send photos",
  rewrite: "Rewrite story",
  kdp_publish: "Publish on KDP",
};

export async function pushToMom(core: Core, task: Row, itemType: string, summary: string, previewUrl: string) {
  const round = core.rows("mom_queue").filter((m) => m.task_id === task.task_id).length + 1;
  await core.append("mom_queue", [{
    item_id: `M-${task.task_id}-${round}`,
    task_id: task.task_id,
    item_type: itemType,
    summary: summary || `${PLAIN[itemType] ?? "Review"}: ${task.title}`,
    preview_url: previewUrl,
    qc_summary: task.qc_notes ?? "",
    requested_at: nowIso(),
  }]);
}

export async function momSync(core: Core): Promise<void> {
  const queued = new Set(core.rows("mom_queue").map((m) => m.task_id));

  // Push photo requests (they skip QC, so the gatekeeper never sees them).
  for (const t of core.rows("tasks")) {
    if (t.task_type === "photo_request" && t.status === "todo" && !queued.has(t.task_id)) {
      await core.update("tasks", t.task_id, { status: "awaiting_mom" });
      await core.log("backend", t.task_id, "todo", "awaiting_mom", "photo request sent to Clara");
      await pushToMom(core, t, "photos", t.title, "");
    }
  }

  // Pull answered, unprocessed items.
  for (const item of core.rows("mom_queue")) {
    if (!item.answer || item.processed_at) continue;
    if (item.answer === "Changes" && !item.mom_note.trim()) continue; // wait for her note
    const task = core.rows("tasks").find((t) => t.task_id === item.task_id);
    if (!task || task.status !== "awaiting_mom") {
      await core.update("mom_queue", item.item_id, { processed_at: nowIso() });
      continue;
    }

    let to: string;
    switch (item.answer) {
      case "Approve":
        to = "approved"; // job 4 publishes API channels from here; nothing to publish → done next run
        break;
      case "Changes":
        to = "changes_requested";
        await core.append("lessons", [{
          lesson_id: `L-${nowIso().slice(0, 10).replace(/-/g, "")}-mom-${item.item_id}`,
          date: nowIso().slice(0, 10), applies_to: task.task_type, rule: item.mom_note.trim(),
          evidence_task_id: task.task_id, source: "mom", status: "active",
        }]);
        break;
      case "Reject":
        to = "cancelled";
        break;
      case "Done":
        to = "done";
        if (item.item_type === "rewrite") await recordRewrite(core, task);
        // TODO(job 2): photos → register each file in MM Brand/photos/inbox (rights_source=photo);
        // kdp_publish → listing live.
        break;
      default:
        continue;
    }
    await core.update("tasks", task.task_id, { status: to, mom_decision: item.answer, mom_note: item.mom_note });
    await core.log("backend", task.task_id, "awaiting_mom", to, `Clara: ${item.answer}${item.mom_note ? ` — ${item.mom_note}` : ""}`);
    await core.update("mom_queue", item.item_id, { processed_at: nowIso() });
  }

  // Approved tasks with no API channel to publish go straight to done.
  for (const t of core.rows("tasks")) {
    if (t.status === "approved" && t.task_type !== "etsy_listing") {
      await core.update("tasks", t.task_id, { status: "done" });
      await core.log("backend", t.task_id, "approved", "done", "nothing to publish");
    }
  }
}

/**
 * Clara finished rewriting a book in the panel. Her words live in pages.text_final;
 * record them as one human-authored asset so the KDP AI-content answer for text is "no".
 */
async function recordRewrite(core: Core, task: Row) {
  const pages = core.rows("pages").filter((p) => p.product_id === task.product_id);
  const hers = pages.filter((p) => p.text_final.trim()).length;
  const n = core.rows("assets").filter((a) => a.task_id === task.task_id).length + 1;
  const now = nowIso();
  await core.append("assets", [{
    asset_id: `${task.task_id}-A${n}`, task_id: task.task_id, product_id: task.product_id, sku: task.sku,
    asset_type: "page_text", version: String(n), file_url: `sheet:pages:${task.product_id}`,
    file_name: `${task.product_id} text (owner rewrite)`, rights_source: "human",
    rights_note: `owner rewrite in control panel, ${hers}/${pages.length} pages; pages.text_final with text_final_by/at`,
    made_with: "Clara (control panel)", status: "final", created_by: "backend", created_at: now, updated_at: now, updated_by: "backend",
  }]);
}

/**
 * Messages from the panel. Rules from Clara or Kyle become standing lessons right away
 * (she owns the business); everything else waits for whoever it's addressed to.
 */
export async function processRequests(core: Core): Promise<void> {
  for (const r of core.rows("requests")) {
    if (r.kind !== "rule" || r.status !== "new" || !["mom", "kyle"].includes(r.from)) continue;
    await core.append("lessons", [{
      lesson_id: `L-${nowIso().slice(0, 10).replace(/-/g, "")}-${r.from}-${r.request_id}`,
      date: nowIso().slice(0, 10), applies_to: "all", rule: r.body.trim(),
      evidence_task_id: r.request_id, source: r.from === "mom" ? "mom" : "kyle", status: "active",
    }]);
    await core.update("requests", r.request_id, { status: "done", reply: "Added as a standing rule — every bot follows it from now on.", reply_by: "backend", replied_at: nowIso() });
  }
}
