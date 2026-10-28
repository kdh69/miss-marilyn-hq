import { viewerRole } from "@/lib/viewer";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { Card, Empty } from "@/components/ui";
import { getSnapshot } from "@/lib/data";

export default async function Messages() {
  const [s, viewer] = await Promise.all([getSnapshot(), viewerRole()]);
  const all = [...s.requests].reverse();
  const forMe = all.filter((r) => viewer && r.to === viewer && !r.reply && !["done", "wont_do"].includes(r.status));
  const rest = all.filter((r) => !forMe.includes(r));

  return (
    <div className="flex flex-col gap-4">
      <Card title={viewer === "kyle" ? "Waiting on you (route Clara's notes to the bots or handle them)" : "Questions for you"}>
        <div className="flex flex-col gap-3">
          {forMe.length ? forMe.map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />) : <Empty>Nothing waiting.</Empty>}
        </div>
      </Card>
      <Card title="New message">
        <MessageBox placeholder="Anything about the business — ideas, changes, questions…" to={viewer === "kyle" ? "orchestrator" : undefined} />
      </Card>
      <Card title="All messages">
        <div className="flex flex-col gap-3">
          {rest.length ? rest.map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />) : <Empty>No messages yet.</Empty>}
        </div>
      </Card>
    </div>
  );
}
