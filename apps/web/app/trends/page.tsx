import { Card, Empty, PageHeader, Pill } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrendAction } from "@/components/TrendAction";
import { getSnapshot } from "@/lib/data";
import { ago } from "@/lib/labels";

const TYPE: Record<string, string> = { keyword: "Keyword", competitor: "Competitor", trend: "Trend", pricing: "Pricing", idea: "Idea" };
const CONF: Record<string, { label: string; tone: "green" | "orange" | "gray" }> = { high: { label: "Sure", tone: "green" }, med: { label: "Fairly sure", tone: "orange" }, low: { label: "A hunch", tone: "gray" } };

export default async function Trends() {
  const s = await getSnapshot();
  const rows = [...s.research].sort((a, b) => b.date.localeCompare(a.date));
  const fresh = rows.filter((r) => r.status === "new");
  const older = rows.filter((r) => r.status !== "new");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Trends" sub={`What Scout found · ${fresh.length} new`} />
      {!rows.length && <Card><Empty>No research yet. Scout posts findings here as it finds them.</Empty></Card>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fresh.map((r) => (
          <Card key={r.research_id} className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="violet"><Icon name="spark" className="h-3 w-3" />{TYPE[r.research_type] ?? r.research_type}</Pill>
              {CONF[r.confidence] && <Pill tone={CONF[r.confidence].tone}>{CONF[r.confidence].label}</Pill>}
              <span className="ml-auto text-xs text-[var(--quiet)]">{ago(`${r.date}T12:00:00Z`)}</span>
            </div>
            <p className="mt-2 text-lg font-semibold">{r.topic}</p>
            <p className="text-sm text-[var(--quiet)]">{r.finding}</p>
            {r.numbers && <p className="mt-3 text-xl font-semibold tabular-nums">{r.numbers}</p>}
            {r.suggested_action && (
              <p className="mt-3 rounded-xl bg-orange-500/10 p-2.5 text-sm"><span className="font-semibold">Idea:</span> {r.suggested_action}</p>
            )}
            <div className="mt-auto pt-4"><TrendAction researchId={r.research_id} topic={r.topic} idea={r.suggested_action} /></div>
          </Card>
        ))}
      </div>
      {older.length > 0 && (
        <Card title="Already looked at">
          <ul className="flex flex-col divide-y divide-black/5">
            {older.map((r) => (
              <li key={r.research_id} className="flex items-start justify-between gap-3 py-2.5">
                <div><p className="text-sm font-semibold">{r.topic}</p><p className="text-sm text-[var(--quiet)]">{r.finding}</p></div>
                <Pill>{r.status}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
