import Link from "next/link";
import { viewer } from "@/auth";
import { MessageBox } from "@/components/MessageBox";
import { NeedsYou } from "@/components/NeedsYou";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, Empty, PageHeader, StageTrack, StatRow, btn } from "@/components/ui";
import { Table } from "@/components/Table";
import { bookStage, getSnapshot, greeting, lastTick, needsYou, nextToWrite, spendToday, todoList } from "@/lib/data";
import { WHO, when } from "@/lib/labels";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

/** Overview: the first screen. What needs you, where everything is, one tap to keep going. */
export default async function Overview() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const kyle = v.view === "kyle";
  const items = needsYou(s, v.view);
  const titles = Object.fromEntries(s.products.map((p) => [p.product_id, p.title]));
  const books = s.products.filter((p) => p.status !== "retired");
  const inWorks = books.filter((p) => p.status === "in_production").length;
  const write = nextToWrite(s);
  const pagesTotal = s.pages.filter((p) => books.some((b) => b.product_id === p.product_id));
  const pagesYours = pagesTotal.filter((p) => p.text_final).length;
  const sales = s.transactions.reduce((a, t) => a + (Number(t.net_usd) || 0), 0);
  const spend = spendToday(s);
  const comingUp = todoList(s, v.view).filter((t) => !items.some((n) => n.id === t.id)).slice(0, 4);
  const scout = [...s.research].reverse().find((r) => r.status === "new");
  const stuck = s.tasks.filter((t) => ["escalated", "qc_fail", "blocked"].includes(t.status));
  const toRoute = s.requests.filter((r) => r.to === "kyle" && !r.reply && !["done", "wont_do"].includes(r.status));
  const onClara = s.mom_queue.filter((m) => !m.answer && !m.processed_at).length;
  const halted = s.config.find((c) => c.key === "system_status")?.value === "HALT";
  const tick = lastTick(s);
  const count = kyle ? toRoute.length + stuck.length : items.length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${greeting()}, ${kyle ? "Kyle" : "Clara"}`}
        sub={kyle
          ? `${toRoute.length} to route · ${stuck.length} stuck · ${onClara} waiting on Clara · bots ${halted ? "paused" : "running"}`
          : count ? `${count} thing${count > 1 ? "s" : ""} need${count > 1 ? "" : "s"} you. Everything else is moving.` : "Nothing needs you right now. The team is working."}
      />
      {s._sample && <p className="-mt-2 px-1 text-xs text-[var(--quiet)]">Sample data — the Sheet isn't connected yet.</p>}

      <StatRow stats={kyle ? [
        { label: "To route", short: "To route", value: String(toRoute.length), tone: "accent" },
        { label: "Stuck", short: "Stuck", value: String(stuck.length), tone: stuck.length ? "accent-2" : "ink" },
        { label: "Waiting on Clara", short: "On Clara", value: String(onClara) },
        { label: "Bots today", short: "Bots today", value: usd(spend.bots) },
      ] : [
        { label: "Waiting on you", short: "Need you", value: String(items.length), tone: "accent" },
        { label: "Books in the works", short: "Books going", value: String(inWorks) },
        { label: "Pages in your words", short: "Your pages", value: `${pagesYours}/${pagesTotal.length}`, tone: "accent-2" },
        { label: "Sales so far", short: "Sales", value: usd(sales) },
      ]} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: what to do */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {!kyle && write[0] && (
            <Link href={`/books/${write[0].productId}?page=${write[0].page}`} className="glass flex items-center gap-4 rounded-3xl p-4 transition hover:bg-white/70 md:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl text-white" aria-hidden>✎</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-orange-600">Keep writing</span>
                <span className="block text-[17px] font-semibold leading-snug">{write[0].title}</span>
                <span className="block text-sm text-[var(--quiet)]">Page {write[0].page} is next · {write[0].left} of {write[0].total} pages still in the draft&apos;s words</span>
              </span>
              <span className="text-xl text-[var(--quiet)]">›</span>
            </Link>
          )}

          {items.length ? <NeedsYou items={items} viewer={v.view} titles={titles} /> : (
            <Card><Empty>{kyle ? "No questions for you." : "All caught up — nothing needs your OK."}</Empty></Card>
          )}

          <Card title={kyle ? "Tell the bots" : "Tell the team"}>
            <MessageBox to={kyle ? "orchestrator" : undefined} placeholder={kyle ? "Instruction for the Orchestrator…" : "Anything — a change, an idea, a question…"} />
          </Card>

          {!kyle && (
            <Card title="Photos of Miss M">
              <PhotoUpload />
            </Card>
          )}
        </div>

        {/* Right: where things are */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Books" action={<Link href="/progress" className="text-sm text-orange-700 underline">Progress</Link>}>
            <div className="flex flex-col gap-4">
              {books.map((p) => {
                const st = bookStage(s, p.product_id);
                return (
                  <Link key={p.product_id} href={`/books/${p.product_id}`} className="block">
                    <p className="font-semibold">{p.title}</p>
                    <div className="my-2"><StageTrack index={st.index} /></div>
                    <p className="text-sm text-[var(--quiet)]">{st.now}{st.waiting ? <span className="text-orange-700"> · On you: {st.waiting}</span> : ""}</p>
                  </Link>
                );
              })}
              {!books.length && <Empty>No books yet.</Empty>}
            </div>
          </Card>

          <Card title="Coming up" action={<Link href={kyle ? "/inbox" : "/todo"} className="text-sm text-orange-700 underline">{kyle ? "Inbox" : "To-do"}</Link>}>
            {comingUp.length ? (
              <ul className="flex flex-col divide-y divide-black/5">
                {comingUp.map((t) => (
                  <li key={t.id}><Link href={t.href} className="block py-2.5"><span className="block text-[15px]">{t.what}</span><span className="block text-xs text-[var(--quiet)]">{t.where}{t.when ? ` · ${when(t.when)}` : ""}</span></Link></li>
                ))}
              </ul>
            ) : <Empty>Nothing else on the list.</Empty>}
          </Card>

          {kyle ? (
            <Card title="Latest activity">
              <p className="mb-2 text-xs text-[var(--quiet)]">Last backend tick: {tick ? when(tick) : "none logged yet"}</p>
              <Table rows={[...s.log].reverse().slice(0, 5).map((l) => ({ ...l, ts: when(l.ts), actor: WHO[l.actor] ?? l.actor }))} cols={[["message", "Note"], ["actor", "Who"], ["ts", "When"]]} empty="No activity yet." />
            </Card>
          ) : scout ? (
            <Card className="rotate-[-0.6deg]">
              <p className="text-xs font-semibold text-violet-600">Idea from Scout</p>
              <p className="mt-1 font-semibold">{scout.topic}</p>
              <p className="text-sm text-[var(--quiet)]">{scout.finding}</p>
              <Link href="/ideas" className={`${btn.quiet} mt-3 min-h-9 text-sm`}>See it in Ideas</Link>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
