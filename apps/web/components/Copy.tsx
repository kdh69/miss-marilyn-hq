"use client";
import { useState } from "react";

/** Puts text on the clipboard; falls back to a hidden textarea where the Clipboard API isn't allowed. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"" | "done" | "fail">("");
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async () => { setState((await copy(text)) ? "done" : "fail"); setTimeout(() => setState(""), 1800); }}
      className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold transition ${state === "done" ? "bg-emerald-500/15 text-emerald-700" : "bg-orange-500/15 text-orange-700"} ${className}`}
    >
      {state === "done" ? "Copied ✓" : state === "fail" ? "Press and hold to copy" : label}
    </button>
  );
}

/**
 * One store field: its label, what to paste, and a Copy button. `lines` fields (keywords, tags,
 * categories, details) get a Copy per line, since the store wants each in its own box.
 */
export function CopyField({ label, value, lines = false, hint }: { label: string; value: string; lines?: boolean; hint?: string }) {
  if (!value?.trim()) return null;
  const items = lines ? value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
  return (
    <div className="border-t border-black/5 py-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiet)]">{label}{lines && ` · ${items.length}`}</p>
        <CopyButton text={lines ? items.join("\n") : value} label={lines ? "Copy all" : "Copy"} />
      </div>
      {hint && <p className="mt-0.5 text-xs text-[var(--quiet)]">{hint}</p>}
      {lines ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((l, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-1.5">
              <span className="min-w-0 break-words text-[15px]">{l}</span>
              <CopyButton text={l.includes(": ") && /^[A-Z][\w ()'/-]{1,40}: /.test(l) ? l.slice(l.indexOf(": ") + 2) : l} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{value}</p>
      )}
    </div>
  );
}
