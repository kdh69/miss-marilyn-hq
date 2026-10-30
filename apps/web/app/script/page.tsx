import { redirect } from "next/navigation";
import { PageText } from "@/components/BookWorkspace";
import { MessageBox } from "@/components/MessageBox";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Empty, Pill } from "@/components/ui";
import { bookPages, getSnapshot, stepAsk, stepTask } from "@/lib/data";
import { TASK_STATUS } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 2 — Script. The whole story on one screen, page by page, so Clara can read it straight
 * through, put it in her own words, and approve it. Her approval is what starts the illustrations.
 */
export default async function Script({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/script")) redirect("/");
  const id = pickBook(s, "script", book);
  const product = s.products.find((p) => p.product_id === id);

  return (
    <StepShell step="script" s={s} view={v.view} selected={id}>
      {id && product && <ScriptView s={s} id={id} canWrite={v.canWrite} />}
    </StepShell>
  );
}

function ScriptView({ s, id, canWrite }: { s: Awaited<ReturnType<typeof getSnapshot>>; id: string; canWrite: boolean }) {
  const pages = bookPages(s, id);
  const task = stepTask(s, id, "script");
  const ask = stepAsk(s, id, "script");
  const yours = pages.filter((p) => p.text_final).length;
  const left = pages.length - yours;
  const status = !task ? "The team hasn't started the script yet."
    : task.status === "done" ? "Script approved. The illustrations are next."
    : task.status === "awaiting_mom" ? "The script is ready for you to read and approve."
    : `The team is on it: ${(TASK_STATUS[task.status] ?? task.status).toLowerCase()}.`;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={task?.status === "done" ? "good" : task?.status === "awaiting_mom" ? "accent" : "quiet"}>{task?.status === "done" ? "Approved" : task?.status === "awaiting_mom" ? "Ready for you" : "In the works"}</Pill>
          <span className="text-[15px]">{status}</span>
        </div>
        {pages.length > 0 && <p className="mt-2 text-sm text-[var(--quiet)]">{yours} of {pages.length} pages in your words.{left ? " Only your words get printed, so make each page yours before you approve." : " Every page is yours."}</p>}
        {ask && (
          <div className="mt-3">
            {left > 0 && <p className="mb-2 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-800">{left} page{left > 1 ? "s are" : " is"} still the draft&apos;s words. Those pages won&apos;t print until you change them.</p>}
            <Approval item={ask} labels={{ yes: "Approve the script", changes: "Ask the team for changes" }} />
          </div>
        )}
      </Card>

      {pages.length ? (
        <ol className="flex flex-col gap-3">
          {pages.map((p) => (
            <li key={p.page_id} className="glass rounded-3xl p-4 md:p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Page {p.page_number}{p.text_final ? <span className="ml-2 font-normal text-orange-700">· your words</span> : null}</p>
                {p.art_brief && <p className="text-xs text-[var(--quiet)]">Picture: {p.art_brief}</p>}
              </div>
              <PageText page={p} canEdit={canWrite} compact />
            </li>
          ))}
        </ol>
      ) : <Card><Empty>The script shows up here page by page as soon as the team writes it.</Empty></Card>}

      {canWrite && (
        <Card title="A note about the whole script">
          <MessageBox productId={id} defaultKind="change" kinds={["change", "note", "question"]} placeholder="e.g. Make Papa funnier all the way through" />
        </Card>
      )}
    </>
  );
}
