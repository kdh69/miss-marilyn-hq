"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";

const KINDS = [
  { id: "note", label: "Note" },
  { id: "change", label: "Change" },
  { id: "idea", label: "Idea" },
  { id: "question", label: "Question" },
  { id: "rule", label: "Always do this" },
];

/** Type and hit Enter (Shift+Enter for a new line). Lands as a row in `requests`. */
export function MessageBox({ productId, pageNumber, placeholder = "Tell the team something…", defaultKind = "note", to }: {
  productId?: string; pageNumber?: string; placeholder?: string; defaultKind?: string; to?: "mom" | "kyle" | "orchestrator";
}) {
  const [kind, setKind] = useState(defaultKind);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await sendMessage({ kind, body, productId, pageNumber, to });
      if (r.ok) { setBody(""); setMsg("Sent ✓"); setTimeout(() => setMsg(""), 2500); }
      else setMsg(r.error ?? "Didn't send — try again");
    });

  return (
    <div className="rounded-2xl border border-white bg-white/65 p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${kind === k.id ? "bg-orange-500 font-semibold text-white" : "bg-black/5 text-[var(--quiet)] hover:bg-black/10"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!pending) send(); } }}
        placeholder={kind === "rule" ? "Something every book should follow, e.g. “Miss M's collar is always red”" : placeholder}
        rows={2}
        className="w-full resize-none rounded-xl border border-black/10 bg-white/80 p-2.5 text-sm outline-none focus:border-orange-400"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-[var(--quiet)]">
        <span>{msg || "Enter to send · Shift+Enter for a new line"}</span>
        <button disabled={pending || !body.trim()} onClick={send} className="rounded-full bg-orange-500 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Send</button>
      </div>
    </div>
  );
}
