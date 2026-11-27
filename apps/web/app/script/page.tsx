import { redirect } from "next/navigation";
import { Art } from "@/components/BookWorkspace";
import { BookSpreads } from "@/components/BookSpreads";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { Approval } from "@/components/NeedsYou";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Empty, Pill } from "@/components/ui";
import { bookPages, driveId, getSnapshot, latestAsset, needsYou, pageApprovals, stepAsk, stepTask } from "@/lib/data";
import { TASK_STATUS, bookNumber, hasWords } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 2 — Words & pictures (the Script and Illustrations steps on one screen). The book laid out
 * like the open book: the words on the left page, the picture on the right. Clara changes the
 * words right on the page, approves each picture or asks for a change, and approves the script.
 */
export default async function WordsAndPictures({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/script")) redirect("/");
  const id = pickBook(s, "script", book);
  const product = s.products.find((p) => p.product_id === id);

  return (
    <StepShell step="script" s={s} view={v.view} selected={id}>
      {id && product && <BookView s={s} id={id} view={v.view} canWrite={v.canWrite} />}
    </StepShell>
  );
}

function BookView({ s, id, view, canWrite }: { s: Awaited<ReturnType<typeof getSnapshot>>; id: string; view: "mom" | "kyle" | "family"; canWrite: boolean }) {
  const pages = bookPages(s, id);
  const product = s.products.find((p) => p.product_id === id);
  const task = stepTask(s, id, "script");
  const scriptAsk = stepAsk(s, id, "script");
  const artAsk = stepAsk(s, id, "art");
  const cover = latestAsset(s, id, ["cover_art"]);
  const approved = pageApprovals(s, id, "picture");
  const questions = needsYou(s, view).filter((n) => n.kind === "question" && n.productId === id);
  const wordy = pages.filter(hasWords);
  const yours = wordy.filter((p) => p.text_final).length;
  const drawn = pages.filter((p) => p.art_id).length;
  const pics = pages.filter((p) => p.art_id && approved[p.page_number]).length;
  const left = wordy.length - yours;
  // A rewrite in progress: drafts the Producer writes after this are offered on pages already hers.
  const rewriteSince = s.tasks.filter((t) => t.product_id === id && t.task_type === "story_draft" && !["done", "cancelled"].includes(t.status))
    .map((t) => t.created_at).sort().pop() ?? "";
  const status = !task ? "The team hasn't started the words yet."
    : task.status === "done" ? "Words approved. The pictures are being finished."
    : task.status === "awaiting_mom" ? "Go through it one page at a time. Change any words right on the page, then tap Looks good or Something's wrong."
    : `The team is on it: ${(TASK_STATUS[task.status] ?? task.status).toLowerCase()}.`;

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 shrink-0 overflow-hidden rounded-xl shadow-sm md:w-24" title="Front cover"><Art id={driveId(cover?.file_url)} brief="" small /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{bookNumber(product) || id}</p>
            <h2 className="text-xl font-semibold">{product?.title}</h2>
            <p className="mt-1 text-[15px]">{status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={wordy.length && !left ? "good" : "accent"}>{yours} of {wordy.length} pages in your words</Pill>
              <Pill tone={drawn && pics === drawn ? "good" : "accent-2"}>{pics} of {drawn || pages.length} pictures approved</Pill>
            </div>
          </div>
        </div>

        {questions.length > 0 && (
          <details className="mt-3 rounded-2xl bg-orange-500/10 p-3" open={questions.length <= 3}>
            <summary className="cursor-pointer text-[15px] font-semibold text-orange-900">The team has {questions.length} question{questions.length > 1 ? "s" : ""} about this book</summary>
            <div className="mt-2 flex flex-col gap-2">
              {questions.map((n) => n.kind === "question" && <MessageItem key={n.id} r={n.request} viewer={view} compact />)}
            </div>
          </details>
        )}
      </Card>

      {pages.length ? (
        <BookSpreads productId={id} pages={pages} approved={approved} canWrite={canWrite} rewriteSince={rewriteSince} />
      ) : <Card><Empty>The pages show up here as soon as the team writes them.</Empty></Card>}

      {(scriptAsk || artAsk) && (
        <Card title="When you're happy with it">
          {scriptAsk && (
            <>
              {left > 0 && <p className="mb-2 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-800">{left} page{left > 1 ? "s are" : " is"} still the team&apos;s draft. Tap Looks good on {left > 1 ? "those pages" : "that page"} to make the words yours — only your words get printed.</p>}
              <Approval item={scriptAsk} labels={{ yes: "Approve the words", changes: "Ask the team for changes" }} />
            </>
          )}
          {artAsk && <div className={scriptAsk ? "mt-3" : ""}><Approval item={artAsk} labels={{ yes: "Approve the cover", changes: "Ask for changes" }} /></div>}
        </Card>
      )}

      {canWrite && (
        <Card title="A note about the whole book">
          <MessageBox productId={id} defaultKind="change" kinds={["change", "note", "question"]} placeholder="e.g. Make Papa funnier all the way through" />
        </Card>
      )}
    </>
  );
}
