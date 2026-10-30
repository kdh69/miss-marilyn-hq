"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { savePageText, sendMessage } from "@/app/actions";
import { PageText } from "./BookWorkspace";
import { btn } from "./ui";

type Page = Record<string, string>;
const PIC = "Picture idea for page";

/**
 * The Script step's two views. "Page by page": each page with its picture plan, her words (folding
 * to a thin Approved line once saved) and a place to suggest the picture. "All text": the whole
 * script in one box, split by "Page N" lines; saving sends each changed page back to its row.
 */
export function ScriptTabs({ productId, pages, notes, canWrite }: { productId: string; pages: Page[]; notes: Page[]; canWrite: boolean }) {
  const [tab, setTab] = useState<"pages" | "all">("pages");
  const tabBtn = (id: "pages" | "all", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`min-h-10 flex-1 rounded-full px-4 text-sm transition ${tab === id ? "bg-white font-semibold shadow-sm" : "text-[var(--quiet)]"}`}>{label}</button>
  );
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-1 rounded-full bg-black/5 p-1 md:max-w-sm">{tabBtn("pages", "Page by page")}{tabBtn("all", "All text")}</div>
      {tab === "pages" ? (
        <ol className="flex flex-col gap-3">
          {pages.map((p) => (
            <li key={p.page_id} className="glass rounded-3xl p-4 md:p-5">
              <p className="mb-2 text-sm font-semibold">Page {p.page_number}</p>
              <PicturePlan productId={productId} page={p} ideas={notes.filter((n) => n.page_number === p.page_number && n.body.startsWith(PIC))} canWrite={canWrite} />
              <PageText key={`${p.page_id}:${p.text_final}`} page={p} canEdit={canWrite} compact />
            </li>
          ))}
        </ol>
      ) : <AllText pages={pages} canWrite={canWrite} />}
    </div>
  );
}

/** What the picture on this page will show, her suggestions so far, and a box to suggest one. */
function PicturePlan({ productId, page, ideas, canWrite }: { productId: string; page: Page; ideas: Page[]; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const body = `${PIC} ${page.page_number}: ${idea.trim()}`;
    const r = await sendMessage({ kind: "change", productId, pageNumber: page.page_number, body }).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again in a minute." }));
    if (r.ok) { setSent((x) => [...x, idea.trim()]); setIdea(""); setOpen(false); setMsg("Sent to the artist ✓"); }
    else setMsg(r.error ?? "Didn't send");
  });
  const mine = [...ideas.map((n) => n.body.replace(/^Picture idea for page \d+:\s*/, "")), ...sent];

  return (
    <div className="mb-3 rounded-2xl bg-violet-500/[0.06] px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <span aria-hidden>🖼️</span>
        <p className="min-w-0 flex-1"><span className="font-semibold">Picture:</span> {page.art_brief || <span className="text-[var(--quiet)]">not planned yet</span>}</p>
        {canWrite && !open && <button onClick={() => setOpen(true)} className="shrink-0 text-violet-700 underline">Suggest the picture</button>}
      </div>
      {mine.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 pl-6">
          {mine.map((m, k) => <li key={k} className="text-violet-800">Your idea: {m}</li>)}
        </ul>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={idea} onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && idea.trim() && !pending) send(); }}
            placeholder="e.g. Ollie hugging the shell, Mama smiling behind him" autoFocus
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-[15px] outline-none focus:border-violet-400" />
          <div className="flex gap-2">
            <button disabled={pending || !idea.trim()} onClick={send} className={btn.small}>Send</button>
            <button onClick={() => setOpen(false)} className="min-h-9 px-2 text-[var(--quiet)]">Cancel</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-1 pl-6 text-xs text-[var(--quiet)]">{msg}</p>}
    </div>
  );
}

const PAGE_LINE = /^\s*page\s+(\d+)\s*:?\s*$/i;
const toDoc = (pages: Page[]) => pages.map((p) => `Page ${p.page_number}\n${p.text_final || p.text_draft || ""}`).join("\n\n");

/** Split the big box back into pages. Null if the "Page N" lines don't match the book's pages. */
function parse(doc: string, pages: Page[]): Map<string, string> | null {
  const out = new Map<string, string>();
  let cur: string | null = null;
  const buf: string[] = [];
  const flush = () => { if (cur !== null) out.set(cur, buf.join("\n").trim()); buf.length = 0; };
  for (const line of doc.split("\n")) {
    const m = line.match(PAGE_LINE);
    if (m) { flush(); cur = m[1]; } else if (cur !== null) buf.push(line);
  }
  flush();
  const want = pages.map((p) => p.page_number).sort().join(",");
  return [...out.keys()].sort().join(",") === want ? out : null;
}

/** The whole script in one box. Only pages she changed are saved; untouched draft pages stay drafts. */
function AllText({ pages, canWrite }: { pages: Page[]; canWrite: boolean }) {
  const router = useRouter();
  const start0 = useMemo(() => toDoc(pages), [pages]);
  const [doc, setDoc] = useState(start0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const dirty = doc !== start0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () => start(async () => {
    const parsed = parse(doc, pages);
    if (!parsed) { setMsg("Keep one \"Page 1\", \"Page 2\"… line for every page, so each part goes back to the right page."); return; }
    const changed = pages.filter((p) => {
      const now = parsed.get(p.page_number) ?? "";
      const before = p.text_final || p.text_draft || "";
      return now && now.trim() !== before.trim();
    });
    if (!changed.length) { setMsg("Nothing changed."); return; }
    let ok = 0; const errors: string[] = [];
    for (const p of changed) {
      const r = await savePageText(p.page_id, parsed.get(p.page_number)!).catch(() => ({ ok: false, error: "Couldn't reach the panel" }));
      if (r.ok) ok++; else errors.push(`page ${p.page_number}: ${r.error ?? "didn't save"}`);
    }
    setMsg(errors.length ? `Saved ${ok}. Not saved — ${errors.join("; ")}. Your words are still in the box.` : `Saved ${ok} page${ok > 1 ? "s" : ""} ✓`);
    if (!errors.length) router.refresh();
  });

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4 md:p-5">
      <p className="text-sm text-[var(--quiet)]">The whole script in one place. Keep the &quot;Page 1&quot;, &quot;Page 2&quot;… lines; write everything else your way.</p>
      <textarea value={doc} onChange={(e) => setDoc(e.target.value)} disabled={!canWrite} spellCheck aria-label="The whole script"
        className="min-h-[70vh] w-full rounded-2xl border border-black/10 bg-white p-4 font-serif text-[17px] leading-relaxed outline-none focus:border-orange-400 disabled:opacity-70" />
      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 rounded-2xl bg-white/90 p-2 backdrop-blur md:bottom-4">
        <span className="text-sm text-[var(--quiet)]">{msg || (canWrite ? (dirty ? "Not saved yet" : "All saved") : "View only")}</span>
        <button disabled={!canWrite || pending || !dirty} onClick={save} className={btn.primary}>{pending ? "Saving…" : "Save the script"}</button>
      </div>
    </div>
  );
}
