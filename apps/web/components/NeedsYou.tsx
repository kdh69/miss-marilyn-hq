"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { answerItem } from "@/app/actions";
import { PhotoUpload } from "./PhotoUpload";
import { MessageItem } from "./Messages";
import { MOM_ITEM } from "@/lib/labels";
import { btn } from "./ui";

type Row = Record<string, string>;
export type NeedsYouItem =
  | { kind: "approve"; id: string; productId: string; title: string; item: Row }
  | { kind: "question"; id: string; productId: string; title: string; request: Row };

/**
 * The "Needs you" strip: one row per thing waiting on the person looking, one button each.
 * Shown on the shelf (everything) and inside a book (just that book's).
 */
export function NeedsYou({ items, viewer, titles = {}, showBook = true }: { items: NeedsYouItem[]; viewer: "mom" | "kyle" | "family"; titles?: Record<string, string>; showBook?: boolean }) {
  if (!items.length) return null;
  return (
    <section className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4 md:p-5">
      <h2 className="mb-3 text-[15px] font-semibold text-orange-800">Needs you · {items.length}</h2>
      <div className="flex flex-col gap-3">
        {items.map((n) =>
          n.kind === "approve"
            ? <Approval key={n.id} item={n.item} book={showBook && n.productId ? { id: n.productId, title: titles[n.productId] ?? n.productId } : undefined} />
            : <MessageItem key={n.id} r={n.request} viewer={viewer} bookTitle={showBook ? titles[n.productId] : undefined} />,
        )}
      </div>
    </section>
  );
}

function Approval({ item, book }: { item: Row; book?: { id: string; title: string } }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const primary = item.item_type === "approve" || item.item_type === "kdp_publish" ? "Approve" : "Done";
  const label = item.item_type === "rewrite" ? "I've done it" : item.item_type === "photos" ? "Sent them" : item.item_type === "kdp_publish" ? "Yes, publish" : "Approve";

  const send = (a: "Approve" | "Changes" | "Reject" | "Done") =>
    start(async () => {
      const r = await answerItem(item.item_id, a, note).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
      setMsg(r.ok ? "Got it ✓" : r.error ?? "Didn't save — try again");
    });

  if (msg === "Got it ✓") return <div className="rounded-2xl bg-white/70 p-4 text-sm text-[var(--quiet)]">✓ {item.summary}</div>;

  return (
    <div className="rounded-2xl border border-white bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{MOM_ITEM[item.item_type] ?? "Review"}{book && <> · <Link href={`/books/${book.id}`} className="underline">{book.title}</Link></>}</p>
      <p className="mt-1 text-[15px] font-semibold">{item.summary}</p>
      {item.qc_summary && <p className="mt-1 text-sm text-[var(--quiet)]">{item.qc_summary}</p>}
      {item.preview_url && <a href={item.preview_url} target="_blank" className="mt-1 inline-block text-sm text-violet-600 underline">Open the preview</a>}
      {item.item_type === "rewrite" && book && <Link href={`/books/${book.id}`} className="mt-1 block text-sm text-violet-600 underline">Open the book to write</Link>}
      {item.item_type === "photos" && <div className="mt-3"><PhotoUpload taskId={item.task_id} label="Upload photos" /></div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={() => send(primary)} className={btn.primary}>{label}</button>
        {(item.item_type === "approve" || item.item_type === "kdp_publish") && !open && (
          <button onClick={() => setOpen(true)} className={btn.quiet}>Ask for changes</button>
        )}
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" rows={3} className="rounded-xl border border-black/10 bg-white p-3 outline-none focus:border-orange-400" />
          <div className="flex flex-wrap gap-2">
            <button disabled={pending || !note.trim()} onClick={() => send("Changes")} className={btn.secondary}>Send changes</button>
            <button disabled={pending} onClick={() => send("Reject")} className={btn.quiet}>No, drop this</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-[var(--quiet)]">{msg}</p>}
    </div>
  );
}
