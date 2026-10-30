"use client";
import { useState, useTransition } from "react";
import { replyRequest, triageRequest } from "@/app/actions";

type Req = Record<string, string>;
const WHO: Record<string, string> = { mom: "Clara", kyle: "Kyle", orchestrator: "Team", story_producer: "Story", illustrator: "Art", builder: "Builder", publisher: "Publisher", growth: "Growth", scout: "Scout", backend: "System" };
const KIND: Record<string, string> = { note: "Note", change: "Change", idea: "Idea", question: "Question", rule: "Rule" };
const STATUS: Record<string, string> = { new: "New", seen: "Seen", in_progress: "On it", done: "Done", wont_do: "Not doing" };

export function MessageItem({ r, viewer }: { r: Req; viewer: "mom" | "kyle" | "family" | null }) {
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const canReply = viewer && r.to === viewer && !r.reply;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => { const x = await fn(); setMsg(x.ok ? "Saved ✓" : x.error ?? "Didn't save"); if (x.ok) setReply(""); });

  return (
    <div className="rounded-2xl border border-white bg-white/65 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--quiet)]">
        <span className="font-semibold text-[var(--ink)]">{WHO[r.from] ?? r.from} → {WHO[r.to] ?? r.to}</span>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-700">{KIND[r.kind] ?? r.kind}</span>
        {r.product_id && <span>{r.product_id}{r.page_number ? ` · page ${r.page_number}` : ""}</span>}
        <span className="ml-auto">{STATUS[r.status] ?? r.status}{r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ""}</span>
      </div>
      <p className="mt-2 text-sm">{r.body}</p>
      {r.reply && <p className="mt-2 rounded-xl bg-orange-500/10 p-2 text-sm"><span className="font-semibold">{WHO[r.reply_by] ?? r.reply_by}:</span> {r.reply}</p>}
      {canReply && (
        <div className="mt-3 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !pending) run(() => replyRequest(r.request_id, reply)); }}
            placeholder="Type your answer and hit Enter" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          <button disabled={pending || !reply.trim()} onClick={() => run(() => replyRequest(r.request_id, reply))} className="rounded-full bg-orange-500 px-3 text-sm font-semibold text-white disabled:opacity-40">Reply</button>
        </div>
      )}
      {viewer === "kyle" && r.from === "mom" && r.to === "kyle" && !["done", "wont_do"].includes(r.status) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "forward"))} className="rounded-full bg-violet-600 px-3 py-1.5 font-semibold text-white">Send to bots</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "seen"))} className="rounded-full bg-black/5 px-3 py-1.5">Mark seen</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "done"))} className="rounded-full bg-black/5 px-3 py-1.5">I handled it</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "wont_do"))} className="rounded-full bg-black/5 px-3 py-1.5">Not doing</button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-[var(--quiet)]">{msg}</p>}
    </div>
  );
}
