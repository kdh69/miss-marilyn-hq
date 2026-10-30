import { redirect } from "next/navigation";
import { viewer } from "@/auth";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { Table } from "@/components/Table";
import { bookTitle, getSnapshot, spendToday } from "@/lib/data";
import { MOM_ITEM } from "@/lib/labels";

/** Kyle's home: route Clara's notes, see what's stuck, what she still has waiting, spend. */
export default async function Inbox() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  if (v.view !== "kyle") redirect("/ideas");
  const all = [...s.requests].reverse();
  const forMe = all.filter((r) => r.to === "kyle" && !r.reply && !["done", "wont_do"].includes(r.status));
  const rest = all.filter((r) => !forMe.includes(r));
  const stuck = s.tasks.filter((t) => ["escalated", "qc_fail", "blocked"].includes(t.status));
  const onClara = s.mom_queue.filter((m) => !m.answer && !m.processed_at).map((m) => ({ ...m, item_type: MOM_ITEM[m.item_type] ?? m.item_type, book: bookTitle(s, s.tasks.find((t) => t.task_id === m.task_id)?.product_id ?? "") }));
  const spend = spendToday(s);
  const title = (r: Record<string, string>) => (r.product_id ? bookTitle(s, r.product_id) : undefined);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Inbox" sub={`${forMe.length} to route · ${stuck.length} stuck · ${onClara.length} waiting on Clara`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To route" value={String(forMe.length)} tone="accent" />
        <Stat label="Stuck" value={String(stuck.length)} tone={stuck.length ? "accent-2" : "ink"} />
        <Stat label="On Clara" value={String(onClara.length)} />
        <Stat label="Bots today" value={`$${spend.bots.toFixed(2)}`} sub={`/ $${spend.cap}`} />
      </div>
      <Card title="From Clara — route or handle">
        <div className="flex flex-col gap-3">
          {forMe.length ? forMe.map((r) => <MessageItem key={r.request_id} r={r} viewer="kyle" bookTitle={title(r)} />) : <Empty>Nothing to route.</Empty>}
        </div>
      </Card>
      {stuck.length > 0 && (
        <Card title="Stuck tasks">
          <Table rows={stuck} cols={[["task_id", "ID"], ["title", "Task"], ["status", "Status"], ["qc_notes", "QC notes"], ["blocked_reason", "Blocked"]]} empty="" />
        </Card>
      )}
      <Card title="Waiting on Clara">
        <Table rows={onClara} cols={[["item_type", "Ask"], ["summary", "What"], ["book", "Book"], ["requested_at", "Since"]]} empty="Nothing on her plate." />
      </Card>
      <Card title="Message the Orchestrator">
        <MessageBox to="orchestrator" placeholder="Instruction for the bots…" />
      </Card>
      <Card title="All messages">
        <div className="flex flex-col gap-3">
          {rest.length ? rest.map((r) => <MessageItem key={r.request_id} r={r} viewer="kyle" bookTitle={title(r)} compact />) : <Empty>No messages yet.</Empty>}
        </div>
      </Card>
    </div>
  );
}
