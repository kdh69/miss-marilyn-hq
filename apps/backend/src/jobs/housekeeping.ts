/**
 * Low-frequency jobs that ride on the 30-minute tick:
 *  - new-message alerts to Kyle (Clara's notes addressed to him)
 *  - Clara's weekly summary email
 *  - weekly backup copy of MM Core (keeps the last 8)
 */
import { Core, driveWriter, nowIso, sheetId } from "@mm/core";
import { notifyKyle, sendEmail } from "../lib/notify";

const nyNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
const nyDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export async function messageAlerts(core: Core) {
  const since = core.config("last_request_alert_at") || "1970-01-01T00:00:00Z";
  const fresh = core.rows("requests").filter((r) => r.to === "kyle" && r.from === "mom" && r.status === "new" && r.created_at > since);
  for (const r of fresh) await notifyKyle(`Clara (${r.kind}${r.product_id ? `, ${r.product_id}` : ""}${r.page_number ? ` p${r.page_number}` : ""}): ${r.body.slice(0, 160)}`);
  const escalated = core.rows("tasks").filter((t) => t.status === "escalated");
  if (escalated.length && fresh.length) await notifyKyle(`${escalated.length} task(s) still escalated: ${escalated.map((t) => t.task_id).join(", ")}`);
  await upsertConfig(core, "last_request_alert_at", nowIso());
}

export async function weeklyDigest(core: Core) {
  const day = core.config("digest_day") || "Sun";
  const now = nyNow();
  const today = nyDay();
  if (now.toLocaleDateString("en-US", { weekday: "short" }) !== day || now.getHours() < 17) return;
  if (core.config("last_digest_date") === today) return;

  const waiting = core.rows("mom_queue").filter((m) => !m.answer && !m.processed_at);
  const questions = core.rows("requests").filter((r) => r.to === "mom" && !r.reply && !["done", "wont_do"].includes(r.status));
  const books = core.rows("products").filter((p) => p.status !== "retired");
  const progress = books.map((b) => {
    const tasks = core.rows("tasks").filter((t) => t.product_id === b.product_id && t.status !== "cancelled");
    const done = tasks.filter((t) => t.status === "done").length;
    return `• ${b.title}: ${tasks.length ? Math.round((done / tasks.length) * 100) : 0}% done`;
  });
  const to = process.env.CLARA_EMAIL;
  if (to) {
    const link = process.env.PANEL_URL ?? "your Miss Marilyn HQ page";
    const n = waiting.length + questions.length;
    await sendEmail(
      to,
      n ? `${n} thing${n > 1 ? "s" : ""} waiting for you this week` : "This week at Miss Marilyn — all caught up",
      [
        `Hi Clara,`,
        ``,
        n ? `${waiting.length} item(s) to approve and ${questions.length} question(s) from the team are waiting.` : `Nothing needs you this week.`,
        ``,
        ...progress,
        ``,
        `Open your page: ${link}`,
      ].join("\n"),
    );
  }
  await upsertConfig(core, "last_digest_date", today);
}

export async function weeklyBackup(core: Core) {
  const last = core.config("last_backup_date");
  const folder = core.config("drive_backups_folder_id");
  if (!folder) return;
  if (last && (Date.now() - new Date(last).getTime()) / 86_400_000 < 7) return;
  const drive = driveWriter();
  const today = nyDay();
  await drive.files.copy({ fileId: sheetId(), requestBody: { name: `MM Core backup ${today}`, parents: [folder] } });
  const old = await drive.files.list({
    q: `'${folder}' in parents and name contains 'MM Core backup' and trashed = false`,
    orderBy: "createdTime desc",
    fields: "files(id,name)",
    pageSize: 50,
  });
  for (const f of (old.data.files ?? []).slice(8)) await drive.files.update({ fileId: f.id!, requestBody: { trashed: true } });
  await upsertConfig(core, "last_backup_date", today);
}

async function upsertConfig(core: Core, key: string, value: string) {
  if (core.rows("config").some((r) => r.key === key)) await core.update("config", key, { value });
  else await core.append("config", [{ key, value, note: "set by backend" }]);
}
