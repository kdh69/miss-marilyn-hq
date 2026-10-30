import { Fragment } from "react";
import { Empty } from "./ui";

/** A table on desktop; stacked label/value rows on phones so nothing scrolls sideways. */
export function Table({ rows, cols, empty }: { rows: Record<string, string>[]; cols: [key: string, label: string][]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-[var(--quiet)]">
            <tr>{cols.map(([k, l]) => <th key={k} className="px-2 py-2 font-medium">{l}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/5">
                {cols.map(([k]) => <td key={k} className="px-2 py-2 align-top">{r[k] || "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col divide-y divide-black/5 md:hidden">
        {rows.map((r, i) => (
          <li key={i} className="py-3">
            <p className="text-[15px] font-semibold">{r[cols[0][0]] || "—"}{cols[1] && r[cols[1][0]] ? <span className="font-normal"> · {r[cols[1][0]]}</span> : ""}</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              {cols.slice(2).filter(([k]) => r[k]).map(([k, l]) => <Fragment key={k}><dt className="text-[var(--quiet)]">{l}</dt><dd>{r[k]}</dd></Fragment>)}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
