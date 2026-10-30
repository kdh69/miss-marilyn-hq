"use client";
import { useState, useTransition } from "react";
import { replyRequest, triageRequest } from "@/app/actions";
import { IDEA_KINDS, KIND, REQUEST_STATUS, WHO, ideaKind, when } from "@/lib/labels";
import { btn } from "./ui";

type Req = Record<string, string>;

/** One message, with a reply box if it's to the person looking and Kyle's routing buttons. */
export function MessageItem({ r, viewer, bookTitle, compact = false }: { r: Req; viewer: "mom" | "kyle" | "family" | null; bookTitle?: string; compact?: boolean }) {
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const canReply = viewer && r.to === viewer && !r.reply;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => { const x = await fn(); setMsg(x.ok ? "Saved ✓" : x.error ?? "Didn't save"); if (x.ok) setReply(""); });
  const where = bookTitle ?? r.product_id;

  return (
    <div className={`rounded-2xl border border-white bg-white/75 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--quiet)]">
        <span className="font-semibold text-[var(--ink)]">{WHO[r.from] ?? r.from} → {WHO[r.to] ?? r.to}</span>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-700">{r.kind === "idea" ? (() => { const k = IDEA_KINDS.find((x) => x.id === ideaKind(r.body))!; return k.id === "other" ? "💡 Idea" : `${k.emoji} ${k.label}`; })() : KIND[r.kind] ?? r.kind}</span>
        {where && <span>{where}{r.page_number ? ` · page ${r.page_number}` : ""}</span>}
        <span className="ml-auto">{viewer !== "kyle" && r.to === "kyle" && r.status === "seen" ? "Kyle saw it" : viewer !== "kyle" && r.to === "orchestrator" && r.status === "new" ? "Sent to the team" : REQUEST_STATUS[r.status] ?? r.status}{r.created_at ? ` · ${when(r.created_at)}` : ""}</span>
      </div>
      <p className="mt-2 text-[15px]">{r.body}</p>
      {r.reply && <p className="mt-2 rounded-xl bg-orange-500/10 p-2.5 text-sm"><span className="font-semibold">{WHO[r.reply_by] ?? r.reply_by}:</span> {r.reply}</p>}
      {canReply && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !pending) run(() => replyRequest(r.request_id, reply)); }}
            placeholder="Type your answer" className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-orange-400" />
          <button disabled={pending || !reply.trim()} onClick={() => run(() => replyRequest(r.request_id, reply))} className={btn.primary}>Reply</button>
        </div>
      )}
      {viewer === "kyle" && r.from === "mom" && r.to === "kyle" && !["done", "wont_do"].includes(r.status) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "forward"))} className="min-h-9 rounded-full bg-violet-600 px-3 font-semibold text-white">Send to bots</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "seen"))} className="min-h-9 rounded-full bg-black/5 px-3">Mark seen</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "done"))} className="min-h-9 rounded-full bg-black/5 px-3">I handled it</button>
          <button disabled={pending} onClick={() => run(() => triageRequest(r.request_id, "wont_do"))} className="min-h-9 rounded-full bg-black/5 px-3">Not doing</button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-[var(--quiet)]">{msg}</p>}
    </div>
  );
}
