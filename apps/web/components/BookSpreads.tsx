"use client";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { approvePage, savePageText, sendMessage } from "@/app/actions";
import { bookMoments, teamSuggestion, type Moment } from "@/lib/spreads";
import { Art } from "./BookWorkspace";
import { AllText } from "./ScriptTabs";
import { btn } from "./ui";

type Page = Record<string, string>;
const words = (p: Page) => (p.text_final || p.text_draft || "").trim();

/** The page of a moment whose words print: a two-page picture has its words on one page only. */
const wordPage = (m: Moment) => m.pages.find((p) => words(p)) ?? m.pages[0];

/**
 * Go through the book one page at a time, laid out like the open book: the words on the left,
 * the picture on the right (on a phone, the picture on top). The words can be changed right on
 * the page. Two buttons: "Looks good" (the words become hers, the picture is approved) and
 * "Something's wrong" (one box to say what). Either one turns to the next page.
 */
export function BookSpreads({ productId, pages, approved, canWrite, rewriteSince = "" }: {
  productId: string; pages: Page[]; approved: Record<string, string>; canWrite: boolean;
  /** When the open story rewrite started; its new drafts are offered on pages that are already hers. */
  rewriteSince?: string;
}) {
  const router = useRouter();
  const moments = useMemo(() => bookMoments(pages), [pages]);
  // What she's already been through: words are hers (or there are none) and the picture is approved (or not drawn yet).
  const isChecked = (m: Moment, ok: Record<string, boolean>) => {
    const w = wordPage(m);
    const wordsOk = !words(w) || !!w.text_final;
    const pics = m.pages.filter((p) => p.art_id);
    return wordsOk && pics.length > 0 && pics.every((p) => ok[p.page_number]);
  };
  const [ok, setOk] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.keys(approved).map((k) => [k, true])));
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(moments.map((m) => [m.key, isChecked(m, ok)])));
  const [i, setI] = useState(() => Math.max(0, moments.findIndex((m) => !isChecked(m, ok))));
  const [allWords, setAllWords] = useState(false);
  const m = moments[i];
  const done = moments.filter((x) => checked[x.key]).length;
  const go = (d: number) => { setI((x) => Math.min(moments.length - 1, Math.max(0, x + d))); window.scrollTo({ top: 0, behavior: "smooth" }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!m) return null;
  const last = i === moments.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Where she is in the book. */}
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-2xl disabled:opacity-30">‹</button>
          <div className="text-center">
            <p className="text-lg font-semibold">{m.spread ? `Pages ${m.pages[0].page_number}–${m.pages[1].page_number}` : `Page ${m.pages[0].page_number}`}</p>
            <p className="text-sm text-[var(--quiet)]">{done} of {moments.length} checked</p>
          </div>
          <button onClick={() => go(1)} disabled={last} aria-label="Next page" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-2xl disabled:opacity-30">›</button>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {moments.map((x, k) => (
            <button key={x.key} tabIndex={-1} onClick={() => setI(k)} className={`h-2 flex-1 rounded-full transition ${k === i ? "bg-orange-500" : checked[x.key] ? "bg-emerald-500" : "bg-black/10"}`} />
          ))}
        </div>
      </div>

      <OnePage key={m.key} productId={productId} m={m} canWrite={canWrite} checked={!!checked[m.key]} rewriteSince={rewriteSince} approvedPics={ok}
        onDone={(approvedPages) => {
          setOk((o) => ({ ...o, ...Object.fromEntries(approvedPages.map((n) => [n, true])) }));
          setChecked((c) => ({ ...c, [m.key]: true }));
          router.refresh();
          if (!last) go(1);
        }}
        onSent={() => { router.refresh(); if (!last) go(1); }} />

      {done === moments.length && (
        <p className="rounded-2xl bg-emerald-500/10 p-4 text-center text-[15px] font-semibold text-emerald-900">You&apos;ve checked every page. Approve the words at the bottom when you&apos;re ready.</p>
      )}

      <div className="text-center">
        <button onClick={() => setAllWords((x) => !x)} className="min-h-11 text-sm text-[var(--quiet)] underline">{allWords ? "Hide" : "See"} all the words in one box</button>
      </div>
      {allWords && <AllText pages={pages} canWrite={canWrite} />}
    </div>
  );
}

function OnePage({ productId, m, canWrite, checked, rewriteSince, approvedPics, onDone, onSent }: {
  productId: string; m: Moment; canWrite: boolean; checked: boolean; rewriteSince: string; approvedPics: Record<string, boolean>; onDone: (approvedPages: string[]) => void; onSent: () => void;
}) {
  const page = wordPage(m);
  const [text, setText] = useState(words(page));
  const [saved, setSaved] = useState(page.text_final || "");
  const [msg, setMsg] = useState("");
  const [asking, setAsking] = useState(false);
  const [what, setWhat] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const changed = text.trim() !== (saved || words(page)).trim();
  // The team rewrote this page after she made it hers: she chooses, nothing is swapped in on its own.
  // Until she chooses, "Looks good" would keep old lines that may now also be on the next page.
  const suggestion = teamSuggestion(page, rewriteSince);
  const choosing = !!suggestion && text.trim() !== suggestion && text.trim() === (page.text_final || "").trim();
  const where = m.spread ?`pages ${m.pages[0].page_number}–${m.pages[1].page_number}` : `page ${page.page_number}`;

  // The box grows with the words, like a page, instead of scrolling.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  // Her typing saves on its own after a pause.
  useEffect(() => {
    if (!canWrite || !text.trim() || text.trim() === saved.trim() || !changed) return;
    const t = setTimeout(() => {
      start(async () => {
        const r = await savePageText(page.page_id, text).catch(() => ({ ok: false, error: "" }));
        if (r.ok) { setSaved(text); setMsg("Saved"); } else setMsg("Didn't save — tap Looks good to try again");
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [text, saved, changed, canWrite, page.page_id]);

  const looksGood = (value = text) => start(async () => {
    setMsg("");
    // Her words: whatever is on the page now becomes hers.
    if (value.trim() && value.trim() !== saved.trim()) {
      const r = await savePageText(page.page_id, value).catch(() => ({ ok: false, error: "" }));
      if (!r.ok) { setMsg("Couldn't save — check the connection and tap again"); return; }
      setSaved(value);
    }
    // Pictures: approve each drawn half once; an approval already on file isn't written again.
    const drawn = m.pages.filter((p) => p.art_id).map((p) => p.page_number);
    for (const n of drawn.filter((n) => !approvedPics[n])) {
      const r = await approvePage(productId, n, "picture").catch(() => ({ ok: false, error: "" }));
      if (!r.ok) { setMsg("Couldn't save — check the connection and tap again"); return; }
    }
    onDone(drawn);
  });

  const send = () => start(async () => {
    const r = await sendMessage({ kind: "change", productId, pageNumber: m.pages[0].page_number, body: `Change for ${where}: ${what.trim()}` }).catch(() => ({ ok: false, error: "" }));
    if (r.ok) { setWhat(""); setAsking(false); onSent(); } else setMsg("Couldn't send — check the connection and tap again");
  });

  return (
    <div className="flex flex-col gap-4">
      {/* The open book: words on the left page, the picture on the right. */}
      <div className={`overflow-hidden rounded-[22px] bg-[#FBF3E4] shadow-[0_14px_40px_-18px_rgb(0_0_0/0.5)] ring-1 ring-black/5 md:grid ${m.spread ? "md:grid-cols-[2fr_3fr]" : "md:grid-cols-2"}`}>
        <div className="relative order-2 flex flex-col justify-center p-5 md:order-1 md:p-8">
          <textarea ref={box} value={text} onChange={(e) => { setText(e.target.value); setMsg(""); }} disabled={!canWrite} rows={3} spellCheck
            aria-label={`The words on ${where}`} placeholder={canWrite ? "No words on this page. Tap here to add some." : "No words on this page."}
            className="w-full resize-none overflow-hidden rounded-xl border-2 border-dashed border-transparent bg-transparent p-2 font-serif text-[20px] leading-relaxed text-[var(--ink)] outline-none transition placeholder:text-base placeholder:italic hover:border-black/10 focus:border-orange-300 focus:bg-white/60 disabled:opacity-100" />
          {canWrite && <p className="mt-1 px-2 text-xs text-[var(--quiet)]">{pending ? "Saving…" : msg || "Tap the words to change them."}</p>}
          {choosing && (
            <div className="mt-3 rounded-2xl bg-white/80 p-3 ring-2 ring-violet-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">New words from the team</p>
              <p className="mt-1 whitespace-pre-line font-serif text-[17px] leading-relaxed">{suggestion}</p>
              <p className="mt-2 text-xs text-[var(--quiet)]">They rewrote this page from your notes. Pick one below.</p>
            </div>
          )}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-8 bg-gradient-to-l from-black/[0.07] to-transparent md:block" />
        </div>
        <div className="relative order-1 flex items-center md:order-2">
          {m.spread
            ? <div className="grid w-full grid-cols-2">{m.pages.map((p) => <Art key={p.page_id} id={p.art_id} brief="" />)}</div>
            : <div className="w-full"><Art id={m.pages[0].art_id} brief="" /></div>}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-r from-black/[0.08] to-transparent md:block" />
        </div>
      </div>

      {canWrite && !asking && choosing && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button disabled={pending} onClick={() => { setText(suggestion); looksGood(suggestion); }} className="min-h-14 rounded-2xl bg-emerald-600 px-5 text-[17px] font-semibold text-white shadow-sm disabled:opacity-50">
            ✓ Use the new words
          </button>
          <button disabled={pending} onClick={() => looksGood()} className="min-h-14 rounded-2xl bg-white px-5 text-[17px] font-semibold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-50">
            Keep my words
          </button>
          <button disabled={pending} onClick={() => setAsking(true)} className="min-h-11 text-sm text-[var(--quiet)] underline sm:col-span-2">Something&apos;s wrong</button>
        </div>
      )}
      {canWrite && !asking && !choosing && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button disabled={pending} onClick={() => looksGood()} className="min-h-14 rounded-2xl bg-emerald-600 px-5 text-[17px] font-semibold text-white shadow-sm disabled:opacity-50">
            {checked && !changed ? "✓ Looks good — next page" : "✓ Looks good"}
          </button>
          <button disabled={pending} onClick={() => setAsking(true)} className="min-h-14 rounded-2xl bg-white px-5 text-[17px] font-semibold text-[var(--ink)] shadow-sm ring-1 ring-black/10 disabled:opacity-50">
            Something&apos;s wrong
          </button>
        </div>
      )}
      {asking && (
        <div className="glass flex flex-col gap-3 rounded-3xl p-4">
          <label className="text-[15px] font-semibold" htmlFor={`what-${m.key}`}>What should change on {where}?</label>
          <textarea id={`what-${m.key}`} value={what} onChange={(e) => setWhat(e.target.value)} rows={3} autoFocus
            placeholder="Anything — the words, the picture, who's in it…" className="w-full rounded-xl border border-black/10 bg-white p-3 text-[16px] outline-none focus:border-orange-400" />
          <div className="flex flex-wrap gap-2">
            <button disabled={pending || !what.trim()} onClick={send} className={btn.primary}>Send to the team</button>
            <button onClick={() => setAsking(false)} className={btn.quiet}>Cancel</button>
          </div>
        </div>
      )}
      {msg && !canWrite && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
