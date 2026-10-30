import Link from "next/link";
import { viewer } from "@/auth";
import { Card, Empty, PageHeader, StageTrack } from "@/components/ui";
import { Table } from "@/components/Table";
import { bookStage, getSnapshot } from "@/lib/data";
import { TASK_STATUS, WHO, when } from "@/lib/labels";

/** One card per book on the Story → Art → Layout → Publish → On sale track. Kyle also gets the tables. */
export default async function Progress() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const books = s.products.filter((p) => p.status !== "retired");
  const technical = v.view === "kyle";
  const open = s.tasks.filter((t) => !["done", "cancelled"].includes(t.status)).map((t) => ({ ...t, status: technical ? t.status : TASK_STATUS[t.status] ?? t.status, owner: WHO[t.owner] ?? t.owner }));
  const recent = [...s.log].reverse().slice(0, 25).map((l) => ({ ...l, ts: when(l.ts), actor: WHO[l.actor] ?? l.actor }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Progress" sub="Where each book is, and what's next." />
      {books.map((p) => {
        const st = bookStage(s, p.product_id);
        return (
          <Card key={p.product_id}>
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/books/${p.product_id}`} className="text-lg font-semibold">{p.title}</Link>
              <span className="text-sm text-[var(--quiet)]">{st.pct}% done</span>
            </div>
            <div className="my-3"><StageTrack index={st.index} /></div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
              <dt className="text-[var(--quiet)]">Now</dt><dd>{st.now}</dd>
              {st.waiting && <><dt className="text-orange-700">On you</dt><dd className="text-orange-700">{st.waiting}</dd></>}
              {st.next && <><dt className="text-[var(--quiet)]">Next</dt><dd>{st.next}</dd></>}
            </dl>
          </Card>
        );
      })}
      {!books.length && <Empty>No books yet.</Empty>}
      {technical && (
        <>
          <Card title="Open tasks">
            <Table rows={open} cols={[["task_id", "ID"], ["title", "Task"], ["owner", "Who"], ["status", "Status"], ["qc_result", "QC"], ["qc_attempts", "Tries"], ["due_date", "Due"]]} empty="Nothing in progress." />
          </Card>
          <Card title="Latest activity">
            <Table rows={recent} cols={[["ts", "When"], ["actor", "Who"], ["task_id", "Task"], ["to_status", "Now"], ["message", "Note"]]} empty="No activity yet." />
          </Card>
        </>
      )}
    </div>
  );
}
