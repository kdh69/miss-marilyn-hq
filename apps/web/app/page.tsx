import { Bar, Card, Empty, Stat } from "@/components/ui";
import { TodayItem } from "@/components/TodayItem";
import { MessageBox } from "@/components/MessageBox";
import { PhotoUpload } from "@/components/PhotoUpload";
import { MessageItem } from "@/components/Messages";
import { bookProgress, getSnapshot, spendToday } from "@/lib/data";
import { me } from "@/auth";

export default async function Today() {
  const [s, who] = await Promise.all([getSnapshot(), me()]);
  const viewer = who?.role ?? (s._sample ? "mom" : null); // sample data previews Clara's view
  const questions = s.requests.filter((r) => r.to === viewer && !r.reply && !["done", "wont_do"].includes(r.status));
  const waiting = s.mom_queue.filter((m) => !m.answer && !m.processed_at);
  const spend = spendToday(s);
  const active = s.products.filter((p) => p.status !== "retired");
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1 pt-2">
        <h1 className="text-2xl font-semibold">{greet}, Clara</h1>
        <p className="text-sm text-[var(--quiet)]">
          {waiting.length + questions.length
            ? `${waiting.length + questions.length} thing${waiting.length + questions.length > 1 ? "s" : ""} need you today.`
            : "Nothing needs you right now."} Everything else is moving.
          {s._sample && " (Sample data — the Sheet isn't connected yet.)"}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Waiting on you" value={String(waiting.length + questions.length)} tone="accent" />
        <Stat label="Books in progress" value={String(active.filter((p) => p.status === "in_production").length)} />
        <Stat label="Bot spend today" value={`$${spend.bots.toFixed(2)}`} sub={`of $${spend.cap}`} tone="accent-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card title="Needs your OK">
            <div className="flex flex-col gap-3">
              {waiting.length ? waiting.map((m) => <TodayItem key={m.item_id} item={m} />) : <Empty>All caught up.</Empty>}
            </div>
          </Card>
          {questions.length > 0 && (
            <Card title="Questions for you">
              <div className="flex flex-col gap-3">
                {questions.map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />)}
              </div>
            </Card>
          )}
          <Card title="Tell the team">
            <MessageBox />
          </Card>
          <Card title="Photos of Miss M">
            <PhotoUpload />
          </Card>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Book progress">
            <div className="flex flex-col gap-4">
              {active.map((p, i) => {
                const b = bookProgress(s, p.product_id);
                return (
                  <div key={p.product_id}>
                    <p className="text-sm font-semibold">{p.title}</p>
                    <div className="my-2"><Bar pct={b.pct} tone={i % 2 ? "accent-2" : "accent"} /></div>
                    <p className="text-xs text-[var(--quiet)]">{b.stage} · {b.pct}%</p>
                  </div>
                );
              })}
            </div>
          </Card>
          {s.research.find((r) => r.status === "new") && (
            <Card className="relative -mt-2 ml-4 rotate-[-0.6deg]">
              <p className="text-xs font-semibold text-violet-600">Trend from Scout</p>
              <p className="mt-1 font-semibold">{s.research.find((r) => r.status === "new")!.topic}</p>
              <p className="text-sm text-[var(--quiet)]">{s.research.find((r) => r.status === "new")!.finding}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
