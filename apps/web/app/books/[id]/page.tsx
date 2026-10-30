import { notFound } from "next/navigation";
import { viewer } from "@/auth";
import { BookWorkspace } from "@/components/BookWorkspace";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { NeedsYou } from "@/components/NeedsYou";
import { Card, PageHeader, StageTrack } from "@/components/ui";
import { Table } from "@/components/Table";
import { bookPages, bookStage, getSnapshot, needsYou } from "@/lib/data";
import { CHANNEL, PRODUCT_STATUS } from "@/lib/labels";

export default async function Book({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const book = s.products.find((p) => p.product_id === id);
  if (!book) notFound();
  const st = bookStage(s, id);
  const requests = s.requests.filter((r) => r.product_id === id).reverse();
  const thread = requests.filter((r) => !r.page_number);
  const items = needsYou(s, v.view).filter((n) => n.productId === id);
  const technical = v.view === "kyle";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={{ href: "/books", label: "All books" }}
        title={book.title}
        eyebrow={technical ? `${id} · ${book.status}${book.lesson_theme ? ` · ${book.lesson_theme}` : ""}` : `${PRODUCT_STATUS[book.status] ?? book.status}${book.lesson_theme ? ` · about ${book.lesson_theme}` : ""}`}
        sub={st.now}
      />
      <div className="px-1"><StageTrack index={st.index} /></div>

      <NeedsYou items={items} viewer={v.view} showBook={false} />

      <Card title="Pages">
        <BookWorkspace productId={id} pages={bookPages(s, id)} requests={requests} viewer={v.view} canEdit={!!v.real} technical={technical} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <details className="glass group self-start rounded-3xl p-4 md:p-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold">
              <span>Talk to the team about this book{thread.length ? ` · ${thread.length}` : ""}</span>
              <span className="text-[var(--quiet)] transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <MessageBox productId={id} placeholder="Ideas, changes, anything about this book…" />
              {thread.length ? thread.map((r) => <MessageItem key={r.request_id} r={r} viewer={v.view} compact />) : <p className="text-sm text-[var(--quiet)]">No messages yet.</p>}
            </div>
          </details>
          {technical && (
            <Card title="Tasks">
              <Table rows={s.tasks.filter((t) => t.product_id === id)} cols={[["task_id", "ID"], ["task_type", "Type"], ["owner", "Owner"], ["status", "Status"], ["due_date", "Due"]]} empty="No tasks." />
            </Card>
          )}
          {s.listings.some((l) => l.sku.startsWith(id)) && (
            <Card title="Where it's sold">
              <Table rows={s.listings.filter((l) => l.sku.startsWith(id)).map((l) => ({ ...l, channel: CHANNEL[l.channel] ?? l.channel }))} cols={[["channel", "Where"], ["status", "Status"], ["price", "Price"]]} empty="" />
            </Card>
          )}
      </div>
    </div>
  );
}
