import { Empty } from "./ui";

export function Table({ rows, cols, empty }: { rows: Record<string, string>[]; cols: [key: string, label: string][]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-2 overflow-x-auto">
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
  );
}
