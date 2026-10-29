"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setView } from "@/app/actions";

/** Kyle only (and preview mode): flip between Clara's view and the technical view. */
export function ViewToggle({ view }: { view: "mom" | "kyle" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (v: "mom" | "kyle") => start(async () => { await setView(v); router.refresh(); });
  const pill = (v: "mom" | "kyle", label: string) => (
    <button type="button" disabled={pending} onClick={() => pick(v)} aria-pressed={view === v}
      className={`flex-1 rounded-full px-3 py-1.5 text-xs transition ${view === v ? "bg-[var(--ink)] font-semibold text-white" : "text-[var(--quiet)] hover:bg-white/70"}`}>
      {label}
    </button>
  );
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] text-[var(--quiet)]">Viewing as</p>
      <div className="flex gap-1 rounded-full bg-black/5 p-1">{pill("mom", "Clara")}{pill("kyle", "Kyle")}</div>
    </div>
  );
}
