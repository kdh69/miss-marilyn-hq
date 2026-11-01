import Link from "next/link";
import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { ListingCard, PlanView } from "@/components/LaunchCards";
import { AskTeam } from "@/components/Marketing";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Empty, Pill } from "@/components/ui";
import { bookListings, bookPlan, driveId, getSnapshot, latestAsset, marks, nyDay, postsBetween, stepTask } from "@/lib/data";
import { STAGE_TRACK, TASK_STATUS, bookNumber } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 6 — Launch. After the final OK: each store listing with every field ready to paste, the
 * print files, where and how to post it, and "It's live" with the link. Then the book's marketing
 * plan and its posts (the day-to-day posting is on the Social page).
 */
export default async function Launch({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/launch")) redirect("/");
  const id = pickBook(s, "launch", book);
  if (!id) return <StepShell step="launch" s={s} view={v.view} />;

  const product = s.products.find((p) => p.product_id === id);
  const cover = latestAsset(s, id, ["cover_art"]);
  const listings = bookListings(s, id);
  const done = marks(s);
  const finalOk = stepTask(s, id, "review");
  const plan = bookPlan(s, id);
  const types = STAGE_TRACK.find((x) => x.key === "launch")!.types;
  const ids = new Set(s.tasks.filter((t) => t.product_id === id && types.includes(t.task_type)).map((t) => t.task_id));
  const asks = s.mom_queue.filter((m) => ids.has(m.task_id) && !m.answer && !m.processed_at);
  const planTask = [...s.tasks].reverse().find((t) => t.product_id === id && t.task_type === "marketing_plan" && t.status !== "cancelled");
  const week = postsBetween(s, nyDay(), nyDay(6), id);
  const asset = (types: string[]) => latestAsset(s, id, types);
  const printFiles = [
    { label: "Inside of the book (PDF)", url: asset(["interior_pdf"])?.file_url ?? "" },
    { label: "Cover (PDF)", url: asset(["cover_pdf"])?.file_url ?? "" },
  ].filter((f) => f.url);
  const etsyFiles = s.assets.filter((a) => a.product_id === id && ["printable_pdf", "mockup"].includes(a.asset_type) && a.status !== "superseded" && a.file_url)
    .map((a) => ({ label: a.file_name || a.asset_id, url: a.file_url }));

  const ready = listings.some((l) => ["approved", "publishing", "live"].includes(l.status));
  const status = finalOk?.status === "done" || ready ? "Final OK given. Put it up for sale below, one store at a time."
    : finalOk ? "The listing is being written. It's ready to post once you give the book its final OK."
    : "The listing gets written during the full book review.";

  return (
    <StepShell step="launch" s={s} view={v.view} selected={id}>
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-20 shrink-0 overflow-hidden rounded-xl shadow-sm md:w-28" title="Front cover"><Art id={driveId(cover?.file_url)} brief="" small /></div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{bookNumber(product) || id}</p>
            <h2 className="text-xl font-semibold">{product?.title}</h2>
            <p className="text-[15px] text-[var(--quiet)]">{status}</p>
          </div>
        </div>
        {asks.map((a) => <div key={a.item_id} className="mt-3"><Approval item={a} /></div>)}
      </Card>

      {listings.length ? listings.map((l) => (
        <ListingCard key={l.listing_id} l={l} productId={id} mark={done.get(l.listing_id)} canWrite={v.canWrite}
          files={l.channel === "ETSY" ? etsyFiles : printFiles} />
      )) : (
        <Card title="Store listings"><Empty>The Lister writes the Amazon listing (and Etsy, for printables) during the full book review. It shows up here, field by field, ready to paste.</Empty></Card>
      )}

      <Card title="Marketing plan" action={plan.rows.length ? <Link href={`/social?book=${id}`} className="text-sm font-semibold text-violet-600 underline">Social →</Link> : undefined}>
        {plan.rows.length ? <PlanView rows={plan.rows} approved={plan.approved} />
          : planTask ? <Empty>The Marketer is writing it ({(TASK_STATUS[planTask.status] ?? planTask.status).toLowerCase()}).</Empty>
          : (
            <div className="flex flex-col gap-3">
              <Empty>No plan yet. The team asks for one on its own once the book reaches Building.</Empty>
              <div><AskTeam productId={id} what="plan" label="Ask for a marketing plan now" canWrite={v.canWrite} /></div>
            </div>
          )}
      </Card>

      <Card title="Posts this week" action={<Link href={`/social?book=${id}`} className="text-sm font-semibold text-violet-600 underline">Post them →</Link>}>
        {week.length ? (
          <ul className="flex flex-col divide-y divide-black/5">
            {week.map((c) => (
              <li key={c.content_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[15px]">{c.scheduled_for.slice(5, 10)} · {c.hook}</span>
                <Pill tone={done.has(c.content_id) || c.status === "posted" ? "good" : "quiet"}>{done.has(c.content_id) || c.status === "posted" ? "Posted" : c.channel.toLowerCase()}</Pill>
              </li>
            ))}
          </ul>
        ) : <Empty>{plan.approved ? "The next week of posts is on its way." : "Posts start once the marketing plan is approved."}</Empty>}
      </Card>
    </StepShell>
  );
}
