"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { sendMessage } from "@/app/actions";
import { Art } from "./BookWorkspace";
import { PrintedPage } from "./PageTabs";
import { bookMoments, type Moment } from "@/lib/spreads";
import { btn } from "./ui";

type Page = Record<string, string>;

/**
 * Full book review: the book as a reader gets it. "Read it" turns one page at a time from the
 * cover (arrows, swipe, ← →); "Whole book" shows every page at once. A two-page picture shows
 * once, whole. Each page takes a note if something should still change.
 */
export function BookReader({ productId, title, author, coverId, pages, canWrite }: {
  productId: string; title: string; author: string; coverId: string; pages: Page[]; canWrite: boolean;
}) {
  const moments = useMemo(() => bookMoments(pages), [pages]);
  const [tab, setTab] = useState<"read" | "all">("read");
  const [i, setI] = useState(-1); // -1 = the cover
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (d: number) => setI((x) => Math.min(moments.length - 1, Math.max(-1, x + d)));
  useEffect(() => {
    if (tab !== "read") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const tabBtn = (id: "read" | "all", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`min-h-10 flex-1 rounded-full px-4 text-sm transition ${tab === id ? "bg-white font-semibold shadow-sm" : "text-[var(--quiet)]"}`}>{label}</button>
  );
  const p = i >= 0 ? moments[i] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-1 rounded-full bg-black/5 p-1 md:max-w-sm">{tabBtn("read", "Read it")}{tabBtn("all", "Whole book")}</div>

      {tab === "read" ? (
        <div className="glass flex flex-col gap-4 rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => go(-1)} disabled={i === -1} aria-label="Previous page" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-xl disabled:opacity-30">‹</button>
            <span className="text-sm font-semibold">{p ? `${p.label} of ${pages.length}` : "Cover"}</span>
            <button onClick={() => go(1)} disabled={i === moments.length - 1} aria-label="Next page" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-xl disabled:opacity-30">›</button>
          </div>
          <div className={`mx-auto w-full ${p?.spread ? "max-w-3xl" : "max-w-md"}`}
            onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
            onTouchEnd={(e) => {
              const t = touch.current; touch.current = null;
              if (!t) return;
              const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
            }}>
            {p ? <PrintedMoment m={p} large /> : (
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5">
                <Art id={coverId} brief="the front cover" />
                <div className="px-6 py-5 text-center">
                  <p className="font-serif text-2xl font-semibold leading-snug">{title}</p>
                  {author && <p className="mt-1 text-sm text-[var(--quiet)]">by {author}</p>}
                </div>
              </div>
            )}
          </div>
          {/* Dots: where you are in the book. */}
          <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
            {[-1, ...moments.map((_, k) => k)].map((k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-orange-500" : "w-1.5 bg-black/15"}`} />)}
          </div>
          {p && canWrite && <ChangeNote key={p.key} productId={productId} pageNumber={p.pages[0].page_number} where={p.label.toLowerCase()} />}
        </div>
      ) : (
        <div className="glass grid grid-cols-1 gap-3 rounded-3xl p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
          {moments.map((m, k) => (
            <button key={m.key} type="button" onClick={() => { setI(k); setTab("read"); }} aria-label={m.label}
              className={`overflow-hidden rounded-2xl border border-white bg-white/70 text-left transition hover:border-orange-300 ${m.spread ? "sm:col-span-2" : ""}`}>
              <PrintedMoment m={m} />
              <p className="px-3 pb-2.5 text-[11px] font-semibold text-[var(--quiet)]">{m.label}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Something to change on this page?" — goes to the team as a note on the page. */
function ChangeNote({ productId, pageNumber, where }: { productId: string; pageNumber: string; where: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const r = await sendMessage({ kind: "change", productId, pageNumber, body: `Change for ${where}: ${text.trim()}` }).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { setText(""); setOpen(false); setMsg("Sent to the team ✓"); } else setMsg(r.error ?? "Didn't send");
  });
  if (!open) return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <button onClick={() => setOpen(true)} className="text-violet-700 underline">Something to change on {where.startsWith("pages") ? "these pages" : "this page"}?</button>
      {msg && <span className="text-[var(--quiet)]">{msg}</span>}
    </div>
  );
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus placeholder="e.g. Swap the last two lines" aria-label={`Change for ${where}`}
        className="w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-violet-400" />
      <div className="flex items-center gap-2">
        <button disabled={pending || !text.trim()} onClick={send} className={btn.small}>Send</button>
        <button onClick={() => setOpen(false)} className="min-h-9 px-2 text-sm text-[var(--quiet)]">Cancel</button>
        {msg && <span className="text-sm text-[var(--quiet)]">{msg}</span>}
      </div>
    </div>
  );
}

/** A page as it will print, or a two-page picture shown whole with the words that go with it. */
function PrintedMoment({ m, large = false }: { m: Moment; large?: boolean }) {
  if (!m.spread) return <PrintedPage page={m.pages[0]} large={large} />;
  const words = m.pages.filter((pg) => (pg.text || "").trim());
  const draftOnly = words.some((pg) => !pg.text_final);
  return (
    <div className={`bg-white ${large ? "rounded-2xl shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5" : ""}`}>
      <div className={`grid grid-cols-2 ${large ? "overflow-hidden rounded-t-2xl" : ""}`}>{m.pages.map((pg) => <Art key={pg.page_id} id={pg.art_id} brief="" />)}</div>
      <div className={large ? "px-6 py-5" : "px-3 py-2.5"}>
        {words.length ? words.map((pg) => (
          <p key={pg.page_id} className={`whitespace-pre-line font-serif leading-relaxed text-[var(--ink)] ${large ? "text-[19px]" : "line-clamp-3 text-[13px]"} ${pg.text_final ? "" : "opacity-60"}`}>{pg.text}</p>
        )) : <p className="text-sm text-[var(--quiet)]">No words on these pages.</p>}
        {draftOnly && <p className={`mt-1.5 text-orange-800 ${large ? "text-sm" : "text-[11px]"}`}>Still the draft&apos;s words — won&apos;t print until you make them yours in Words &amp; pictures.</p>}
      </div>
    </div>
  );
}
