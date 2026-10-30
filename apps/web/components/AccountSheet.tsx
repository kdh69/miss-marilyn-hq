"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ViewToggle } from "./ViewToggle";

/** Phone header button: who's signed in, the Clara/Kyle switch (Kyle only), sign out. */
export function AccountSheet({ name, view, canSwitch, preview, signOut }: {
  name: string; view: "mom" | "kyle"; canSwitch: boolean; preview: boolean; signOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Account"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
        {name.slice(0, 1)}
      </button>
      {/* Portal to <body> so the sheet sits above the tab bar, not inside the header's layer. */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Account" className="w-full rounded-t-3xl bg-white p-5 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">{preview ? `Preview of ${name}'s view` : `Signed in as ${name}`}</p>
            {preview && <p className="text-sm text-[var(--quiet)]">Sign-in isn't set up yet, so nothing saves.</p>}
            {canSwitch && <ViewToggle view={view} />}
            {signOut && !preview && (
              <form action={signOut} className="mt-4">
                <button className="w-full rounded-full bg-black/5 px-4 py-3 text-sm font-semibold">Sign out</button>
              </form>
            )}
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-3 text-sm text-[var(--quiet)]">Close</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
