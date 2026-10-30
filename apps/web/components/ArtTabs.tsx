"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approvePicture } from "@/app/actions";
import { Art } from "./BookWorkspace";
import { PicturePlan } from "./ScriptTabs";
import { btn } from "./ui";

type Page = Record<string, string>;
const CHANGE = "Picture change for page";

/**
 * The Illustrations step's two views, like the Script's. "Page by page": each picture large, her
 * words under it, the picture plan, Approve or ask for a change; an approved picture folds to a thin
 * "✓ Approved" line. "All pictures": every picture at once; tap one to open its page.
 */
export function ArtTabs({ productId, pages, approved, notes, canWrite }: { productId: string; pages: Page[]; approved: Record<string, string>; notes: Page[]; canWrite: boolean }) {
  const [tab, setTab] = useState<"pages" | "all">("pages");
  const [ok, setOk] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.keys(approved).map((k) => [k, true])));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const done = pages.filter((p) => ok[p.page_number]).length;
  const drawn = pages.filter((p) => p.art_id).length;

  const goTo = (n: string) => {
    setTab("pages"); setOpen((o) => ({ ...o, [n]: true }));
    requestAnimationFrame(() => document.getElementById(`art-page-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const tabBtn = (id: "pages" | "all", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`min-h-10 flex-1 rounded-full px-4 text-sm transition ${tab === id ? "bg-white font-semibold shadow-sm" : "text-[var(--quiet)]"}`}>{label}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex flex-1 gap-1 rounded-full bg-black/5 p-1 md:max-w-sm">{tabBtn("pages", "Page by page")}{tabBtn("all", "All pictures")}</div>
        <p className="text-sm text-[var(--quiet)]">{done} of {drawn} pictures approved{drawn < pages.length ? ` · ${pages.length - drawn} still being drawn` : ""}</p>
      </div>

      {tab === "pages" ? (
        <ol className="flex flex-col gap-3">
          {pages.map((p) => {
            const n = p.page_number;
            const isOk = ok[n] && !open[n];
            return (
              <li key={p.page_id} id={`art-page-${n}`} className="glass scroll-mt-20 rounded-3xl p-4 md:p-5">
                <p className="mb-2 text-sm font-semibold">Page {n}</p>
                {isOk ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-3 py-2.5">
                    <div className="w-12 shrink-0 overflow-hidden rounded-lg"><Art id={p.art_id} brief="" small /></div>
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">✓ Approved</span>
                    <p className="min-w-0 flex-1 truncate text-sm text-[var(--quiet)]">{p.text}</p>
                    {canWrite && <button onClick={() => setOpen((o) => ({ ...o, [n]: true }))} className="shrink-0 text-sm text-orange-700 underline">Edit</button>}
                  </div>
                ) : (
                  <ArtPage productId={productId} page={p} notes={notes.filter((x) => x.page_number === n)} canWrite={canWrite} approved={!!ok[n]}
                    onApproved={() => { setOk((o) => ({ ...o, [n]: true })); setOpen((o) => ({ ...o, [n]: false })); }}
                    onClose={ok[n] ? () => setOpen((o) => ({ ...o, [n]: false })) : undefined} />
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="glass grid grid-cols-2 gap-3 rounded-3xl p-4 sm:grid-cols-3 md:p-5 lg:grid-cols-4">
          {pages.map((p) => (
            <button key={p.page_id} type="button" onClick={() => goTo(p.page_number)}
              className="relative overflow-hidden rounded-2xl border border-white bg-white/70 text-left transition hover:border-orange-300">
              <Art id={p.art_id} brief={p.art_brief} />
              {ok[p.page_number] && <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">✓</span>}
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-[var(--quiet)]">Page {p.page_number}{ok[p.page_number] ? " · approved" : p.art_id ? "" : " · being drawn"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs">{p.text || "—"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** One page open: the picture big, her words, the plan and her notes, Approve. */
function ArtPage({ productId, page, notes, canWrite, approved, onApproved, onClose }: {
  productId: string; page: Page; notes: Page[]; canWrite: boolean; approved: boolean; onApproved: () => void; onClose?: () => void;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const approve = () => start(async () => {
    const r = await approvePicture(productId, page.page_number).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { onApproved(); router.refresh(); } else setMsg(r.error ?? "Didn't save");
  });
  const ideas = notes.filter((n) => n.body.startsWith("Picture idea for page") || n.body.startsWith(CHANGE));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="overflow-hidden rounded-2xl"><Art id={page.art_id} brief={page.art_brief} large /></div>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="mb-1 text-xs font-semibold text-[var(--quiet)]">{page.text_final ? "Your words on this page" : "The words on this page (still the draft)"}</p>
          <p className="font-serif text-[17px] leading-relaxed">{page.text || "—"}</p>
        </div>
        <PicturePlan productId={productId} page={page} ideas={ideas} canWrite={canWrite} prefix={CHANGE}
          action="Ask for a change" placeholder="e.g. Make Papa smile, and the baby a little smaller" sentMsg="Sent to the artist — they'll redraw it ✓" />
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={pending || !page.art_id || approved} onClick={approve} className={btn.primary}>
              {approved ? "✓ Approved" : page.art_id ? (pending ? "Saving…" : "Approve picture") : "Art is coming"}
            </button>
            {onClose && <button onClick={onClose} className={btn.quiet}>Done</button>}
            {msg && <span className="text-sm text-red-600">{msg}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
