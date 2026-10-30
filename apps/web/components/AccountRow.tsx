"use client";
import { useState, useTransition } from "react";
import { setAccountStatus } from "@/app/actions";
import { ACCOUNT_STATUS } from "@/lib/labels";

const STATUS = ["todo", "in_progress", "waiting", "done", "not_needed"];
const TONE: Record<string, string> = { done: "bg-emerald-500/15 text-emerald-700", in_progress: "bg-orange-500/15 text-orange-700", waiting: "bg-violet-500/15 text-violet-700" };

export function AccountRow({ a, canEdit, technical = false }: { a: Record<string, string>; canEdit: boolean; technical?: boolean }) {
  const [status, setStatus] = useState(a.status);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const set = (v: string) => { setStatus(v); start(async () => { const r = await setAccountStatus(a.account_id, v); if (!r.ok) { setErr(r.error ?? "Didn't save"); setStatus(a.status); } }); };
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{a.service} <span className="text-xs font-normal text-[var(--quiet)]">· {a.owner}{a.two_factor === "TRUE" ? " · 2-step on" : ""}</span></p>
        <p className="text-sm text-[var(--quiet)]">{a.purpose}{a.login_email ? ` · ${a.login_email}` : ""}</p>
        {(technical || a.notes) && <p className="text-xs text-[var(--quiet)]">{technical ? `${a.account_id} · ${a.phase} · ` : ""}{a.notes}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
      {canEdit ? (
        <select value={status} disabled={pending} onChange={(e) => set(e.target.value)} className="min-h-10 shrink-0 rounded-full border border-black/10 bg-white px-3 text-sm">
          {STATUS.map((s) => <option key={s} value={s}>{ACCOUNT_STATUS[s]}</option>)}
        </select>
      ) : (
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TONE[status] ?? "bg-white/80 text-[var(--quiet)]"}`}>{ACCOUNT_STATUS[status] ?? status}</span>
      )}
    </div>
  );
}
