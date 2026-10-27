import { Card } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot } from "@/lib/data";

export default async function Next() {
  const s = await getSnapshot();
  const upcoming = s.tasks.filter((t) => !["done", "cancelled"].includes(t.status) && t.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const posts = s.content.filter((c) => ["approved", "scheduled"].includes(c.status)).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  return (
    <div className="flex flex-col gap-4">
      <Card title="Coming up"><Table rows={upcoming} cols={[["due_date", "Due"], ["title", "Task"], ["owner", "Who"]]} empty="Nothing scheduled." /></Card>
      <Card title="Content calendar"><Table rows={posts} cols={[["scheduled_for", "When"], ["channel", "Where"], ["hook", "Post"]]} empty="No posts scheduled yet." /></Card>
    </div>
  );
}
