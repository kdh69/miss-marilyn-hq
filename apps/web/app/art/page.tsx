import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { Approval } from "@/components/NeedsYou";
import { ArtTabs } from "@/components/ArtTabs";
import { StepShell, pickBook } from "@/components/StepShell";
import { Bar, Card, Empty, Pill } from "@/components/ui";
import { bookPages, driveId, getSnapshot, latestAsset, pictureApprovals, stepAsk, stepTask } from "@/lib/data";
import { bookNumber } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/** Step 3 — Illustrations. The approved script gets its pictures; Clara looks them over and OKs the cover. */
export default async function Illustrations({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/art")) redirect("/");
  const id = pickBook(s, "art", book);
  if (!id) return <StepShell step="art" s={s} view={v.view} />;

  const pages = bookPages(s, id);
  const drawn = pages.filter((p) => p.art_id).length;
  const task = stepTask(s, id, "art");
  const ask = stepAsk(s, id, "art");
  const cover = latestAsset(s, id, ["cover_art"]);
  const scriptDone = stepTask(s, id, "script")?.status === "done";
  const product = s.products.find((p) => p.product_id === id);
  const notes = s.requests.filter((r) => r.product_id === id && r.page_number);

  return (
    <StepShell step="art" s={s} view={v.view} selected={id}>
      <Card>
        <div className="mb-2 flex items-start gap-4">
          <div className="w-20 shrink-0 overflow-hidden rounded-xl shadow-sm md:w-28" title="Front cover"><Art id={driveId(cover?.file_url)} brief="" small /></div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{bookNumber(product) || id}</p>
            <h2 className="text-xl font-semibold">{product?.title}</h2>
            <p className="text-sm text-[var(--quiet)]">{cover?.file_url ? "Front cover is in" : "Front cover is being drawn"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={pages.length && drawn === pages.length ? "good" : "accent-2"}>{drawn} of {pages.length} pages drawn</Pill>
          <span className="text-[15px]">{!scriptDone && !drawn ? "Pictures start once you approve the script." : pages.length && drawn === pages.length ? "All the pictures are in." : drawn ? "The artist is drawing the rest." : task?.status === "blocked" ? "The artist is stuck — Kyle is looking." : "The artist starts soon."}</span>
        </div>
        {pages.length > 0 && <div className="mt-3"><Bar pct={Math.round((drawn / pages.length) * 100)} tone="accent-2" /></div>}
        {ask && <div className="mt-3"><Approval item={ask} labels={{ yes: "Approve the cover", changes: "Ask for changes" }} /></div>}
      </Card>

      {pages.length ? <ArtTabs productId={id} pages={pages} approved={pictureApprovals(s, id)} notes={notes} canWrite={v.canWrite} /> : <Card><Empty>No pages yet.</Empty></Card>}
    </StepShell>
  );
}
