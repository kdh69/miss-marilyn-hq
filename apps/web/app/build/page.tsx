import { redirect } from "next/navigation";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { StepBook } from "@/components/StepBook";
import { Card, Empty, Pill } from "@/components/ui";
import { getSnapshot, latestAsset, stepAsk } from "@/lib/data";
import { STAGE_TRACK, TASK_STATUS, TASK_TYPE } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/** Step 4 — Building. Words and pictures are put together into the print files; Clara OKs the layout. */
export default async function Building({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/build")) redirect("/");
  const id = pickBook(s, "build", book);
  if (!id) return <StepShell step="build" s={s} view={v.view} />;

  const types = STAGE_TRACK.find((x) => x.key === "build")!.types;
  const tasks = s.tasks.filter((t) => t.product_id === id && types.includes(t.task_type) && t.status !== "cancelled");
  const ask = stepAsk(s, id, "build");
  const files = [
    { label: "Inside of the book (PDF)", a: latestAsset(s, id, ["interior_pdf"]) },
    { label: "Cover, front and back (PDF)", a: latestAsset(s, id, ["cover_pdf"]) },
    { label: "How it looks printed", a: latestAsset(s, id, ["mockup"]) },
  ].filter((f) => f.a?.file_url);

  return (
    <StepShell step="build" s={s} view={v.view} selected={id}>
      {ask && <Approval item={ask} labels={{ yes: "Approve the layout", changes: "Ask for changes" }} />}
      <Card title="What's being put together">
        {tasks.length ? (
          <ul className="flex flex-col divide-y divide-black/5">
            {tasks.map((t) => (
              <li key={t.task_id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-[15px]">{TASK_TYPE[t.task_type] ?? t.title}</span>
                <Pill tone={t.status === "done" ? "good" : t.status === "awaiting_mom" ? "accent" : "quiet"}>{TASK_STATUS[t.status] ?? t.status}</Pill>
              </li>
            ))}
          </ul>
        ) : <Empty>Building starts once the illustrations are done.</Empty>}
      </Card>
      <Card title="The print files">
        {files.length ? (
          <ul className="flex flex-col gap-2">
            {files.map((f) => (
              <li key={f.label}><a href={f.a!.file_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-2xl bg-white/70 px-4 text-[15px] text-violet-700 underline">{f.label} <span aria-hidden>↗</span></a></li>
            ))}
          </ul>
        ) : <Empty>The layout files show up here when the team has a first version.</Empty>}
      </Card>
      <StepBook s={s} id={id} view={v.view} canWrite={v.canWrite} title="Words and pictures together" />
    </StepShell>
  );
}
