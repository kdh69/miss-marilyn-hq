"use client";
import { useState, useTransition } from "react";
import { addCanon, saveCanon } from "@/app/actions";
import { btn, Pill } from "@/components/ui";
import { CANON_KIND_ONE as KIND_ONE } from "@/lib/labels";

export type CanonView = {
  id: string; kind: string; name: string; look: string; notes: string; referenceIds: string;
  scope: string; retired: boolean; updated: string;
  pictures: { id: string; src: string }[];
};

const field = "w-full rounded-xl border border-black/10 bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-orange-400";

/** One entry of Miss M's Bible: how a character, place or thing always looks. Clara can edit it. */
export function CanonEntry({ c, canEdit }: { c: CanonView; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [look, setLook] = useState(c.look);
  const [notes, setNotes] = useState(c.notes);
  const [refs, setRefs] = useState(c.referenceIds);
  const [retired, setRetired] = useState(c.retired);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    setMsg("");
    const r = await saveCanon(c.id, { name, look, notes, referenceIds: refs, retired });
    if (r.ok) { setEditing(false); setMsg("Saved. The team uses it from their next run."); } else setMsg(r.error ?? "Didn't save");
  });
  const cancel = () => { setName(c.name); setLook(c.look); setNotes(c.notes); setRefs(c.referenceIds); setRetired(c.retired); setEditing(false); setMsg(""); };

  return (
    <article className={`flex flex-col gap-3 py-4 sm:flex-row ${c.retired ? "opacity-60" : ""}`}>
      {c.pictures.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5 sm:w-52">
          <a href={c.pictures[0].src} target="_blank" rel="noreferrer" className="block w-full overflow-hidden rounded-xl bg-[#FBF3E4] sm:w-52" title={c.pictures[0].id}>
            <img src={c.pictures[0].src} alt={`${c.name}: reference picture ${c.pictures[0].id}`} loading="lazy" className="aspect-[4/3] w-full object-contain" />
          </a>
          {c.pictures.length > 1 && (
            <p className="flex flex-wrap gap-x-2 text-xs text-[var(--quiet)]">
              Also:{c.pictures.slice(1).map((p) => <a key={p.id} href={p.src} target="_blank" rel="noreferrer" className="text-violet-600 underline">{p.id}</a>)}
            </p>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {editing ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" className={`${field} font-semibold`} />
            <label className="text-xs font-semibold text-[var(--quiet)]">How it always looks
              <textarea value={look} onChange={(e) => setLook(e.target.value)} rows={5} spellCheck className={`${field} mt-1 font-normal text-[var(--ink)]`} />
            </label>
            <label className="text-xs font-semibold text-[var(--quiet)]">Notes (real-life details, why)
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} spellCheck className={`${field} mt-1 font-normal text-[var(--ink)]`} />
            </label>
            <label className="text-xs font-semibold text-[var(--quiet)]">Reference pictures (IDs, e.g. A-T0025-40)
              <input value={refs} onChange={(e) => setRefs(e.target.value)} className={`${field} mt-1 font-normal text-[var(--ink)]`} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={retired} onChange={(e) => setRetired(e.target.checked)} className="h-4 w-4" />
              Not used any more
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={save} disabled={pending} className={btn.small}>{pending ? "Saving…" : "Save"}</button>
              <button onClick={cancel} disabled={pending} className="text-sm text-[var(--quiet)] underline">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold">{c.name}</h3>
              <Pill tone={c.scope === "Whole series" ? "accent-2" : "quiet"}>{c.scope}</Pill>
              {c.retired && <Pill>Not used any more</Pill>}
            </div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{c.look}</p>
            {c.notes && <p className="whitespace-pre-line text-sm text-[var(--quiet)]">{c.notes}</p>}
            <p className="text-xs text-[var(--quiet)]">{c.id}{c.updated ? ` · ${c.updated}` : ""}</p>
            {canEdit && <button onClick={() => setEditing(true)} className="self-start text-sm font-semibold text-orange-600 underline">Edit</button>}
          </>
        )}
        {msg && <p className={`text-sm ${msg.startsWith("Saved") ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>}
      </div>
    </article>
  );
}

/** Add something new to the bible: a new character, place, thing, moment or rule about the look. */
export function AddCanon({ books }: { books: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("character");
  const [name, setName] = useState("");
  const [look, setLook] = useState("");
  const [notes, setNotes] = useState("");
  const [appliesTo, setAppliesTo] = useState("series");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const add = () => start(async () => {
    setMsg("");
    const r = await addCanon({ kind, name, look, notes, appliesTo });
    if (r.ok) { setName(""); setLook(""); setNotes(""); setOpen(false); setMsg("Added. The team uses it from their next run."); } else setMsg(r.error ?? "Didn't save");
  });

  if (!open) return (
    <div className="flex flex-col gap-1">
      <button onClick={() => { setOpen(true); setMsg(""); }} className={btn.secondary}>Add to the bible</button>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="What kind" className="min-h-10 rounded-full border border-black/10 bg-white px-3 text-sm">
          {Object.keys(KIND_ONE).map((k) => <option key={k} value={k}>{KIND_ONE[k]}</option>)}
        </select>
        <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} aria-label="Which books" className="min-h-10 rounded-full border border-black/10 bg-white px-3 text-sm">
          <option value="series">Every book</option>
          {books.map((b) => <option key={b.id} value={b.id}>Only {b.title}</option>)}
        </select>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Nonna's kitchen" aria-label="Name" className={field} />
      <textarea value={look} onChange={(e) => setLook(e.target.value)} rows={4} spellCheck placeholder="How it always looks: colours, shapes, what's always there" aria-label="How it always looks" className={field} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} spellCheck placeholder="Notes (optional): a real-life detail, or why" aria-label="Notes" className={field} />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={add} disabled={pending} className={btn.small}>{pending ? "Adding…" : "Add"}</button>
        <button onClick={() => setOpen(false)} disabled={pending} className="text-sm text-[var(--quiet)] underline">Cancel</button>
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
