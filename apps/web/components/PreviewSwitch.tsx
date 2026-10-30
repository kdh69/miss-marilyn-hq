"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { previewAs } from "@/app/actions";

/** Preview mode only: flip between Clara's and Kyle's view of the sample data. */
export function PreviewSwitch({ as }: { as: "mom" | "kyle" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (role: "mom" | "kyle") => start(async () => { await previewAs(role); router.refresh(); });
  return (
    <div className="mt-6 hidden md:block">
      <p className="mb-1.5 text-xs text-[var(--quiet)]">Preview as</p>
      <div className="flex rounded-full bg-black/5 p-0.5 text-xs">
        {(["mom", "kyle"] as const).map((r) => (
          <button key={r} disabled={pending} onClick={() => pick(r)}
            className={`flex-1 rounded-full px-3 py-1.5 transition ${as === r ? "bg-white font-semibold shadow-sm" : "text-[var(--quiet)]"}`}>
            {r === "mom" ? "Clara" : "Kyle"}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[var(--quiet)]">Sample data. Sign-in isn&apos;t set up, so nothing saves.</p>
    </div>
  );
}
