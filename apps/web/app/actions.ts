"use server";
/**
 * Everything the panel can write (spec §9b). Each action re-checks who is signed in.
 * The panel never touches `tasks`: it writes Clara's answers, her page text and
 * messages; the backend and the Orchestrator act on them.
 */
import { revalidateTag } from "next/cache";
import { Core, nowIso } from "@mm/core";
import { me, type PanelRole } from "@/auth";

type Result = { ok: boolean; error?: string };
const NOT_SIGNED_IN: Result = { ok: false, error: "Sign-in isn't set up yet, so changes can't be saved." };
const refresh = () => revalidateTag("mm-core-snapshot");
const stamp = () => nowIso().replace(/\D/g, "").slice(0, 14);

export async function answerItem(itemId: string, answer: "Approve" | "Changes" | "Reject" | "Done", note = ""): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  if (answer === "Changes" && !note.trim()) return { ok: false, error: "Add a note saying what to change." };
  const core = await Core.load(["mom_queue"]);
  const ok = await core.update("mom_queue", itemId, { answer, mom_note: note.trim(), answered_at: nowIso() }, who.role);
  refresh();
  return ok ? { ok } : { ok, error: "Someone else just changed this — refresh and try again." };
}

/** A note, change, idea, rule or question — from Clara or Kyle, about the business, a book or a page. */
export async function sendMessage(input: { kind: string; body: string; productId?: string; pageNumber?: string; to?: PanelRole | "orchestrator" }): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Type a message first." };
  const core = await Core.load(["requests", "config"]);
  const to = input.to ?? (who.role === "mom" ? core.config("requests_default_to") || "kyle" : "orchestrator");
  const now = nowIso();
  await core.append("requests", [{
    request_id: `Q-${stamp()}-${Math.floor(Math.random() * 90 + 10)}`,
    created_at: now, from: who.role, to, product_id: input.productId ?? "", page_number: input.pageNumber ?? "",
    kind: input.kind, body, status: "new", updated_at: now, updated_by: who.role,
  }]);
  refresh();
  return { ok: true };
}

export async function replyRequest(requestId: string, reply: string): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  if (!reply.trim()) return { ok: false, error: "Type a reply first." };
  const core = await Core.load(["requests"]);
  const ok = await core.update("requests", requestId, { reply: reply.trim(), reply_by: who.role, replied_at: nowIso(), status: "done" }, who.role);
  refresh();
  return ok ? { ok } : { ok, error: "That message just changed — refresh and try again." };
}

/** Kyle's triage: forward to the bots, mark seen/done/won't do. */
export async function triageRequest(requestId: string, action: "forward" | "seen" | "done" | "wont_do"): Promise<Result> {
  const who = await me();
  if (who?.role !== "kyle") return { ok: false, error: "Only Kyle can route messages." };
  const core = await Core.load(["requests"]);
  const patch = action === "forward" ? { to: "orchestrator", status: "new" } : { status: action };
  const ok = await core.update("requests", requestId, patch, "kyle");
  refresh();
  return { ok };
}

/** Clara's own words for a page. Stored apart from the AI draft, so the human rewrite is on record. */
export async function savePageText(pageId: string, text: string): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  const core = await Core.load(["pages"]);
  const ok = await core.update("pages", pageId, { text_final: text.trim(), text_final_by: who.role, text_final_at: nowIso() }, who.role);
  refresh();
  return ok ? { ok } : { ok, error: "A bot just updated this page — refresh to see it, then save again." };
}
