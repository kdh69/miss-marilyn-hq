import { Avatar, Card, Empty, PageHeader, Pill, statusTone } from "@/components/ui";
import { getSnapshot } from "@/lib/data";
import { BOARD, ROLE, STATUS, ago, dayLabel, who } from "@/lib/labels";

export default async function Progress() {
  const s = await getSnapshot();
  const open = s.tasks.filter((t) => !["done", "cancelled"].includes(t.status));
  const doneWeek = s.tasks.filter((t) => t.status === "done" && t.updated_at && Date.now() - new Date(t.updated_at).getTime() < 7 * 864e5).length;
  const books = new Map(s.products.map((p) => [p.product_id, p.title]));
  const recent = [...s.log].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 20);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Progress" sub={`${open.length} tasks open · ${doneWeek} finished this week`} />

      <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <div className="grid min-w-[880px] grid-cols-5 gap-3">
          {BOARD.map((col) => {
            const cards = open.filter((t) => col.statuses.includes(t.status));
            return (
              <section key={col.id} className="glass flex flex-col rounded-3xl p-3">
                <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${col.tone}`} />{col.label}
                  <span className="ml-auto text-xs font-normal tabular-nums text-[var(--quiet)]">{cards.length}</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {cards.length ? cards.map((t) => (
                    <article key={t.task_id} className="rounded-2xl border border-white bg-white/75 p-3">
                      <p className="text-[11px] text-[var(--quiet)]">{books.get(t.product_id) ?? "Business"}</p>
                      <p className="mt-0.5 text-sm font-semibold leading-snug">{t.title}</p>
                      {(t.blocked_reason || t.qc_notes) && ["blocked", "escalated", "qc_fail"].includes(t.status) && (
                        <p className="mt-1 text-xs text-rose-700">{t.blocked_reason || t.qc_notes}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Avatar name={who(t.owner)} color={ROLE[t.owner]?.color ?? "#6b6475"} size={18} />
                        <span className="text-[11px] text-[var(--quiet)]">{who(t.owner)}</span>
                        {t.status !== col.statuses[0] && <span className="ml-auto"><Pill tone={statusTone(t.status)}>{STATUS[t.status]}</Pill></span>}
                        {t.status === col.statuses[0] && t.due_date && <span className="ml-auto text-[11px] text-[var(--quiet)]">due {dayLabel(t.due_date)}</span>}
                      </div>
                    </article>
                  )) : <p className="px-1 text-xs text-[var(--quiet)]">Nothing here.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Card title="Latest activity">
        {recent.length ? (
          <ol className="relative flex flex-col gap-4 border-l border-black/10 pl-5">
            {recent.map((l, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-0.5 rounded-full ring-4 ring-white/80"><Avatar name={who(l.actor)} color={ROLE[l.actor]?.color ?? "#6b6475"} size={14} /></span>
                <p className="text-sm">
                  <span className="font-semibold">{who(l.actor)}</span>
                  {l.to_status && <> moved <span className="text-[var(--quiet)]">{l.task_id}</span> to <Pill tone={statusTone(l.to_status)}>{STATUS[l.to_status] ?? l.to_status}</Pill></>}
                  <span className="ml-2 text-xs text-[var(--quiet)]">{ago(l.ts)}</span>
                </p>
                {l.message && <p className="text-sm text-[var(--quiet)]">{l.message}</p>}
              </li>
            ))}
          </ol>
        ) : <Empty>No activity yet.</Empty>}
      </Card>
    </div>
  );
}
