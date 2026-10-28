import Link from "next/link";
import { Avatar, Bar, Card, Empty, Pill, Stat, StageTrack, statusTone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TodayItem } from "@/components/TodayItem";
import { MessageBox } from "@/components/MessageBox";
import { PhotoUpload } from "@/components/PhotoUpload";
import { MessageItem } from "@/components/Messages";
import { bookProgress, bookStages, getSnapshot, spendToday, teamNow } from "@/lib/data";
import { BOTS, ROLE, STAGE_LABEL, STATUS, ago } from "@/lib/labels";
import { viewerRole } from "@/lib/viewer";

export default async function Today() {
  const [s, viewer] = await Promise.all([getSnapshot(), viewerRole()]);
  const isKyle = viewer === "kyle";
  const questions = s.requests.filter((r) => r.to === viewer && !r.reply && !["done", "wont_do"].includes(r.status));
  const waiting = s.mom_queue.filter((m) => !m.answer && !m.processed_at);
  const stuck = s.tasks.filter((t) => ["blocked", "escalated"].includes(t.status));
  const spend = spendToday(s);
  const books = s.products.filter((p) => p.status === "in_production");
  const team = teamNow(s, BOTS);
  const trend = s.research.find((r) => r.status === "new");
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const need = isKyle ? stuck.length + questions.length : waiting.length + questions.length;

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1 pt-2">
        <h1 className="text-2xl font-semibold">{greet}, {isKyle ? "Kyle" : "Clara"}</h1>
        <p className="text-sm text-[var(--quiet)]">
          {need ? `${need} thing${need > 1 ? "s" : ""} need you today.` : "Nothing needs you right now."} Everything else is moving.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Waiting on you" value={String(need)} tone="accent" />
        <Stat label="Books in progress" value={String(books.length)} />
        <Stat label="Bots working now" value={String(team.filter((t) => t.now?.status === "in_progress").length)} sub={`of ${BOTS.length}`} />
        <Stat label="Bot spend today" value={`$${spend.bots.toFixed(2)}`} sub={`of $${spend.cap}`} tone="accent-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          {isKyle ? (
            <Card title="Stuck or escalated">
              <div className="flex flex-col gap-3">
                {stuck.length ? stuck.map((t) => (
                  <div key={t.task_id} className="rounded-2xl border border-white bg-white/65 p-4">
                    <div className="flex items-center gap-2">
                      <Pill tone="rose"><Icon name="alert" className="h-3 w-3" />{STATUS[t.status]}</Pill>
                      <span className="text-xs text-[var(--quiet)]">{t.task_id} · {ROLE[t.owner]?.name}</span>
                    </div>
                    <p className="mt-1.5 font-semibold">{t.title}</p>
                    <p className="text-sm text-[var(--quiet)]">{t.blocked_reason || t.qc_notes}</p>
                  </div>
                )) : <Empty>Nothing stuck.</Empty>}
              </div>
            </Card>
          ) : (
            <Card title="Needs your OK">
              <div className="flex flex-col gap-3">
                {waiting.length ? waiting.map((m) => <TodayItem key={m.item_id} item={m} />) : <Empty>All caught up.</Empty>}
              </div>
            </Card>
          )}
          {questions.length > 0 && (
            <Card title={isKyle ? "Clara's notes to route" : "Questions for you"}>
              <div className="flex flex-col gap-3">
                {questions.map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />)}
              </div>
            </Card>
          )}
          <Card title="Tell the team">
            <MessageBox to={isKyle ? "orchestrator" : undefined} />
          </Card>
          {!isKyle && (
            <Card title="Photos of Miss M">
              <PhotoUpload />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Books">
            <div className="flex flex-col gap-5">
              {books.map((p, i) => {
                const b = bookProgress(s, p.product_id);
                const stages = bookStages(s, p.product_id).map((x) => ({ ...x, label: STAGE_LABEL[x.type] }));
                return (
                  <Link key={p.product_id} href={`/books/${p.product_id}`} className="group block">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold group-hover:text-orange-700">{p.title}</p>
                      <span className="text-xs tabular-nums text-[var(--quiet)]">{b.pct}%</span>
                    </div>
                    <div className="my-2"><Bar pct={b.pct} tone={i % 2 ? "accent-2" : "accent"} /></div>
                    <StageTrack stages={stages} />
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card title="The team right now">
            <ul className="flex flex-col gap-3">
              {team.map(({ role, now, last, open }) => (
                <li key={role} className="flex items-start gap-3">
                  <Avatar name={ROLE[role].name} color={ROLE[role].color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{ROLE[role].name}</p>
                      {now ? <Pill tone={statusTone(now.status)}>{STATUS[now.status]}</Pill> : <Pill>Idle</Pill>}
                    </div>
                    <p className="truncate text-xs text-[var(--quiet)]">
                      {now ? now.title : ROLE[role].job}{open > 1 ? ` · +${open - 1} more` : ""}
                      {last ? ` · ${ago(last.ts)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {trend && (
            <Link href="/trends" className="block">
              <Card className="relative rotate-[-0.6deg] transition hover:rotate-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700"><Icon name="spark" className="h-3.5 w-3.5" />Trend from Scout</p>
                <p className="mt-1 font-semibold">{trend.topic}</p>
                <p className="text-sm text-[var(--quiet)]">{trend.finding}</p>
                {trend.numbers && <p className="mt-2 text-sm font-semibold tabular-nums">{trend.numbers}</p>}
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
