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

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="text-sm text-[var(--quiet)]">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

const PILL: Record<string, string> = {
  orange: "bg-orange-500/12 text-orange-700",
  violet: "bg-violet-500/12 text-violet-700",
  green: "bg-emerald-500/12 text-emerald-700",
  rose: "bg-rose-500/12 text-rose-700",
  gray: "bg-black/5 text-[var(--quiet)]",
};

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof PILL }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL[tone]}`}>{children}</span>;
}

/** Which pill tone a task status wears. */
export function statusTone(status: string): keyof typeof PILL {
  if (status === "done" || status === "approved") return "green";
  if (status === "awaiting_mom") return "orange";
  if (["blocked", "escalated", "qc_fail"].includes(status)) return "rose";
  if (["ready_for_qc", "in_qc"].includes(status)) return "violet";
  return "gray";
}

export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>
      {name.slice(0, 1)}
    </span>
  );
}

/** Book production steps: filled when done, ringed when active. */
export function StageTrack({ stages }: { stages: { type: string; label: string; state: string }[] }) {
  return (
    <ol className="flex items-start">
      {stages.map((st, i) => (
        <li key={st.type} className="flex min-w-0 flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : st.state === "upcoming" ? "bg-black/10" : "bg-orange-400"}`} />
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              st.state === "done" ? "bg-orange-500 text-white" : st.state === "active" ? "bg-white text-orange-600 ring-2 ring-orange-500" : "bg-black/10 text-[var(--quiet)]"}`}>
              {st.state === "done" ? "✓" : i + 1}
            </span>
            <span className={`h-0.5 flex-1 ${i === stages.length - 1 ? "opacity-0" : stages[i + 1].state === "upcoming" ? "bg-black/10" : "bg-orange-400"}`} />
          </div>
          <span className={`mt-1.5 truncate px-0.5 text-[11px] ${st.state === "active" ? "font-semibold text-[var(--ink)]" : "text-[var(--quiet)]"}`}>{st.label}</span>
        </li>
      ))}
    </ol>
  );
}
