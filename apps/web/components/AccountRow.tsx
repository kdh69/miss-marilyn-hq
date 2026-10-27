"use client";
import { useState, useTransition } from "react";
import { setAccountStatus } from "@/app/actions";

const STATUS = ["todo", "in_progress", "waiting", "done", "not_needed"];
const LABEL: Record<string, string> = { todo: "To do", in_progress: "In progress", waiting: "Waiting", done: "Done", not_needed: "Not needed" };
const TONE: Record<string, string> = { done: "bg-emerald-500/15 text-emerald-700", in_progress: "bg-orange-500/15 text-orange-700", waiting: "bg-violet-500/15 text-violet-700" };

export function AccountRow({ a, canEdit }: { a: Record<string, string>; canEdit: boolean }) {
  const [status, setStatus] = useState(a.status);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{a.service} <span className="text-xs font-normal text-[var(--quiet)]">· {a.owner}{a.two_factor === "TRUE" ? " · 2-step on" : ""}</span></p>
        <p className="text-sm text-[var(--quiet)]">{a.purpose}{a.login_email ? ` · ${a.login_email}` : ""}</p>
        {a.notes && <p className="text-xs text-[var(--quiet)]">{a.notes}</p>}
      </div>
      {canEdit ? (
        <select value={status} disabled={pending} onChange={(e) => { const v = e.target.value; setStatus(v); start(async () => void (await setAccountStatus(a.account_id, v))); }}
          className="shrink-0 rounded-full border border-black/10 bg-white/80 px-2 py-1 text-xs">
          {STATUS.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
        </select>
      ) : (
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TONE[status] ?? "bg-white/80 text-[var(--quiet)]"}`}>{LABEL[status] ?? status}</span>
      )}
    </div>
  );
}
