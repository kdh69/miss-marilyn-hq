"use server";
/**
 * Everything the panel can write (spec §9b). Each action re-checks who is signed in.
 * The panel never touches `tasks`: it writes Clara's answers, her page text and
 * messages; the backend and the Orchestrator act on them.
 */
import { revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { Core, nowIso, startResumableUpload } from "@mm/core";
import { me, VIEW_COOKIE, type PanelRole } from "@/auth";

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

// ---------- Photos & videos (Clara → MM Brand/photos/inbox) ----------

const PHOTO_TYPES = /^(image\/(jpeg|png|heic|heif|webp)|video\/(mp4|quicktime))$/;
const MAX_UPLOAD = 500 * 1024 * 1024;

/** Step 1: get a one-time Drive upload URL; the browser sends the file straight to Google. */
export async function startPhotoUpload(name: string, mimeType: string, size: number): Promise<Result & { uploadUrl?: string }> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  if (!PHOTO_TYPES.test(mimeType)) return { ok: false, error: `${name}: only photos (JPG, PNG, HEIC) and videos (MP4, MOV)` };
  if (size > MAX_UPLOAD) return { ok: false, error: `${name} is over 500 MB` };
  const core = await Core.load(["config"]);
  const folderId = core.config("drive_photos_inbox_id");
  if (!folderId) return { ok: false, error: "Photo folder isn't set in config (drive_photos_inbox_id)." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  try {
    const safe = name.replace(/[^\w.\- ]+/g, "_").slice(0, 80);
    const uploadUrl = await startResumableUpload({ folderId, name: `${stamp()}_${who.role}_${safe}`, mimeType, size, origin });
    return { ok: true, uploadUrl };
  } catch (e) {
    return { ok: false, error: `Upload couldn't start: ${String((e as Error).message).slice(0, 120)}` };
  }
}

/** Step 2: record the uploaded file as a photo/video asset (rights_source=photo). */
export async function registerPhoto(fileId: string, name: string, mimeType: string, taskId = ""): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  const core = await Core.load(["assets"]);
  const n = core.rows("assets").filter((a) => a.asset_id.startsWith(`P-${stamp().slice(0, 8)}`)).length + 1;
  const now = nowIso();
  await core.append("assets", [{
    asset_id: `P-${stamp().slice(0, 8)}-${String(n).padStart(3, "0")}`, task_id: taskId, product_id: "", sku: "",
    asset_type: mimeType.startsWith("video/") ? "video" : "photo", version: "1",
    file_url: `https://drive.google.com/file/d/${fileId}/view`, file_name: name,
    rights_source: "photo", rights_note: `Clara's own photo of Miss Marilyn, uploaded via panel by ${who.role}`,
    made_with: "camera", status: "final", created_by: who.role, created_at: now, updated_at: now, updated_by: who.role,
  }]);
  refresh();
  return { ok: true };
}

// ---------- Kyle-only controls ----------

/** Flip the panel between Clara's view and Kyle's. Only changes what is shown; writes still use the signed-in identity. */
export async function setView(view: PanelRole): Promise<Result> {
  const who = await me();
  if (who?.role === "mom") return { ok: false, error: "Clara always sees her own view." };
  (await cookies()).set(VIEW_COOKIE, view === "kyle" ? "kyle" : "mom", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true };
}

export async function setSystemStatus(value: "RUN" | "HALT"): Promise<Result> {
  const who = await me();
  if (who?.role !== "kyle") return { ok: false, error: "Only Kyle can pause or resume the bots." };
  const core = await Core.load(["config", "log"]);
  const ok = await core.update("config", "system_status", { value }, "kyle");
  await core.log("kyle", "", "", "", `system_status set to ${value} from the panel`);
  refresh();
  return { ok };
}

/** Kyle can update any account; Clara can update the ones she owns (status only). */
export async function setAccountStatus(accountId: string, status: string, loginEmail?: string): Promise<Result> {
  const who = await me();
  if (!who) return NOT_SIGNED_IN;
  const core = await Core.load(["accounts"]);
  const row = core.rows("accounts").find((a) => a.account_id === accountId);
  if (!row) return { ok: false, error: "That account isn't in the list." };
  if (who.role !== "kyle" && (!row.owner.toLowerCase().includes("clara") || loginEmail !== undefined)) return { ok: false, error: "Only Kyle can change this one." };
  const patch: Record<string, string> = { status };
  if (loginEmail !== undefined) patch.login_email = loginEmail.trim();
  const ok = await core.update("accounts", accountId, patch, who.role);
  refresh();
  return ok ? { ok } : { ok, error: "That row just changed — refresh and try again." };
}
