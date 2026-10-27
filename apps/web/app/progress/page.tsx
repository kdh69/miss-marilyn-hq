import { Card } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot } from "@/lib/data";

const LABEL: Record<string, string> = { todo: "Queued", in_progress: "Working", blocked: "Stuck", ready_for_qc: "Waiting for check", in_qc: "Being checked", qc_fail: "Fixing", escalated: "Kyle looking", awaiting_mom: "Needs you", changes_requested: "Making your changes", approved: "Approved", publishing: "Publishing", done: "Done", cancelled: "Cancelled" };

export default async function Progress() {
  const s = await getSnapshot();
  const open = s.tasks.filter((t) => !["done", "cancelled"].includes(t.status)).map((t) => ({ ...t, status: LABEL[t.status] ?? t.status }));
  const recent = [...s.log].reverse().slice(0, 25);
  return (
    <div className="flex flex-col gap-4">
      <Card title="What the team is working on">
        <Table rows={open} cols={[["title", "Task"], ["owner", "Who"], ["status", "Status"], ["due_date", "Due"]]} empty="Nothing in progress." />
      </Card>
      <Card title="Latest activity">
        <Table rows={recent} cols={[["ts", "When"], ["actor", "Who"], ["task_id", "Task"], ["to_status", "Now"], ["message", "Note"]]} empty="No activity yet." />
      </Card>
    </div>
  );
}
