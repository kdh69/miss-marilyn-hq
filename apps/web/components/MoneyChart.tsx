"use client";
import { useState } from "react";

type Month = { month: string; sales: number; costs: number };
const SERIES = [
  { key: "sales", label: "Sales (net)", color: "#ea580c" },
  { key: "costs", label: "Costs", color: "#8b5cf6" },
] as const;
const usd = (n: number) => `$${n.toFixed(2)}`;
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short" });

/** Paired columns per month, one y-axis, hover a month for its numbers. */
export function MoneyChart({ data }: { data: Month[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, L = 44, B = 24, T = 12;
  const max = Math.max(10, ...data.flatMap((d) => [d.sales, d.costs]));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const band = (W - L) / data.length;
  const bar = Math.min(20, band / 3.2);

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-[var(--quiet)]">
        {SERIES.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales and costs by month">
          {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((v) => (
            <g key={v}>
              <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="rgb(0 0 0 / 0.07)" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-[var(--quiet)] text-[11px] tabular-nums">${v}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = L + band * i + band / 2;
            return (
              <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={L + band * i} y={T} width={band} height={H - T - B} fill={hover === i ? "rgb(0 0 0 / 0.03)" : "transparent"} />
                {SERIES.map((s, k) => {
                  const v = d[s.key];
                  const h = Math.max(0, y(0) - y(v));
                  const x = cx + (k === 0 ? -bar - 1 : 1);
                  return <path key={s.key} d={column(x, y(0), bar, h)} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />;
                })}
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-[var(--quiet)] text-[11px]">{monthName(d.month)}</text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-0 rounded-xl border border-white bg-white/95 px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((L + band * hover + band / 2) / W) * 100}%`, transform: "translateX(-50%)" }}>
            <p className="font-semibold">{monthName(data[hover].month)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 tabular-nums"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label}: {usd(data[hover][s.key])}</p>
            ))}
            <p className="mt-0.5 border-t border-black/5 pt-0.5 font-semibold tabular-nums">Profit: {usd(data[hover].sales - data[hover].costs)}</p>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-[var(--quiet)]">
        <summary className="cursor-pointer">Show as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead><tr><th className="py-1 font-medium">Month</th><th className="font-medium">Sales</th><th className="font-medium">Costs</th><th className="font-medium">Profit</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.month} className="border-t border-black/5"><td className="py-1">{monthName(d.month)}</td><td>{usd(d.sales)}</td><td>{usd(d.costs)}</td><td>{usd(d.sales - d.costs)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

/** Column with a 4px rounded top, square at the baseline. */
function column(x: number, base: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}V${base - h + r}Q${x},${base - h} ${x + r},${base - h}H${x + w - r}Q${x + w},${base - h} ${x + w},${base - h + r}V${base}Z`;
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
}
