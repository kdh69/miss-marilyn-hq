import { Card } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot } from "@/lib/data";

export default async function Trends() {
  const s = await getSnapshot();
  const rows = [...s.research].reverse();
  return (
    <Card title="What Scout found">
      <Table rows={rows} cols={[["topic", "Topic"], ["finding", "Finding"], ["confidence", "Confidence"], ["suggested_action", "Idea"]]} empty="No research yet." />
      {/* TODO: "Make this a product" button → creates a book_plan request for the Orchestrator */}
    </Card>
  );
}
