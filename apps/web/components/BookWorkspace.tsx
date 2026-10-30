"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { savePageText } from "@/app/actions";
import { MessageBox } from "./MessageBox";
import { MessageItem } from "./Messages";
import { btn } from "./ui";

type Page = Record<string, string>;
type Req = Record<string, string>;
const isHers = (p: Page) => !!p.text_final;

/**
 * One page at a time: a strip of thumbnails to move between pages, the art large, her words
 * in big type, a save button that stays on screen. The AI draft sits under "Show the draft".
 */
export function BookWorkspace({ productId, pages, requests, viewer, canEdit, technical = false }: {
  productId: string; pages: Page[]; requests: Req[]; viewer: "mom" | "kyle" | null; canEdit: boolean; technical?: boolean;
}) {
  const [i, setI] = useState(0);
  const page = pages[i];
  const yours = pages.filter(isHers).length;
  const stripRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (d: number) => setI((x) => Math.min(pages.length - 1, Math.max(0, x + d)));

  // Keep the chosen thumbnail in view; arrow keys move between pages when not typing.
  useEffect(() => {
    stripRef.current?.children[i]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") setI((x) => Math.min(pages.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  if (!pages.length) {
    return <p className="text-[15px] text-[var(--quiet)]">No pages yet. They show up here as soon as the story writer has a page plan.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--quiet)]">{yours} of {pages.length} pages in your words<span className="hidden md:inline"> · ← → to turn pages</span></p>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-lg disabled:opacity-30">‹</button>
          <span className="min-w-[88px] text-center text-sm font-semibold">Page {page.page_number} of {pages.length}</span>
          <button onClick={() => go(1)} disabled={i === pages.length - 1} aria-label="Next page" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-lg disabled:opacity-30">›</button>
        </div>
      </div>

      {/* Page strip */}
      <div ref={stripRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
        {pages.map((p, k) => (
          <button key={p.page_id} onClick={() => setI(k)} aria-label={`Page ${p.page_number}`} aria-current={k === i}
            className={`relative w-[72px] shrink-0 overflow-hidden rounded-xl border-2 bg-white/70 transition ${k === i ? "border-orange-500" : "border-transparent"}`}>
            <Art id={p.art_id} brief="" small />
            <span className="block py-1 text-center text-[11px] font-semibold text-[var(--quiet)]">{p.page_number}</span>
            {isHers(p) && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" title="In your words" />}
          </button>
        ))}
      </div>

      {/* The page */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* Swipe the art left/right to change page on a phone. */}
        <div
          onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={(e) => {
            const t = touch.current; touch.current = null;
            if (!t) return;
            const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
          }}>
          <Art id={page.art_id} brief={page.art_brief} large />
          {technical && <p className="mt-2 text-xs text-[var(--quiet)]">{page.page_id} · art {page.art_asset_id || "—"} · {page.characters}</p>}
        </div>
        <PageText key={page.page_id} page={page} canEdit={canEdit} />
      </div>

      <details className="rounded-2xl bg-white/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Note on this page{requests.filter((r) => r.page_number === page.page_number).length ? ` · ${requests.filter((r) => r.page_number === page.page_number).length}` : ""}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <MessageBox productId={productId} pageNumber={page.page_number} defaultKind="change" kinds={["change", "note", "question"]} placeholder="e.g. Papa should look happier here" />
          {requests.filter((r) => r.page_number === page.page_number).map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} compact />)}
        </div>
      </details>
    </div>
  );
}

function Art({ id, brief, large = false, small = false }: { id: string; brief: string; large?: boolean; small?: boolean }) {
  if (id) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/asset/${id}`} alt={brief} className={`aspect-square w-full object-cover ${large ? "rounded-2xl" : ""}`} />;
  }
  return (
    <div className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br from-orange-100 to-violet-100 text-center text-[var(--quiet)] ${large ? "rounded-2xl p-4 text-sm" : "text-[10px]"}`}>
      {small ? "" : brief ? `Art is coming: ${brief}` : "Art is coming"}
    </div>
  );
}

/** Her words for the page. Saves on its own two seconds after she stops typing, or when she taps Save. */
function PageText({ page, canEdit }: { page: Page; canEdit: boolean }) {
  const [text, setText] = useState(page.text_final || page.text_draft || "");
  const [savedText, setSavedText] = useState(page.text_final || "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only her own edits count. The AI draft sitting in the box is never saved as her words on its own.
  const [touched, setTouched] = useState(false);
  const dirty = touched && text.trim() !== savedText.trim();
  const hers = !!savedText;
  // Latest values for the unmount flush (switching pages must never drop her words).
  const latest = useRef({ text, savedText, sending: "", touched });
  latest.current.text = text;
  latest.current.touched = touched;
  latest.current.savedText = savedText;

  const save = useCallback((value: string) => {
    if (!canEdit || !latest.current.touched || !value.trim() || value.trim() === savedText.trim() || value === latest.current.sending) return;
    latest.current.sending = value;
    setState("saving");
    start(async () => {
      const r = await savePageText(page.page_id, value).catch(() => ({ ok: false, error: "Couldn't reach the panel. Your words are still here — tap Save again in a minute." } as { ok: boolean; error?: string }));
      latest.current.sending = "";
      if (r.ok) { setSavedText(value); setState("saved"); }
      else { setErr(r.error ?? "Didn't save"); setState("error"); }
    });
  }, [canEdit, page.page_id, savedText]);

  // Leaving this page (another page, another tab): save what's typed.
  useEffect(() => () => {
    const { text: t, savedText: saved, sending, touched: edited } = latest.current;
    if (canEdit && edited && t.trim() && t.trim() !== saved.trim() && t !== sending) void savePageText(page.page_id, t);
  }, [canEdit, page.page_id]);

  // Closing the browser tab with unsaved words: ask first.
  useEffect(() => {
    if (!dirty || !canEdit) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, canEdit]);

  // Autosave after a pause in typing.
  useEffect(() => {
    if (!dirty || !canEdit) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(text), 2000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text, dirty, canEdit, save]);

  const status = state === "saving" ? "Saving…" : state === "error" ? err : dirty ? "Not saved yet" : hers ? "Saved · these are your words" : "Change anything and it saves as your words";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{hers ? "Your words" : "The draft — make it yours"}</p>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setTouched(true); }} onBlur={() => dirty && save(text)} disabled={!canEdit}
        rows={6} spellCheck
        className="w-full rounded-2xl border border-black/10 bg-white p-4 text-[17px] leading-relaxed outline-none focus:border-orange-400 disabled:opacity-70" />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm ${state === "error" ? "text-red-600" : "text-[var(--quiet)]"}`}>{canEdit ? status : "Preview only — sign in to write"}</span>
        <span className="hidden md:block"><button disabled={!canEdit || !dirty || !text.trim() || state === "saving"} onClick={() => save(text)} className={btn.primary}>Save</button></span>
      </div>
      {page.text_draft && (
        <details className="text-sm text-[var(--quiet)]">
          <summary className="cursor-pointer">Show the AI draft</summary>
          <p className="mt-2 rounded-xl bg-black/5 p-3 text-[15px] text-[var(--ink)]">{page.text_draft}</p>
          {canEdit && <button onClick={() => { setText(page.text_draft); setTouched(true); }} className="mt-2 min-h-9 underline">Use the draft</button>}
        </details>
      )}
      {/* Phone: the Save button rides above the tab bar while there's something to save. */}
      {canEdit && dirty && (
        <div className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 md:hidden">
          <button disabled={state === "saving"} onClick={() => save(text)} className={`${btn.primary} w-full shadow-lg`}>{state === "saving" ? "Saving…" : "Save my words"}</button>
        </div>
      )}
    </div>
  );
}
