"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";
import { btn } from "./ui";

/** Clara starts a book: the team gets a book-plan idea; the backend creates the product once Kyle OKs it. */
export function NewBook({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [lesson, setLesson] = useState("");
  const [ages, setAges] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const send = () => start(async () => {
    const body = `New book idea: "${title.trim()}".${about.trim() ? ` It's about ${about.trim()}.` : ""}${lesson.trim() ? ` The lesson: ${lesson.trim()}.` : ""}${ages.trim() ? ` For ages ${ages.trim()}.` : ""}`;
    const r = await sendMessage({ kind: "idea", body });
    if (r.ok) { setMsg("Sent to the team ✓ — it shows up on the shelf once the plan is ready."); setTitle(""); setAbout(""); setLesson(""); setAges(""); }
    else setMsg(r.error ?? "Didn't send");
  });

  if (!open) return <button onClick={() => setOpen(true)} className={btn.primary}>+ New book</button>;
  const field = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-orange-400";
  return (
    <div className="glass flex flex-col gap-2 rounded-3xl p-4 md:p-5">
      <p className="font-semibold">Start a new book</p>
      <input className={field} placeholder="Working title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className={field} placeholder="What happens (a line or two)" value={about} onChange={(e) => setAbout(e.target.value)} />
      <input className={field} placeholder="The lesson, if there is one" value={lesson} onChange={(e) => setLesson(e.target.value)} />
      <input className={field} placeholder="Ages, e.g. 3–6" value={ages} onChange={(e) => setAges(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending || !title.trim() || !canWrite} onClick={send} className={btn.primary}>Send to the team</button>
        <button onClick={() => setOpen(false)} className={btn.quiet}>Cancel</button>
      </div>
      <p className="text-sm text-[var(--quiet)]">{msg || (canWrite ? "The team plans it, Kyle OKs it, and it appears here." : "Preview only — sign in to send.")}</p>
    </div>
  );
}
