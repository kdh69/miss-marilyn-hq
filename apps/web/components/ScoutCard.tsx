"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";
import { btn } from "./ui";

/** A finding from Scout, with one button: ask the team to turn it into a book or printable. */
export function ScoutCard({ r, canWrite }: { r: Record<string, string>; canWrite: boolean }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const go = () => start(async () => {
    const x = await sendMessage({ kind: "idea", body: `Let's make something from Scout's finding ${r.research_id}: ${r.topic}. ${r.suggested_action || ""}`.trim() });
    setMsg(x.ok ? "Sent to the team ✓" : x.error ?? "Didn't send");
  });
  return (
    <div className="rounded-2xl border border-white bg-white/75 p-4">
      <p className="text-xs font-semibold text-violet-600">From Scout{r.confidence ? ` · ${r.confidence === "high" ? "pretty sure" : r.confidence === "med" ? "worth a look" : "a hunch"}` : ""}</p>
      <p className="mt-1 font-semibold">{r.topic}</p>
      <p className="mt-1 text-[15px]">{r.finding}</p>
      {r.suggested_action && <p className="mt-1 text-sm text-[var(--quiet)]">Idea: {r.suggested_action}</p>}
      <div className="mt-3 flex items-center gap-3">
        {!msg && <button disabled={pending || !canWrite} onClick={go} className={btn.secondary}>Let's make this</button>}
        <span className="text-sm text-[var(--quiet)]">{msg}</span>
      </div>
    </div>
  );
}
