import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanView, PostCard } from "@/components/LaunchCards";
import { AskTeam } from "@/components/Marketing";
import { Approval } from "@/components/NeedsYou";
import { Card, Empty, PageHeader } from "@/components/ui";
import { bookPlan, getSnapshot, marks, nyDay, postMedia, postsBetween, workingBooks } from "@/lib/data";
import { canSee, viewer } from "@/lib/viewer";

const dayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Social: what to post today, ready to paste, with where and how to post it; the week ahead;
 * the team's posts and plans waiting for her OK; and each book's marketing plan. The Marketer writes
 * the posts a week at a time from the approved plan; Clara posts them by hand and taps Posted.
 */
export default async function Social({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/social")) redirect("/");
  const books = workingBooks(s).filter((b) => s.tasks.some((t) => t.product_id === b.product_id && ["marketing_plan", "social_batch", "kdp_packet"].includes(t.task_type)) || s.plans.some((p) => p.product_id === b.product_id));
  const only = books.some((b) => b.product_id === book) ? book : undefined;
  const title = (id: string) => s.products.find((p) => p.product_id === id)?.title ?? id;
  const done = marks(s);
  const card = (c: (typeof s.content)[number], compact = false) => (
    <PostCard key={c.content_id} c={c} media={postMedia(s, c)} mark={done.get(c.content_id)} bookTitle={only ? undefined : title(c.product_id)} canWrite={v.canWrite} compact={compact} />
  );

  const today = nyDay();
  const todays = postsBetween(s, today, today, only);
  const missed = postsBetween(s, nyDay(-3), nyDay(-1), only).filter((c) => ["approved", "scheduled"].includes(c.status) && !done.has(c.content_id));
  const ahead = postsBetween(s, nyDay(1), nyDay(13), only);
  const days = [...new Set(ahead.map((c) => c.scheduled_for.slice(0, 10)))];
  const left = todays.filter((c) => ["approved", "scheduled"].includes(c.status) && !done.has(c.content_id)).length;
  const marketingTasks = new Set(s.tasks.filter((t) => ["marketing_plan", "social_batch"].includes(t.task_type) && (!only || t.product_id === only)).map((t) => t.task_id));
  const asks = s.mom_queue.filter((m) => marketingTasks.has(m.task_id) && !m.answer && !m.processed_at);

  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${on ? "border-orange-500 bg-orange-500 font-semibold text-white" : "border-black/10 bg-white/60"}`}>{label}</Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Social" sub={todays.length ? `${left ? `${left} to post today` : "Today's posts are done ✓"}. Each one is ready to paste.` : "Posts ready to paste, with where and how to post them."} />
      {books.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" style={{ scrollbarWidth: "none" }}>
          {chip("/social", "All books", !only)}
          {books.map((b) => chip(`/social?book=${b.product_id}`, b.title, only === b.product_id))}
        </div>
      )}

      {asks.length > 0 && (
        <section className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4 md:p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-orange-800">Needs your OK · {asks.length}</h2>
          <div className="flex flex-col gap-3">{asks.map((a) => <Approval key={a.item_id} item={a} />)}</div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-lg font-semibold">Today · {dayName(today)}</h2>
        {todays.length ? todays.map((c) => card(c)) : <Card><Empty>Nothing to post today.{ahead.length ? " The next posts are below." : ""}</Empty></Card>}
      </section>

      {missed.length > 0 && (
        <details className="glass rounded-3xl p-4">
          <summary className="cursor-pointer text-[15px] font-semibold">Missed in the last few days · {missed.length}</summary>
          <p className="mt-1 text-sm text-[var(--quiet)]">Post one today if it still fits, or skip it. Nothing breaks.</p>
          <div className="mt-3 flex flex-col gap-3">{missed.map((c) => card(c))}</div>
        </details>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-lg font-semibold">Coming up</h2>
        {days.length ? days.map((d) => {
          const list = ahead.filter((c) => c.scheduled_for.startsWith(d));
          return (
            <details key={d} className="glass rounded-3xl p-4">
              <summary className="cursor-pointer text-[15px] font-semibold">{dayName(d)} · {list.length} post{list.length > 1 ? "s" : ""}</summary>
              <div className="mt-3 flex flex-col gap-3">{list.map((c) => card(c))}</div>
            </details>
          );
        }) : <Card><Empty>No posts queued yet. The team writes a week at a time once a book's marketing plan is approved.</Empty></Card>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-lg font-semibold">Marketing plans</h2>
        {(only ? books.filter((b) => b.product_id === only) : books).map((b) => {
          const plan = bookPlan(s, b.product_id);
          return (
            <details key={b.product_id} className="glass rounded-3xl p-4" open={!!only}>
              <summary className="cursor-pointer text-[15px] font-semibold">{b.title}</summary>
              <div className="mt-3 flex flex-col gap-3">
                {plan.rows.length ? <PlanView rows={plan.rows} approved={plan.approved} /> : <Empty>No plan yet. The team asks for one once the book reaches Building.</Empty>}
                <div className="flex flex-wrap gap-2">
                  {plan.approved
                    ? <AskTeam productId={b.product_id} what="posts" label="Make the next week's posts" canWrite={v.canWrite} />
                    : !plan.rows.length && <AskTeam productId={b.product_id} what="plan" label="Ask for a marketing plan" canWrite={v.canWrite} />}
                  <Link href={`/launch?book=${b.product_id}`} className="inline-flex min-h-11 items-center rounded-full bg-black/5 px-4 text-[15px]">Launch page</Link>
                </div>
              </div>
            </details>
          );
        })}
        {!books.length && <Card><Empty>Marketing starts when a book reaches Building. Its plan and posts show up here.</Empty></Card>}
      </section>
    </div>
  );
}
