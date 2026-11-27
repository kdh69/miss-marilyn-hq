import Link from "next/link";
import { viewer, viewerName } from "@/lib/viewer";
import { MessageBox } from "@/components/MessageBox";
import { NeedsYou, NeedsYouList } from "@/components/NeedsYou";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, Empty, PageHeader, StageTrack, StatRow, btn } from "@/components/ui";
import { Table } from "@/components/Table";
import { activeBooks, bookStage, getSnapshot, greeting, lastTick, marks, needsYou, nyDay, postsBetween, spendToday, todoList, upNext } from "@/lib/data";
import { CHANNEL, WHO, hasWords, when } from "@/lib/labels";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

/** Overview: the first screen. What needs you, where everything is, one tap to keep going. */
export default async function Overview() {
  const [s, v, name] = await Promise.all([getSnapshot(), viewer(), viewerName()]);
  const kyle = v.view === "kyle";
  const family = v.view === "family";
  const items = needsYou(s, v.view);
  const titles = Object.fromEntries(s.products.map((p) => [p.product_id, p.title]));
  const books = activeBooks(s);
  const posted = marks(s);
  const toPost = postsBetween(s, nyDay(), nyDay()).filter((c) => ["approved", "scheduled"].includes(c.status) && !posted.has(c.content_id));
  const inWorks = books.filter((p) => p.status === "in_production").length;
  const next = upNext(s).sort((a, b) => Number(b.mine) - Number(a.mine));
  const pagesTotal = s.pages.filter((p) => books.some((b) => b.product_id === p.product_id) && hasWords(p));
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

  if (v.view === "mom") {
    // Clara: one clear next step, then a short list of the rest. No numbers to decode.
    const start = next.find((n) => n.mine);
    const rest = start ? items.filter((n) => !(n.kind === "approve" && n.href === start.href && n.productId === start.id)) : items;
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={`${greeting()}${name ? `, ${name}` : ""}`}
          sub={start ? "Here's what to do next. Everything else can wait." : count ? `${count} thing${count > 1 ? "s" : ""} to look at when you have a minute.` : "Nothing needs you right now. The team is working."} />
        {s._sample && <p className="-mt-2 px-1 text-xs text-[var(--quiet)]">Sample data — the Sheet isn't connected yet.</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-3">
            {start ? (
              <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-400 p-5 text-white shadow-[0_14px_34px_-16px_rgb(234_88_12/0.7)] md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Your next step · {start.title}</p>
                <p className="mt-2 text-xl font-semibold leading-snug md:text-2xl">{start.text}</p>
                <Link href={start.href} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[16px] font-semibold text-orange-700 shadow-sm">Start →</Link>
              </section>
            ) : (
              <Card><Empty>All caught up. Nothing needs your OK right now.</Empty></Card>
            )}

            {rest.length > 0 && (
              <Card title={`Also waiting on you · ${rest.length}`}>
                <p className="-mt-1 mb-1 text-sm text-[var(--quiet)]">No rush. Tap one to see it and answer right here.</p>
                <NeedsYouList items={rest} viewer="mom" titles={titles} />
              </Card>
            )}

            {toPost.length > 0 && (
              <Link href="/social" className="glass flex items-center gap-3 rounded-3xl p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-lg" aria-hidden>📣</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{toPost.length} post{toPost.length > 1 ? "s" : ""} to share today</span>
                  <span className="block truncate text-xs text-[var(--quiet)]">{[...new Set(toPost.map((c) => CHANNEL[c.channel] ?? c.channel))].join(" · ")} · ready to paste</span>
                </span>
                <span className="text-[var(--quiet)]">›</span>
              </Link>
            )}

            <details className="glass group rounded-3xl p-4 md:p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
                <span>Tell the team something</span><span className="text-[var(--quiet)] transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3"><MessageBox placeholder="Anything — a change, an idea, a question…" /></div>
            </details>
            <details className="glass group rounded-3xl p-4 md:p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
                <span>Send photos of Miss M</span><span className="text-[var(--quiet)] transition group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3"><PhotoUpload /></div>
            </details>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card title="Your books">
              <div className="flex flex-col gap-4">
                {books.map((p) => {
                  const st = bookStage(s, p.product_id);
                  return (
                    <div key={p.product_id}>
                      <Link href={`/books/${p.product_id}`} className="font-semibold hover:text-orange-700">{p.title}</Link>
                      <div className="my-2"><StageTrack index={st.index} book={p.product_id} /></div>
                      <p className="text-sm text-[var(--quiet)]">{p.status === "paused" ? "Paused for now." : st.now}</p>
                    </div>
                  );
                })}
                {!books.length && <Empty>No books yet.</Empty>}
              </div>
            </Card>
            {scout && (
              <Card>
                <p className="text-xs font-semibold text-violet-600">Idea from the team</p>
                <p className="mt-1 font-semibold">{scout.topic}</p>
                <p className="line-clamp-3 text-sm text-[var(--quiet)]">{scout.finding}</p>
                <Link href="/ideas" className={`${btn.quiet} mt-3 min-h-9 text-sm`}>See it in Ideas</Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        sub={family ? "Here's how the books are coming along." : kyle
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
        family
          ? { label: "Pages written", short: "Pages", value: String(pagesTotal.filter((p) => p.text_final || p.text_draft).length), tone: "accent" }
          : { label: "Waiting on you", short: "Need you", value: String(items.length), tone: "accent" },
        { label: "Books in the works", short: "Books going", value: String(inWorks) },
        { label: "Pages in your words", short: "Your pages", value: `${pagesYours}/${pagesTotal.length}`, tone: "accent-2" },
        family
          ? { label: "Tasks finished", short: "Tasks done", value: String(s.tasks.filter((t) => t.status === "done").length) }
          : { label: "Sales so far", short: "Sales", value: usd(sales) },
      ]} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: what to do */}
        {!family && <div className="flex flex-col gap-4 lg:col-span-3">
          {toPost.length > 0 && (
            <Link href="/social" className="glass flex items-center gap-3 rounded-3xl p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-lg" aria-hidden>📣</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{toPost.length} post{toPost.length > 1 ? "s" : ""} to share today</span>
                <span className="block truncate text-xs text-[var(--quiet)]">{[...new Set(toPost.map((c) => CHANNEL[c.channel] ?? c.channel))].join(" · ")} · ready to paste</span>
              </span>
              <span className="text-[var(--quiet)]">›</span>
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
        </div>}

        {/* Right: where things are */}
        <div className={`flex flex-col gap-4 ${family ? "lg:col-span-5" : "lg:col-span-2"}`}>
          <Card title="Books" action={<Link href="/progress" className="text-sm text-orange-700 underline">Progress</Link>}>
            <div className="flex flex-col gap-4">
              {books.map((p) => {
                const st = bookStage(s, p.product_id);
                return (
                  <div key={p.product_id}>
                    <Link href={`/books/${p.product_id}`} className="font-semibold hover:text-orange-700">{p.title}</Link>
                    <div className="my-2"><StageTrack index={st.index} book={p.product_id} /></div>
                    <p className="text-sm text-[var(--quiet)]">{st.now}{st.waiting && !family ? <span className="text-orange-700"> · {kyle ? "On Clara" : "On you"}: {st.waiting}</span> : ""}</p>
                  </div>
                );
              })}
              {!books.length && <Empty>No books yet.</Empty>}
            </div>
          </Card>

          {!family && <Card title="Coming up" action={<Link href={kyle ? "/inbox" : "/todo"} className="text-sm text-orange-700 underline">{kyle ? "Inbox" : "To-do"}</Link>}>
            {comingUp.length ? (
              <ul className="flex flex-col divide-y divide-black/5">
                {comingUp.map((t) => (
                  <li key={t.id}><Link href={t.href} className="block py-2.5"><span className="block text-[15px]">{t.what}</span><span className="block text-xs text-[var(--quiet)]">{t.where}{t.when ? ` · ${when(t.when)}` : ""}</span></Link></li>
                ))}
              </ul>
            ) : <Empty>Nothing else on the list.</Empty>}
          </Card>}

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
