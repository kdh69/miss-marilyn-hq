"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";
import { btn } from "./ui";

const KINDS = [
  { id: "note", label: "Note" },
  { id: "change", label: "Change" },
  { id: "idea", label: "Idea" },
  { id: "question", label: "Question" },
  { id: "rule", label: "Always do this" },
];

/** Type and hit Enter (Shift+Enter for a new line). Lands as a row in `requests`. */
export function MessageBox({ productId, pageNumber, placeholder = "Tell the team something…", defaultKind = "note", to, kinds = KINDS.map((k) => k.id), rows = 2, big = false, onSent }: {
  productId?: string; pageNumber?: string; placeholder?: string; defaultKind?: string; to?: "mom" | "kyle" | "orchestrator"; kinds?: string[]; rows?: number; big?: boolean; onSent?: () => void;
}) {
  const [kind, setKind] = useState(defaultKind);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const shown = KINDS.filter((k) => kinds.includes(k.id));

  const send = () =>
    start(async () => {
      const r = await sendMessage({ kind, body, productId, pageNumber, to });
      if (r.ok) { setBody(""); setMsg("Sent ✓"); onSent?.(); setTimeout(() => setMsg(""), 2500); }
      else setMsg(r.error ?? "Didn't send — try again");
    });

  return (
    <div className="rounded-2xl border border-white bg-white/75 p-3">
      {shown.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {shown.map((k) => (
            <button key={k.id} type="button" onClick={() => setKind(k.id)}
              className={`min-h-8 rounded-full px-3 text-xs transition ${kind === k.id ? "bg-orange-500 font-semibold text-white" : "bg-black/5 text-[var(--quiet)] hover:bg-black/10"}`}>
              {k.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !big) { e.preventDefault(); if (!pending) send(); } }}
        placeholder={kind === "rule" ? "Something every book should follow, e.g. “Miss M's collar is always red”" : placeholder}
        rows={rows}
        className={`w-full resize-none rounded-xl border border-black/10 bg-white p-3 leading-relaxed outline-none focus:border-orange-400 ${big ? "text-[17px]" : "text-[15px]"}`}
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--quiet)]">
        <span>{msg || (big ? "" : "Enter to send")}</span>
        <button disabled={pending || !body.trim()} onClick={send} className={btn.small}>Send</button>
      </div>
    </div>
  );
}
