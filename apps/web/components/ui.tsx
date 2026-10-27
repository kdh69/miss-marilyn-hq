import type { ReactNode } from "react";

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-3xl p-5 ${className}`}>
      {title && <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "accent" | "accent-2" }) {
  const color = tone === "accent" ? "text-orange-500" : tone === "accent-2" ? "text-violet-500" : "text-[var(--ink)]";
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-[var(--quiet)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>
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

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--quiet)]">{children}</p>;
}
