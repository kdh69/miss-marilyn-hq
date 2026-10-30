import type { ReactNode } from "react";
import Link from "next/link";
import { STAGE_TRACK } from "@/lib/labels";

export function Card({ title, children, className = "", action, id }: { title?: string; children: ReactNode; className?: string; action?: ReactNode; id?: string }) {
  return (
    <section id={id} className={`glass rounded-3xl p-4 md:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Page title row: back link, title, one line under it, one primary action on the right. */
export function PageHeader({ title, sub, back, action, eyebrow }: { title: string; sub?: ReactNode; back?: { href: string; label: string }; action?: ReactNode; eyebrow?: string }) {
  return (
    <>
    {back && (
      <div className="topbar sticky top-[var(--topbar-h)] z-30 -mx-4 -mt-4 mb-1 flex min-h-11 items-center gap-3 border-b border-black/5 px-4 backdrop-blur md:hidden">
        <Link href={back.href} className="flex min-h-11 items-center text-[15px] text-orange-700">← {back.label}</Link>
        <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
      </div>
    )}
    <header className="flex flex-col gap-3 px-1 pb-1 pt-1 sm:flex-row sm:items-end sm:justify-between md:pt-0">
      <div className="min-w-0">
        {back && <Link href={back.href} className="hidden text-sm text-[var(--quiet)] md:inline">← {back.label}</Link>}
        {eyebrow && <p className="text-xs text-[var(--quiet)]">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-0.5 text-[15px] text-[var(--quiet)]">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    </>
  );
}

export function Stat({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "accent" | "accent-2" }) {
  const color = tone === "accent" ? "text-orange-500" : tone === "accent-2" ? "text-violet-500" : "text-[var(--ink)]";
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-[var(--quiet)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {value} {sub && <span className="text-xs font-normal text-[var(--quiet)]">{sub}</span>}
      </p>
    </div>
  );
}

export function Bar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "accent-2" }) {
  return (
    <div className="h-2 w-full rounded-full bg-black/5">
      <div className={`h-2 rounded-full ${tone === "accent" ? "bg-orange-500" : "bg-violet-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Story → Art → Layout → Publish → On sale, with the current stage lit. */
export function StageTrack({ index }: { index: number }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Stage">
      {STAGE_TRACK.map((st, i) => (
        <li key={st.key} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full ${i < index ? "bg-orange-500" : i === index ? "bg-orange-500/70 ring-2 ring-orange-200" : "bg-black/10"}`} />
          <span className={`text-[11px] ${i === index ? "font-semibold text-orange-700" : i < index ? "text-[var(--ink)]" : "text-[var(--quiet)]"}`}>{st.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Pill({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "accent" | "accent-2" | "good" }) {
  const c = { quiet: "bg-black/5 text-[var(--quiet)]", accent: "bg-orange-500/15 text-orange-700", "accent-2": "bg-violet-500/10 text-violet-700", good: "bg-emerald-500/15 text-emerald-700" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--quiet)]">{children}</p>;
}

export const btn = {
  primary: "inline-flex min-h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-[15px] font-semibold text-white shadow-sm transition disabled:opacity-40",
  secondary: "inline-flex min-h-11 items-center justify-center rounded-full border border-orange-500 px-5 text-[15px] font-semibold text-orange-600 disabled:opacity-40",
  quiet: "inline-flex min-h-11 items-center justify-center rounded-full bg-black/5 px-4 text-[15px] disabled:opacity-40",
  small: "inline-flex min-h-9 items-center justify-center rounded-full bg-orange-500 px-4 text-sm font-semibold text-white disabled:opacity-40",
};
