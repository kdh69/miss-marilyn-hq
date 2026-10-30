"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approvePage } from "@/app/actions";
import { Art } from "./BookWorkspace";
import { PicturePlan } from "./ScriptTabs";
import { btn } from "./ui";

type Page = Record<string, string>;

/** What changes between the Illustrations step (pictures) and the Building step (finished pages). */
const MODE = {
  art: {
    what: "picture" as const, allTab: "All pictures", unit: "pictures", approve: "Approve picture",
    change: "Picture change for page", ask: "Ask for a change", sent: "Sent to the artist — they'll redraw it ✓",
    placeholder: "e.g. Make Papa smile, and the baby a little smaller", notReady: "Art is coming",
  },
  layout: {
    what: "layout" as const, allTab: "Whole book", unit: "pages", approve: "Approve page",
    change: "Layout change for page", ask: "Ask for a layout change", sent: "Sent to the team — they'll fix the page ✓",
    placeholder: "e.g. Make the words bigger, and move them off Ollie's face", notReady: "Waiting for the picture",
  },
};

/**
 * Two views of a book's pages, like the Script's: "Page by page" (each one large, Approve or ask for a
 * change; an approved one folds to a thin "✓ Approved" line) and "All pictures" / "Whole book" (every
 * page at once; tap one to open it). `mode` picks pictures (Illustrations) or finished pages (Building).
 */
export function PageTabs({ mode, productId, pages, approved, notes, canWrite }: {
  mode: keyof typeof MODE; productId: string; pages: Page[]; approved: Record<string, string>; notes: Page[]; canWrite: boolean;
}) {
  const m = MODE[mode];
  const [tab, setTab] = useState<"pages" | "all">("pages");
  const [ok, setOk] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.keys(approved).map((k) => [k, true])));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const ready = pages.filter((p) => p.art_id).length;
  const done = pages.filter((p) => ok[p.page_number]).length;

  const goTo = (n: string) => {
    setTab("pages"); setOpen((o) => ({ ...o, [n]: true }));
    requestAnimationFrame(() => document.getElementById(`${mode}-page-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const tabBtn = (id: "pages" | "all", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`min-h-10 flex-1 rounded-full px-4 text-sm transition ${tab === id ? "bg-white font-semibold shadow-sm" : "text-[var(--quiet)]"}`}>{label}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex flex-1 gap-1 rounded-full bg-black/5 p-1 md:max-w-sm">{tabBtn("pages", "Page by page")}{tabBtn("all", m.allTab)}</div>
        <p className="text-sm text-[var(--quiet)]">{done} of {ready} {m.unit} approved{ready < pages.length ? ` · ${pages.length - ready} still being drawn` : ""}</p>
      </div>

      {tab === "pages" ? (
        <ol className="flex flex-col gap-3">
          {pages.map((p) => {
            const n = p.page_number;
            return (
              <li key={p.page_id} id={`${mode}-page-${n}`} className="glass scroll-mt-20 rounded-3xl p-4 md:p-5">
                <p className="mb-2 text-sm font-semibold">Page {n}</p>
                {ok[n] && !open[n] ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-3 py-2.5">
                    <div className="w-12 shrink-0 overflow-hidden rounded-lg"><Art id={p.art_id} brief="" small /></div>
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">✓ Approved</span>
                    <p className="min-w-0 flex-1 truncate text-sm text-[var(--quiet)]">{p.text}</p>
                    {canWrite && <button onClick={() => setOpen((o) => ({ ...o, [n]: true }))} className="shrink-0 text-sm text-orange-700 underline">Edit</button>}
                  </div>
                ) : (
                  <OnePage mode={mode} productId={productId} page={p} notes={notes.filter((x) => x.page_number === n)} canWrite={canWrite} approved={!!ok[n]}
                    onApproved={() => { setOk((o) => ({ ...o, [n]: true })); setOpen((o) => ({ ...o, [n]: false })); }}
                    onClose={ok[n] ? () => setOpen((o) => ({ ...o, [n]: false })) : undefined} />
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={`glass grid gap-3 rounded-3xl p-4 md:p-5 ${mode === "layout" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {pages.map((p) => (
            <button key={p.page_id} type="button" onClick={() => goTo(p.page_number)} aria-label={`Page ${p.page_number}`}
              className="relative overflow-hidden rounded-2xl border border-white bg-white/70 text-left transition hover:border-orange-300">
              {mode === "layout" ? <PrintedPage page={p} /> : <Art id={p.art_id} brief={p.art_brief} />}
              {ok[p.page_number] && <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">✓</span>}
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-[var(--quiet)]">Page {p.page_number}{ok[p.page_number] ? " · approved" : p.art_id ? "" : " · being drawn"}</p>
                {mode === "art" && <p className="mt-0.5 line-clamp-2 text-xs">{p.text || "—"}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A page as it will print: the picture, her words set beneath it. Draft-only words are flagged — they won't print. */
export function PrintedPage({ page, large = false }: { page: Page; large?: boolean }) {
  return (
    <div className={`bg-white ${large ? "rounded-2xl shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5" : ""}`}>
      <div className={large ? "overflow-hidden rounded-t-2xl" : ""}><Art id={page.art_id} brief={page.art_brief} /></div>
      <div className={large ? "px-6 py-5" : "px-3 py-2.5"}>
        <p className={`font-serif leading-relaxed text-[var(--ink)] ${large ? "text-[19px]" : "line-clamp-3 text-[13px]"} ${page.text_final ? "" : "opacity-60"}`}>{page.text || "—"}</p>
        {!page.text_final && <p className={`mt-1.5 text-orange-800 ${large ? "text-sm" : "text-[11px]"}`}>Still the draft&apos;s words — won&apos;t print until you make them yours in Script.</p>}
      </div>
    </div>
  );
}

/** One page open: the picture (or the finished page), her words, the plan and her notes, Approve. */
function OnePage({ mode, productId, page, notes, canWrite, approved, onApproved, onClose }: {
  mode: keyof typeof MODE; productId: string; page: Page; notes: Page[]; canWrite: boolean; approved: boolean; onApproved: () => void; onClose?: () => void;
}) {
  const m = MODE[mode];
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const approve = () => start(async () => {
    const r = await approvePage(productId, page.page_number, m.what).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { onApproved(); router.refresh(); } else setMsg(r.error ?? "Didn't save");
  });
  const ideas = notes.filter((n) => /^Picture (idea|change) for page|^Layout change for page/.test(n.body));
  const canApprove = !!page.art_id;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
      {mode === "layout" ? <PrintedPage page={page} large /> : <div className="overflow-hidden rounded-2xl"><Art id={page.art_id} brief={page.art_brief} large /></div>}
      <div className="flex flex-col gap-3">
        {mode === "art" && (
          <div className="rounded-2xl bg-white/80 p-4">
            <p className="mb-1 text-xs font-semibold text-[var(--quiet)]">{page.text_final ? "Your words on this page" : "The words on this page (still the draft)"}</p>
            <p className="font-serif text-[17px] leading-relaxed">{page.text || "—"}</p>
          </div>
        )}
        <PicturePlan productId={productId} page={page} ideas={ideas} canWrite={canWrite} prefix={m.change}
          action={m.ask} placeholder={m.placeholder} sentMsg={m.sent} />
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={pending || !canApprove || approved} onClick={approve} className={btn.primary}>
              {approved ? "✓ Approved" : canApprove ? (pending ? "Saving…" : m.approve) : m.notReady}
            </button>
            {onClose && <button onClick={onClose} className={btn.quiet}>Done</button>}
            {msg && <span className="text-sm text-red-600">{msg}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
