"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerItem, setAccountStatus } from "@/app/actions";
import { when } from "@/lib/labels";
import { Empty } from "./ui";

type Item = { id: string; when: string; what: string; where: string; href: string; finish?: { kind: "item" | "account"; id: string } };

/** Her list. A tick closes what the panel may close; everything else opens where she does it. */
export function TodoList({ items, canWrite }: { items: Item[]; canWrite: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const tick = (t: Item) => start(async () => {
    if (!t.finish) return;
    const r = await (t.finish.kind === "item" ? answerItem(t.finish.id, "Done") : setAccountStatus(t.finish.id, "done"))
      .catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { setDone((d) => ({ ...d, [t.id]: true })); setErr(""); router.refresh(); }
    else setErr(r.error ?? "Didn't save — try again");
  });

  if (!items.length) return <Empty>Nothing waiting on you.</Empty>;
  return (
    <>
      <ul className="flex flex-col divide-y divide-black/5">
        {items.map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            {t.finish ? (
              <button type="button" onClick={() => tick(t)} disabled={pending || !canWrite || done[t.id]} aria-label={`Mark done: ${t.what}`}
                className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-default">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm text-white ${done[t.id] ? "border-orange-500 bg-orange-500" : "border-orange-300"}`}>{done[t.id] ? "✓" : ""}</span>
              </button>
            ) : (
              <span className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden><span className="h-2 w-2 rounded-full bg-orange-400" /></span>
            )}
            <Link href={t.href} className="flex min-w-0 flex-1 items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] ${done[t.id] ? "text-[var(--quiet)] line-through" : ""}`}>{t.what}</span>
                <span className="block text-xs text-[var(--quiet)]">{t.where}{t.when ? ` · ${when(t.when)}` : ""}</span>
              </span>
              <span className="text-[var(--quiet)]">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--quiet)]">{err || (canWrite ? "Tick the box when it's done. Approvals open in the book, so you see what you're OK-ing." : "Preview only — sign in to tick things off.")}</p>
    </>
  );
}
