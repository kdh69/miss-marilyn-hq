"use client";
import { useState } from "react";
import { ViewToggle } from "./ViewToggle";

/** Phone header button: who's signed in, the Clara/Kyle switch (Kyle only), sign out. */
export function AccountSheet({ name, view, canSwitch, preview, signOut }: {
  name: string; view: "mom" | "kyle"; canSwitch: boolean; preview: boolean; signOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Account"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
        {name.slice(0, 1)}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:hidden" onClick={() => setOpen(false)}>
          <div className="glass w-full rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">{preview ? "Preview mode" : `Signed in as ${name}`}</p>
            {preview && <p className="text-sm text-[var(--quiet)]">Sign-in isn't set up yet, so nothing saves.</p>}
            {canSwitch && <ViewToggle view={view} />}
            {signOut && !preview && (
              <form action={signOut} className="mt-4">
                <button className="w-full rounded-full bg-black/5 px-4 py-3 text-sm font-semibold">Sign out</button>
              </form>
            )}
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-3 text-sm text-[var(--quiet)]">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
