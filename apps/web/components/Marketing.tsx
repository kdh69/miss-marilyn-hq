"use client";
import { useState, useTransition } from "react";
import { askMarketing, markDone } from "@/app/actions";
import { btn } from "./ui";

/**
 * "Posted" (Social) or "It's live" (Launch): an optional link to the post, a required one for a
 * store listing. Once marked it shows ✓ with the link.
 */
export function MarkDone({ what, id, productId, doneLink, done = false, canWrite }: {
  what: "Posted" | "Live"; id: string; productId: string; doneLink?: string; done?: boolean; canWrite: boolean;
}) {
  const [link, setLink] = useState("");
  const [state, setState] = useState<{ ok?: boolean; error?: string }>({});
  const [pending, start] = useTransition();
  const label = what === "Live" ? "It's live" : "Posted";

  if (done || state.ok) {
    const url = state.ok ? link.trim() : doneLink;
    return (
      <p className="text-sm font-semibold text-emerald-700">
        ✓ {what === "Live" ? "Live" : "Posted"}{url && <> · <a href={url} target="_blank" className="font-normal text-violet-600 underline">open it</a></>}
      </p>
    );
  }
  if (!canWrite) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={link} onChange={(e) => setLink(e.target.value)} inputMode="url"
          placeholder={what === "Live" ? "Paste the store link" : "Paste the post's link (optional)"}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 text-[15px] outline-none focus:border-orange-400"
        />
        <button disabled={pending || (what === "Live" && !link.trim())} className={btn.primary}
          onClick={() => start(async () => setState(await markDone(what, id, productId, link).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again." }))))}>
          {label}
        </button>
      </div>
      {state.error && <p className="text-sm text-orange-700">{state.error}</p>}
    </div>
  );
}

/** Ask the team for a marketing plan or the next week of posts (the backend also asks on its own). */
export function AskTeam({ productId, what, label, canWrite }: { productId: string; what: "plan" | "posts"; label: string; canWrite: boolean }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (!canWrite) return null;
  return msg ? <p className="text-sm text-[var(--quiet)]">{msg}</p> : (
    <button disabled={pending} className={btn.secondary}
      onClick={() => start(async () => {
        const r = await askMarketing(productId, what).catch(() => ({ ok: false, error: "Couldn't reach the panel — try again.", note: "" }));
        setMsg(r.ok ? r.note ?? "Asked." : r.error ?? "Didn't send — try again.");
      })}>
      {label}
    </button>
  );
}
