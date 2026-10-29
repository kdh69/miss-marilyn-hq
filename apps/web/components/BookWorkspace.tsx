"use client";
import { useEffect, useState, useTransition } from "react";
import { savePageText } from "@/app/actions";
import { MessageBox } from "./MessageBox";
import { MessageItem } from "./Messages";

type Page = Record<string, string>;
const isHers = (p: Page) => !!p.text_final;
type Req = Record<string, string>;

/** Page grid + one open page: art, the draft, Clara's own words, notes. */
export function BookWorkspace({ productId, pages, requests, viewer }: { productId: string; pages: Page[]; requests: Req[]; viewer: "mom" | "kyle" | "family" | null }) {
  const canEdit = viewer === "mom" || viewer === "kyle";
  const [open, setOpen] = useState(pages[0]?.page_number ?? "");
  const page = pages.find((p) => p.page_number === open);
  const yours = pages.filter(isHers).length;

  if (!pages.length) {
    return <p className="text-sm text-[var(--quiet)]">No pages yet. They appear here as soon as the Story Producer writes the page plan.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="mb-3 text-xs text-[var(--quiet)]">{yours} of {pages.length} pages in your own words</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pages.map((p) => (
            <button key={p.page_id} onClick={() => setOpen(p.page_number)}
              className={`group overflow-hidden rounded-2xl border text-left transition ${open === p.page_number ? "border-orange-400 ring-2 ring-orange-300" : "border-white hover:border-orange-200"} bg-white/70`}>
              <Art id={p.art_id} brief={p.art_brief} />
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-[var(--quiet)]">
                  Page {p.page_number} {isHers(p) && <span className="ml-1 text-orange-600">· your words</span>}
                </p>
                <p className="mt-1 line-clamp-3 text-xs">{p.text || "—"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {page && (
        <aside className="glass flex flex-col gap-3 self-start rounded-3xl p-4 lg:sticky lg:top-6">
          <p className="text-sm font-semibold">Page {page.page_number}</p>
          <Art id={page.art_id} brief={page.art_brief} large />
          <PageText key={page.page_id} page={page} canEdit={canEdit} />
          {canEdit && <>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[var(--quiet)]">Note on this page</p>
              <MessageBox productId={productId} pageNumber={page.page_number} defaultKind="change" placeholder="e.g. Papa should look happier here" />
            </div>
            {requests.filter((r) => r.page_number === page.page_number).map((r) => <MessageItem key={r.request_id} r={r} viewer={viewer} />)}
          </>}
        </aside>
      )}
    </div>
  );
}

function Art({ id, brief, large = false }: { id: string; brief: string; large?: boolean }) {
  if (id) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/asset/${id}`} alt={brief} className={`aspect-square w-full object-cover ${large ? "rounded-2xl" : ""}`} />;
  }
  return (
    <div className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br from-orange-100 to-violet-100 p-3 text-center text-[11px] text-[var(--quiet)] ${large ? "rounded-2xl" : ""}`}>
      {brief ? `Art coming: ${brief}` : "Art coming"}
    </div>
  );
}

function PageText({ page, canEdit }: { page: Page; canEdit: boolean }) {
  const [text, setText] = useState(page.text_final || page.text_draft || "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => setText(page.text_final || page.text_draft || ""), [page.text_final, page.text_draft]);
  const dirty = text.trim() !== (page.text_final || "").trim();

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-[var(--quiet)]">
        {isHers(page) ? "Your words" : "Draft — rewrite it in your own words"}
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!canEdit} rows={4}
        className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-sm leading-relaxed outline-none focus:border-orange-400" />
      {isHers(page) && page.text_draft && (
        <details className="mt-1 text-xs text-[var(--quiet)]"><summary className="cursor-pointer">Original draft</summary><p className="mt-1">{page.text_draft}</p></details>
      )}
      <div className="mt-1 flex items-center justify-between text-xs text-[var(--quiet)]">
        <span>{msg || (canEdit ? "Saved words replace the draft in the book" : "View only")}</span>
        <button disabled={!canEdit || pending || !dirty || !text.trim()}
          onClick={() => start(async () => { const r = await savePageText(page.page_id, text); setMsg(r.ok ? "Saved ✓" : r.error ?? "Didn't save"); })}
          className="rounded-full bg-orange-500 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Save words</button>
      </div>
    </div>
  );
}
