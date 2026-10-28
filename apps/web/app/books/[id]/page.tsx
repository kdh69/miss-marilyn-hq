import Link from "next/link";
import { notFound } from "next/navigation";
import { BookWorkspace } from "@/components/BookWorkspace";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { Bar, Card, StageTrack } from "@/components/ui";
import { bookPages, bookProgress, bookStages, getSnapshot } from "@/lib/data";
import { STAGE_LABEL } from "@/lib/labels";
import { viewerRole } from "@/lib/viewer";

export default async function Book({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s, viewer] = await Promise.all([getSnapshot(), viewerRole()]);
  const book = s.products.find((p) => p.product_id === id);
  if (!book) notFound();
  const b = bookProgress(s, id);
  const requests = s.requests.filter((r) => r.product_id === id).reverse();
  const waiting = s.mom_queue.filter((m) => !m.answer && !m.processed_at && s.tasks.find((t) => t.task_id === m.task_id)?.product_id === id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/books" className="px-1 text-sm text-[var(--quiet)]">← All books</Link>
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-[var(--quiet)]">{id} · {book.status.replace("_", " ")}{book.lesson_theme ? ` · lesson: ${book.lesson_theme}` : ""}</p>
            <h1 className="mt-1 text-2xl font-semibold">{book.title}</h1>
            <p className="mt-1 text-sm text-[var(--quiet)]">Now: {b.stage}{waiting.length ? ` · ${waiting.length} waiting on you` : ""}</p>
          </div>
          <div className="w-full md:w-64"><Bar pct={b.pct} /><p className="mt-1 text-right text-xs text-[var(--quiet)]">{b.pct}%</p></div>
        </div>
        <div className="mt-5"><StageTrack stages={bookStages(s, id).map((x) => ({ ...x, label: STAGE_LABEL[x.type] }))} /></div>
      </Card>

      <Card title="Pages">
        <BookWorkspace productId={id} pages={bookPages(s, id)} requests={requests} viewer={viewer} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Tell the team about this book">
          <MessageBox productId={id} placeholder="Ideas, changes, anything about this book…" />
        </Card>
        <Card title="Conversation about this book">
          <div className="flex flex-col gap-3">
            {requests.filter((r) => !r.page_number).length
              ? requests.filter((r) => !r.page_number).map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />)
              : <p className="text-sm text-[var(--quiet)]">No messages yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
