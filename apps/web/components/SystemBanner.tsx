"use client";
import { useTransition } from "react";
import { setSystemStatus } from "@/app/actions";

export function SystemBanner({ halted, viewer }: { halted: boolean; viewer: "mom" | "kyle" | null }) {
  const [pending, start] = useTransition();
  if (!halted) return null;
  return (
    <div className="glass mb-4 flex items-center justify-between gap-3 rounded-2xl border-violet-300 px-4 py-3 text-sm">
      <span>
        <span className="font-semibold">The team is paused.</span>{" "}
        {viewer === "kyle" ? "The daily spending cap was hit, or you paused it." : "Kyle has paused the bots for now — nothing is lost."}
      </span>
      {viewer === "kyle" && (
        <button disabled={pending} onClick={() => start(async () => void (await setSystemStatus("RUN")))} className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 font-semibold text-white">
          Resume
        </button>
      )}
    </div>
  );
}
