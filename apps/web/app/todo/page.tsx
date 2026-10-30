import { redirect } from "next/navigation";
import { canSee, viewer } from "@/lib/viewer";
import { AccountRow } from "@/components/AccountRow";
import { TodoList } from "@/components/TodoList";
import { Bar, Card, Empty, PageHeader } from "@/components/ui";
import { getSnapshot, todoList } from "@/lib/data";
import { CHANNEL, SET_UP_NOW, when } from "@/lib/labels";

/** Clara's list: what's waiting on her, this week's posts, and her accounts. */
export default async function Todo() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  if (!canSee(v.view, "/todo")) redirect("/");
  const items = todoList(s, v.view);
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const posts = s.content.filter((c) => ["approved", "scheduled"].includes(c.status) && c.scheduled_for && c.scheduled_for.slice(0, 10) <= weekEnd).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const accounts = s.accounts.filter((a) => a.status !== "not_needed");
  const done = accounts.filter((a) => a.status === "done").length;
  const canEditMine = v.canWrite;
  const groups = [
    { label: "Set up now", rows: accounts.filter((a) => SET_UP_NOW.includes(a.phase)) },
    { label: "Later", rows: accounts.filter((a) => !SET_UP_NOW.includes(a.phase)) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="To-do" sub={items.length ? `${items.length} on your list.` : "Your list is clear."} />
      <Card title="On your list">
        <TodoList items={items} canWrite={v.canWrite} />
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
        {groups.map(({ label, rows }) => rows.length > 0 && (
          <div key={label} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiet)]">{label}</p>
            <div className="flex flex-col divide-y divide-black/5">
              {rows.map((a) => <AccountRow key={a.account_id} a={a} canEdit={canEditMine && (v.real === "kyle" || a.owner.toLowerCase().includes("clara"))} technical={v.view === "kyle"} />)}
            </div>
          </div>
        ))}
        {!accounts.length && <Empty>No accounts listed yet.</Empty>}
      </Card>
    </div>
  );
}
