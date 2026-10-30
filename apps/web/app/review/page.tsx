import Link from "next/link";
import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { BookReader } from "@/components/BookReader";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Pill } from "@/components/ui";
import { bookPages, driveId, getSnapshot, latestAsset, pageApprovals, stepAsk, stepTask } from "@/lib/data";
import { bookNumber } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 5 — Full book review. Everything comes together: a checklist of every earlier step (each
 * unfinished line links back to its step), the final OK, and the book to read cover to cover.
 * Nothing publishes without the final OK.
 */
export default async function Review({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/review")) redirect("/");
  const id = pickBook(s, "review", book);
  if (!id) return <StepShell step="review" s={s} view={v.view} />;

  const product = s.products.find((p) => p.product_id === id);
  const pages = bookPages(s, id);
  const n = pages.length;
  const hers = pages.filter((p) => p.text_final).length;
  const pics = Object.keys(pageApprovals(s, id, "picture")).length;
  const laid = Object.keys(pageApprovals(s, id, "layout")).length;
  const layoutOk = stepTask(s, id, "build")?.status === "done";
  const cover = latestAsset(s, id, ["cover_art"]);
  const ask = stepAsk(s, id, "review");
  const published = stepTask(s, id, "review")?.status === "done";
  const checks = [
    { ok: n > 0 && hers === n, text: hers === n && n ? `All ${n} pages are in your words` : `${hers} of ${n} pages in your words — the rest won't print`, href: `/script?book=${id}`, step: "Script" },
    { ok: n > 0 && pics === n, text: `${pics} of ${n} pictures approved`, href: `/art?book=${id}`, step: "Illustrations" },
    { ok: n > 0 && laid === n, text: `${laid} of ${n} finished pages approved`, href: `/build?book=${id}`, step: "Building" },
    { ok: layoutOk, text: layoutOk ? "Layout and cover approved" : "Layout and cover not approved yet", href: `/build?book=${id}`, step: "Building" },
  ];
  const left = checks.filter((c) => !c.ok).length;

  return (
    <StepShell step="review" s={s} view={v.view} selected={id}>
      <Card>
        <div className="mb-3 flex items-start gap-4">
          <div className="w-20 shrink-0 overflow-hidden rounded-xl shadow-sm md:w-28" title="Front cover"><Art id={driveId(cover?.file_url)} brief="" small /></div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{bookNumber(product) || id}</p>
            <h2 className="text-xl font-semibold">{product?.title}</h2>
            <p className="text-sm text-[var(--quiet)]">{published ? "Final OK given — it's on its way to the store." : left ? `${left} thing${left > 1 ? "s" : ""} to finish before the final OK.` : "Everything is approved. Read it once more, then give the final OK."}</p>
          </div>
        </div>
        <ul className="flex flex-col divide-y divide-black/5">
          {checks.map((c) => (
            <li key={c.text}>
              <Link href={c.href} className="flex min-h-11 items-center gap-3 py-2 text-[15px]">
                <Pill tone={c.ok ? "good" : "accent"}>{c.ok ? "✓" : "!"}</Pill>
                <span className="min-w-0 flex-1">{c.text}</span>
                {!c.ok && <span className="shrink-0 text-sm text-orange-700">{c.step} →</span>}
              </Link>
            </li>
          ))}
        </ul>
        {ask ? (
          <div className="mt-3">
            {left > 0 && <p className="mb-2 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-800">Some steps aren&apos;t finished. You can still give the final OK — it&apos;s your call.</p>}
            <Approval item={ask} labels={{ yes: "Yes, it's ready — publish", changes: "Not yet — ask for changes" }} />
          </div>
        ) : !published && (
          <p className="mt-3 text-sm text-[var(--quiet)]">When the team has the final files ready, your final OK goes here. Nothing is published without it.</p>
        )}
      </Card>

      <BookReader productId={id} title={product?.title ?? ""} author={product?.author_name ?? ""} coverId={driveId(cover?.file_url)} pages={pages} canWrite={v.canWrite} />
    </StepShell>
  );
}
