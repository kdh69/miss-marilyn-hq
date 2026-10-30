import Link from "next/link";
import { redirect } from "next/navigation";
import { IdeaBox } from "@/components/IdeaBox";
import { MessageBox } from "@/components/MessageBox";
import { MessageItem } from "@/components/Messages";
import { ScoutCard } from "@/components/ScoutCard";
import { Card, Empty, PageHeader } from "@/components/ui";
import { activeBooks, bookStage, bookTitle, getSnapshot } from "@/lib/data";
import { IDEA_KINDS, ideaKind } from "@/lib/labels";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Ideas HQ: every idea, not just books — printables, merch, posts, business, anything. Jot it,
 * filter by kind, see where it went. A book idea becomes a book (then Script → Art → Build → Review).
 */
export default async function Ideas({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/ideas")) redirect("/");
  const all = [...s.requests].reverse();
  const ideas = all.filter((r) => r.kind === "idea");
  const shown = type ? ideas.filter((r) => ideaKind(r.body) === type) : ideas;
  const rules = all.filter((r) => r.kind === "rule");
  const scout = [...s.research].reverse().filter((r) => r.status === "new");
  const planning = activeBooks(s).filter((p) => bookStage(s, p.product_id).key === "idea");
  const title = (r: Record<string, string>) => (r.product_id ? bookTitle(s, r.product_id) : undefined);
  const count = (id: string) => ideas.filter((r) => ideaKind(r.body) === id).length;
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm ${on ? "bg-[var(--ink)] font-semibold text-white" : "bg-black/5"}`}>{label}</Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ideas" sub="Everything starts here: books, printables, merch, posts, business — anything." />
      <IdeaBox canWrite={v.canWrite} />

      {planning.length > 0 && (
        <Card title="Becoming books">
          <ul className="flex flex-col divide-y divide-black/5">
            {planning.map((p) => (
              <li key={p.product_id}><Link href={`/books/${p.product_id}`} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">{p.title}<span className="text-xs text-[var(--quiet)]">The team is planning it · next: Script</span></Link></li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="All your ideas">
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
          {chip("/ideas", `All ${ideas.length}`, !type)}
          {IDEA_KINDS.filter((k) => count(k.id)).map((k) => chip(`/ideas?type=${k.id}`, `${k.emoji} ${k.label} ${count(k.id)}`, type === k.id))}
        </div>
        <div className="flex flex-col gap-3">
          {shown.length ? shown.map((r) => <MessageItem key={r.request_id} r={r} viewer={v.view} bookTitle={title(r)} compact />) : <Empty>{ideas.length ? "None of this kind yet." : "Nothing yet. Your first idea goes above."}</Empty>}
        </div>
      </Card>

      {scout.length > 0 && (
        <Card title="Ideas from Scout">
          <div className="flex flex-col gap-3">{scout.map((r) => <ScoutCard key={r.research_id} r={r} canWrite={v.canWrite} />)}</div>
        </Card>
      )}

      <Card title="House rules">
        <p className="mb-3 text-sm text-[var(--quiet)]">Things the team always follows, on every book and product.</p>
        {v.canWrite && <div className="mb-3"><MessageBox defaultKind="rule" kinds={["rule"]} placeholder="e.g. Miss Marilyn's collar is always red" /></div>}
        <div className="flex flex-col gap-3">
          {rules.length ? rules.map((r) => <MessageItem key={r.request_id} r={r} viewer={v.view} bookTitle={title(r)} compact />) : <Empty>No rules yet.</Empty>}
        </div>
      </Card>
    </div>
  );
}
