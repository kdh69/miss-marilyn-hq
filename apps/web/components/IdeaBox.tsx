"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";
import { IDEA_KINDS } from "@/lib/labels";
import { btn } from "./ui";

/**
 * Capture any idea: a book, a printable, merch, a post, a business idea, anything. The kind leads
 * the text ("Merch idea: …") so the team knows what it is; a book idea starts "New book idea:",
 * which the Orchestrator turns into a new book.
 */
export function IdeaBox({ canWrite }: { canWrite: boolean }) {
  const [kind, setKind] = useState("other");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState("");
  const [ages, setAges] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const isBook = kind === "book";
  const ready = isBook ? !!(title.trim() || text.trim()) : !!text.trim();

  const send = () => start(async () => {
    const body = isBook
      ? `New book idea: "${title.trim() || "untitled"}".${text.trim() ? ` ${text.trim()}` : ""}${lesson.trim() ? ` The lesson: ${lesson.trim()}.` : ""}${ages.trim() ? ` For ages ${ages.trim()}.` : ""}`
      : `${IDEA_KINDS.find((k) => k.id === kind)!.prefix}${text.trim()}`;
    const r = await sendMessage({ kind: "idea", body }).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { setText(""); setTitle(""); setLesson(""); setAges(""); setMsg("Sent to the team ✓"); setTimeout(() => setMsg(""), 3000); }
    else setMsg(r.error ?? "Didn't send");
  });

  const field = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-orange-400";
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4 md:p-5">
      <div>
        <p className="mb-2 text-sm font-semibold">What&apos;s it for?</p>
        <div className="flex flex-wrap gap-1.5">
          {IDEA_KINDS.map((k) => (
            <button key={k.id} type="button" onClick={() => setKind(k.id)} aria-pressed={kind === k.id}
              className={`min-h-9 rounded-full px-3.5 text-sm transition ${kind === k.id ? "bg-orange-500 font-semibold text-white" : "bg-black/5 text-[var(--ink)] hover:bg-black/10"}`}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
      </div>
      {isBook && <input className={field} placeholder="Working title" value={title} onChange={(e) => setTitle(e.target.value)} />}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder={IDEA_KINDS.find((k) => k.id === kind)!.placeholder}
        className="w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-[17px] leading-relaxed outline-none focus:border-orange-400" />
      {isBook && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={field} placeholder="The lesson, if there is one" value={lesson} onChange={(e) => setLesson(e.target.value)} />
          <input className={field} placeholder="Ages, e.g. 3–6" value={ages} onChange={(e) => setAges(e.target.value)} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--quiet)]">{msg || (canWrite ? (isBook ? "The team plans it and it shows up under Script." : "The team picks it up from here.") : "View only")}</span>
        <button disabled={pending || !ready || !canWrite} onClick={send} className={btn.primary}>Send idea</button>
      </div>
    </div>
  );
}
