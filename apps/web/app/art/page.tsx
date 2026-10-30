import Link from "next/link";
import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { Bar, Card, Empty, Pill } from "@/components/ui";
import { bookPages, driveId, getSnapshot, latestAsset, stepAsk, stepTask } from "@/lib/data";
import { TASK_STATUS } from "@/lib/labels";
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

  return (
    <StepShell step="art" s={s} view={v.view} selected={id}>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={pages.length && drawn === pages.length ? "good" : "accent-2"}>{drawn} of {pages.length} pages drawn</Pill>
          <span className="text-[15px]">{!scriptDone ? "Pictures start once you approve the script." : task ? `Art: ${(TASK_STATUS[task.status] ?? task.status).toLowerCase()}.` : "The artist starts soon."}</span>
        </div>
        {pages.length > 0 && <div className="mt-3"><Bar pct={Math.round((drawn / pages.length) * 100)} tone="accent-2" /></div>}
        {ask && <div className="mt-3"><Approval item={ask} labels={{ yes: "Approve the cover", changes: "Ask for changes" }} /></div>}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <Card title="Cover">
          <div className="overflow-hidden rounded-2xl"><Art id={driveId(cover?.file_url)} brief="the front cover" large /></div>
        </Card>
        <Card title="Pages" action={<span className="text-xs text-[var(--quiet)]">Tap a page to look closer or ask for a change</span>}>
          {pages.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((p) => (
                <Link key={p.page_id} href={`/books/${id}?page=${p.page_number}`} className="overflow-hidden rounded-2xl border border-white bg-white/70 transition hover:border-orange-300">
                  <Art id={p.art_id} brief={p.art_brief} />
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-[var(--quiet)]">Page {p.page_number}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs">{p.text || "—"}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : <Empty>No pages yet.</Empty>}
        </Card>
      </div>
    </StepShell>
  );
}
