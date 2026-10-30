import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { Approval } from "@/components/NeedsYou";
import { PageTabs } from "@/components/PageTabs";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Empty, Pill } from "@/components/ui";
import { bookPages, driveId, getSnapshot, latestAsset, pageApprovals, stepAsk, stepTask } from "@/lib/data";
import { STAGE_TRACK, TASK_STATUS, TASK_TYPE, bookNumber } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 4 — Building. Words and pictures are put together into the printed book. Clara looks at each
 * finished page (page by page, or the whole book at once), approves it or asks for a fix, and OKs the
 * layout.
 */
export default async function Building({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/build")) redirect("/");
  const id = pickBook(s, "build", book);
  if (!id) return <StepShell step="build" s={s} view={v.view} />;

  const product = s.products.find((p) => p.product_id === id);
  const pages = bookPages(s, id);
  const types = STAGE_TRACK.find((x) => x.key === "build")!.types;
  const tasks = s.tasks.filter((t) => t.product_id === id && types.includes(t.task_type) && t.status !== "cancelled");
  const ask = stepAsk(s, id, "build");
  const layout = stepTask(s, id, "build");
  const cover = latestAsset(s, id, ["cover_art"]);
  const notes = s.requests.filter((r) => r.product_id === id && r.page_number);
  const hers = pages.filter((p) => p.text_final).length;
  const drawn = pages.filter((p) => p.art_id).length;
  const files = [
    { label: "Inside of the book (PDF)", a: latestAsset(s, id, ["interior_pdf"]) },
    { label: "Cover, front and back (PDF)", a: latestAsset(s, id, ["cover_pdf"]) },
    { label: "How it looks printed", a: latestAsset(s, id, ["mockup"]) },
  ].filter((f) => f.a?.file_url);
  const status = !tasks.length ? "Building starts once the illustrations are done."
    : layout?.status === "done" ? "Layout approved. The full book review is next."
    : layout?.status === "awaiting_mom" ? "The layout is ready for you to look over."
    : `The team is putting it together: ${(TASK_STATUS[layout?.status ?? ""] ?? "working on it").toLowerCase()}.`;

  return (
    <StepShell step="build" s={s} view={v.view} selected={id}>
      <Card>
        <div className="mb-2 flex items-start gap-4">
          <div className="w-20 shrink-0 overflow-hidden rounded-xl shadow-sm md:w-28" title="Front cover"><Art id={driveId(cover?.file_url)} brief="" small /></div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{bookNumber(product) || id}</p>
            <h2 className="text-xl font-semibold">{product?.title}</h2>
            <p className="text-sm text-[var(--quiet)]">{hers} of {pages.length} pages in your words · {drawn} of {pages.length} drawn</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={layout?.status === "done" ? "good" : layout?.status === "awaiting_mom" ? "accent" : "quiet"}>{layout?.status === "done" ? "Approved" : layout?.status === "awaiting_mom" ? "Ready for you" : "In the works"}</Pill>
          <span className="text-[15px]">{status}</span>
        </div>
        {ask && <div className="mt-3"><Approval item={ask} labels={{ yes: "Approve the layout", changes: "Ask for changes" }} /></div>}
      </Card>

      {pages.length ? <PageTabs mode="layout" productId={id} pages={pages} approved={pageApprovals(s, id, "layout")} notes={notes} canWrite={v.canWrite} /> : <Card><Empty>No pages yet.</Empty></Card>}

      <Card title="Being put together">
        {tasks.length ? (
          <ul className="flex flex-col divide-y divide-black/5">
            {tasks.map((t) => (
              <li key={t.task_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[15px]">{TASK_TYPE[t.task_type] ?? t.title}</span>
                <Pill tone={t.status === "done" ? "good" : t.status === "awaiting_mom" ? "accent" : "quiet"}>{TASK_STATUS[t.status] ?? t.status}</Pill>
              </li>
            ))}
          </ul>
        ) : <Empty>Nothing yet.</Empty>}
        <p className="mb-1 mt-4 text-sm font-semibold">Print files</p>
        {files.length ? (
          <ul className="flex flex-col gap-2">
            {files.map((f) => (
              <li key={f.label}><a href={f.a!.file_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-2xl bg-white/70 px-4 text-[15px] text-violet-700 underline">{f.label} <span aria-hidden>↗</span></a></li>
            ))}
          </ul>
        ) : <Empty>The print files show up here when the team has a first version.</Empty>}
      </Card>
    </StepShell>
  );
}
