"use server";
import { revalidateTag } from "next/cache";
import { Core, nowIso } from "@mm/core";

/**
 * Clara's only write: her answer on a mom_queue item (spec §9b).
 * The backend applies it to `tasks` on its next tick.
 * Disabled until Google sign-in is in place (PANEL_WRITES_ENABLED=true).
 */
export async function answerItem(itemId: string, answer: "Approve" | "Changes" | "Reject" | "Done", note = "") {
  if (process.env.PANEL_WRITES_ENABLED !== "true") return { ok: false, error: "Answers are switched off until sign-in is set up." };
  if (answer === "Changes" && !note.trim()) return { ok: false, error: "Add a note saying what to change." };
  const core = await Core.load(["mom_queue"]);
  const ok = await core.update("mom_queue", itemId, { answer, mom_note: note.trim(), answered_at: nowIso() }, "mom");
  revalidateTag("mm-core-snapshot");
  return { ok };
}
