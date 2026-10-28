"use client";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";

/** "Make this" on a Scout finding: an idea row in `requests` for the Orchestrator to plan. */
export function TrendAction({ researchId, topic, idea }: { researchId: string; topic: string; idea: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const go = () => start(async () => {
    const r = await sendMessage({ kind: "idea", to: "orchestrator", body: `From Scout's ${researchId} (${topic}): ${idea || "plan a product from this"}` });
    setMsg(r.ok ? "Sent to the team ✓" : r.error ?? "Didn't send");
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={pending} onClick={go} className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Ask the team to make this</button>
      {msg && <span className="text-xs text-[var(--quiet)]">{msg}</span>}
    </div>
  );
}
