import Link from "next/link";
import { viewer } from "@/auth";
import { AccountRow } from "@/components/AccountRow";
import { Bar, Card, Empty, PageHeader } from "@/components/ui";
import { getSnapshot, todoList } from "@/lib/data";
import { CHANNEL, when } from "@/lib/labels";

/** Clara's list: what's waiting on her, this week's posts, and her accounts. */
export default async function Todo() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const items = todoList(s, v.view);
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const posts = s.content.filter((c) => ["approved", "scheduled"].includes(c.status) && c.scheduled_for && c.scheduled_for.slice(0, 10) <= weekEnd).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const accounts = s.accounts.filter((a) => a.status !== "not_needed");
  const done = accounts.filter((a) => a.status === "done").length;
  const canEditMine = v.real === "mom" || v.real === "kyle";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="To-do" sub={items.length ? `${items.length} on your list.` : "Your list is clear."} />
      <Card title="On your list">
        {items.length ? (
          <ul className="flex flex-col divide-y divide-black/5">
            {items.map((t) => (
              <li key={t.id}>
                <Link href={t.href} className="flex items-center gap-3 py-3">
                  <span className="h-5 w-5 shrink-0 rounded-md border-2 border-orange-300" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{t.what}</span>
                    <span className="block text-xs text-[var(--quiet)]">{t.where}{t.when ? ` · ${when(t.when)}` : ""}</span>
                  </span>
                  <span className="text-[var(--quiet)]">›</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>Nothing waiting on you.</Empty>}
      </Card>
      <Card title="This week's posts">
        {posts.length ? (
          <ul className="flex flex-col divide-y divide-black/5">
            {posts.map((c) => (
              <li key={c.content_id} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 text-sm text-[var(--quiet)]">{when(c.scheduled_for)}</span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{c.hook || c.content_type}</span>
                <span className="text-xs text-[var(--quiet)]">{CHANNEL[c.channel] ?? c.channel}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>No posts scheduled this week.</Empty>}
      </Card>
      <Card id="accounts" title="Accounts and socials">
        <p className="text-sm font-semibold">{done} of {accounts.length} set up</p>
        <div className="my-2"><Bar pct={accounts.length ? Math.round((done / accounts.length) * 100) : 0} /></div>
        <p className="mb-2 text-xs text-[var(--quiet)]">Passwords never go here — they live in the shared password manager.</p>
        <div className="flex flex-col divide-y divide-black/5">
          {accounts.map((a) => <AccountRow key={a.account_id} a={a} canEdit={canEditMine && (v.real === "kyle" || a.owner.toLowerCase().includes("clara"))} />)}
        </div>
        {!accounts.length && <Empty>No accounts listed yet.</Empty>}
      </Card>
    </div>
  );
}
