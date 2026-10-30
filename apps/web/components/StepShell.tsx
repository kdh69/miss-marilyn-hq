import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { activeBooks, bookStage, needsYou, type Snapshot } from "@/lib/data";
import { STAGE_TRACK } from "@/lib/labels";

/** The book a step page shows: ?book= if given, else the first book on this step, else none. */
export function pickBook(s: Snapshot, key: string, wanted?: string) {
  const books = activeBooks(s);
  if (wanted && books.some((b) => b.product_id === wanted)) return wanted;
  return books.find((b) => bookStage(s, b.product_id).key === key)?.product_id;
}

/**
 * Frame for a step page (Script, Illustrations, Building, Full book review): which step this is,
 * what happens here, and a row of books — the ones on this step first, with a dot if one needs her.
 */
export function StepShell({ step, s, view, selected, children }: { step: string; s: Snapshot; view: string; selected?: string; children?: ReactNode }) {
  const i = STAGE_TRACK.findIndex((x) => x.key === step);
  const st = STAGE_TRACK[i];
  const books = activeBooks(s).map((b) => ({ product_id: b.product_id, title: b.title, stage: bookStage(s, b.product_id) }));
  const here = books.filter((b) => b.stage.key === step);
  const elsewhere = books.filter((b) => b.stage.key !== step);
  const waiting = new Set(needsYou(s, view).filter((n) => n.href.startsWith(`${st.href}?`)).map((n) => n.productId));

  const chip = (b: (typeof books)[number], dim: boolean) => (
    <Link key={b.product_id} href={`${st.href}?book=${b.product_id}`} aria-current={b.product_id === selected ? "page" : undefined}
      className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition ${b.product_id === selected ? "border-orange-500 bg-orange-500 font-semibold text-white" : dim ? "border-black/10 bg-white/50 text-[var(--quiet)]" : "border-orange-200 bg-white/80 font-semibold"}`}>
      {b.title}
      {dim && <span className="text-xs font-normal">· {b.stage.label}</span>}
      {waiting.has(b.product_id) && <span className="h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" title="Needs you" />}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={st.label} sub={st.blurb} eyebrow={`Step ${i + 1} of ${STAGE_TRACK.length}`} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" style={{ scrollbarWidth: "none" }}>
        {here.map((b) => chip(b, false))}
        {elsewhere.map((b) => chip(b, true))}
      </div>
      {!here.length && <p className="px-1 text-sm text-[var(--quiet)]">No book is on this step right now. Tap any book above to look at it here anyway.</p>}
      {children}
    </div>
  );
}
