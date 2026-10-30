"use client";
import { useState, useTransition } from "react";
import { answerItem } from "@/app/actions";
import { PhotoUpload } from "./PhotoUpload";
import { ago } from "@/lib/labels";

const VERB: Record<string, string> = { approve: "Approve", photos: "Send photos", rewrite: "Rewrite story", kdp_publish: "Publish on KDP" };

export function TodayItem({ item }: { item: Record<string, string> }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const primary = item.item_type === "approve" ? "Approve" : "Done";

  const send = (a: "Approve" | "Changes" | "Reject" | "Done") =>
    start(async () => {
      const r = await answerItem(item.item_id, a, note);
      setMsg(r.ok ? "Got it ✓" : r.error ?? "Didn't save — try again");
    });

  return (
    <div className="rounded-2xl border border-white bg-white/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            {VERB[item.item_type] ?? "Review"}
            {item.requested_at && <span className="ml-2 font-normal normal-case tracking-normal text-[var(--quiet)]">{ago(item.requested_at)}</span>}
          </p>
          <p className="mt-1 font-semibold">{item.summary}</p>
          {item.qc_summary && <p className="mt-0.5 text-sm text-[var(--quiet)]">✓ {item.qc_summary}</p>}
          {item.preview_url && (
            <a href={item.preview_url} target="_blank" className="mt-1 inline-block text-sm text-violet-600 underline">Open preview</a>
          )}
        </div>
        <button disabled={pending} onClick={() => send(primary)} className="shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50">
          {primary}
        </button>
      </div>
      {item.item_type === "photos" && <div className="mt-3"><PhotoUpload taskId={item.task_id} label="Upload photos" /></div>}
      {item.item_type === "approve" && (
        <div className="mt-3 text-sm">
          {!open ? (
            <button onClick={() => setOpen(true)} className="text-[var(--quiet)] underline">Ask for changes</button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" className="min-h-20 rounded-xl border border-black/10 bg-white/80 p-2" />
              <div className="flex gap-2">
                <button disabled={pending} onClick={() => send("Changes")} className="rounded-full border border-orange-500 px-3 py-1.5 font-semibold text-orange-600">Send changes</button>
                <button disabled={pending} onClick={() => send("Reject")} className="rounded-full px-3 py-1.5 text-[var(--quiet)]">Reject</button>
              </div>
            </div>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-[var(--quiet)]">{msg}</p>}
    </div>
  );
}
