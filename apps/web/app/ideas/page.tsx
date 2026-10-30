import { viewer } from "@/auth";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { ScoutCard } from "@/components/ScoutCard";
import { Card, Empty, PageHeader } from "@/components/ui";
import { bookTitle, getSnapshot } from "@/lib/data";

/** The idea pad: jot it, see where it went. House rules and Scout's finds live here too. */
export default async function Ideas() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const all = [...s.requests].reverse();
  const ideas = all.filter((r) => r.kind === "idea" || (r.kind === "note" && r.from === v.view));
  const rules = all.filter((r) => r.kind === "rule");
  const scout = [...s.research].reverse().filter((r) => r.status === "new");
  const title = (r: Record<string, string>) => (r.product_id ? bookTitle(s, r.product_id) : undefined);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ideas" sub="Jot it down. The team picks it up from here." />
      <MessageBox defaultKind="idea" kinds={["idea", "note", "rule"]} placeholder="A book, a character, a printable, anything…" rows={3} big />
      {scout.length > 0 && (
        <Card title="Ideas from the team">
          <div className="flex flex-col gap-3">{scout.map((r) => <ScoutCard key={r.research_id} r={r} canWrite={!!v.real} />)}</div>
        </Card>
      )}
      <Card title="Your ideas">
        <div className="flex flex-col gap-3">
          {ideas.length ? ideas.map((r) => <MessageItem key={r.request_id} r={r} viewer={v.view} bookTitle={title(r)} compact />) : <Empty>Nothing yet. Your first idea goes above.</Empty>}
        </div>
      </Card>
      <Card title="House rules">
        <p className="mb-3 text-sm text-[var(--quiet)]">Things every book follows. Add one above with “Always do this”.</p>
        <div className="flex flex-col gap-3">
          {rules.length ? rules.map((r) => <MessageItem key={r.request_id} r={r} viewer={v.view} bookTitle={title(r)} compact />) : <Empty>No rules yet.</Empty>}
        </div>
      </Card>
    </div>
  );
}
