import { Avatar, Card, Empty, PageHeader, Pill, statusTone } from "@/components/ui";
import { getSnapshot } from "@/lib/data";
import { CHANNEL, ROLE, STATUS, dayLabel, who } from "@/lib/labels";

type Item = { day: string; kind: "task" | "post"; title: string; meta: string; status: string; owner?: string };
const NY = "America/New_York";
const nyDay = (iso: string) => (iso.length === 10 ? iso : new Date(iso).toLocaleDateString("en-CA", { timeZone: NY }));

export default async function Next() {
  const s = await getSnapshot();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: NY });
  const items: Item[] = [
    ...s.tasks.filter((t) => !["done", "cancelled"].includes(t.status) && t.due_date)
      .map((t) => ({ day: t.due_date, kind: "task" as const, title: t.title, meta: who(t.owner), status: t.status, owner: t.owner })),
    ...s.content.filter((c) => ["approved", "scheduled"].includes(c.status) && c.scheduled_for)
      .map((c) => ({ day: nyDay(c.scheduled_for), kind: "post" as const, title: c.hook, meta: CHANNEL[c.channel] ?? c.channel, status: c.status })),
  ].sort((a, b) => a.day.localeCompare(b.day));
  const days = [...new Set(items.map((i) => i.day))];
  const late = items.filter((i) => i.day < today && i.kind === "task");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="What's next" sub={`${items.filter((i) => i.kind === "task").length} tasks due · ${items.filter((i) => i.kind === "post").length} posts planned${late.length ? ` · ${late.length} overdue` : ""}`}>
        <div className="flex gap-3 text-xs text-[var(--quiet)]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Task due</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Post goes out</span>
        </div>
      </PageHeader>
      <Card>
        {days.length ? (
          <ol className="flex flex-col gap-5">
            {days.map((d) => (
              <li key={d} className="grid grid-cols-[88px_1fr] gap-3 sm:grid-cols-[120px_1fr]">
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${d < today ? "text-rose-700" : d === today ? "text-orange-700" : ""}`}>{d === today ? "Today" : dayLabel(d)}</p>
                  {d < today && <p className="text-[11px] text-rose-700">overdue</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {items.filter((i) => i.day === d).map((i, k) => (
                    <div key={k} className={`flex items-center gap-3 rounded-2xl border-l-4 bg-white/70 p-3 ${i.kind === "task" ? "border-orange-500" : "border-violet-500"}`}>
                      {i.owner && <Avatar name={who(i.owner)} color={ROLE[i.owner]?.color ?? "#6b6475"} size={24} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{i.title}</p>
                        <p className="text-xs text-[var(--quiet)]">{i.meta}</p>
                      </div>
                      <Pill tone={i.kind === "post" ? "violet" : statusTone(i.status)}>{i.kind === "post" ? i.status : STATUS[i.status]}</Pill>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ) : <Empty>Nothing scheduled.</Empty>}
      </Card>
    </div>
  );
}
