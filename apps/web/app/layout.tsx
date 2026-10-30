import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SideNav, TabBar } from "@/components/Nav";
import { AccountSheet } from "@/components/AccountSheet";
import { ViewToggle } from "@/components/ViewToggle";
import { authConfigured, signOut, viewer } from "@/auth";
import { SystemBanner } from "@/components/SystemBanner";
import { getSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Miss Marilyn HQ", description: "Clara's control panel" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, v] = await Promise.all([getSnapshot().catch(() => null), viewer()]);
  const halted = s?.config.find((c) => c.key === "system_status")?.value === "HALT";
  const preview = !authConfigured();
  const name = v.real === "kyle" ? "Kyle" : v.real === "mom" ? "Clara" : v.view === "kyle" ? "Kyle" : "Clara";
  const doSignOut = async () => { "use server"; await signOut({ redirectTo: "/signin" }); };

  return (
    <html lang="en">
      <body>
        <div className="orbs" aria-hidden>
          <span style={{ width: 420, height: 420, left: -120, top: -120, background: "rgb(249 115 22 / 0.45)" }} />
          <span style={{ width: 460, height: 460, right: -140, bottom: -160, background: "rgb(139 92 246 / 0.4)" }} />
          <span style={{ width: 260, height: 260, right: "22%", top: -60, background: "rgb(249 115 22 / 0.28)" }} />
          <span style={{ width: 300, height: 300, left: "30%", bottom: -140, background: "rgb(139 92 246 / 0.22)" }} />
        </div>

        {/* Phone header */}
        <header className="glass topbar sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 md:hidden">
          <div>
            <p className="text-[15px] font-semibold leading-tight">Miss Marilyn</p>
            <p className="text-[11px] text-[var(--quiet)]">{v.view === "mom" ? "Clara's HQ" : "Kyle's HQ"}</p>
          </div>
          <AccountSheet name={name} view={v.view} canSwitch={v.canSwitch} preview={preview} signOut={preview ? undefined : doSignOut} />
        </header>

        <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:gap-6 md:p-6">
          {/* Desktop sidebar */}
          <aside className="glass hidden rounded-3xl p-4 md:sticky md:top-6 md:flex md:h-[calc(100vh-3rem)] md:w-60 md:shrink-0 md:flex-col">
            <p className="text-[15px] font-semibold">Miss Marilyn</p>
            <p className="mb-4 text-xs text-[var(--quiet)]">{v.view === "mom" ? "Clara's HQ" : "Kyle's HQ"}</p>
            <SideNav view={v.view} />
            <div className="mt-auto">
              {preview ? <p className="text-xs text-[var(--quiet)]">Preview mode — sign-in not set up, nothing saves.</p>
                : <form action={doSignOut}><p className="text-xs text-[var(--quiet)]">Signed in as {name}</p><button className="text-xs text-[var(--quiet)] underline">Sign out</button></form>}
              {v.canSwitch && <ViewToggle view={v.view} />}
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:p-0">
            <SystemBanner halted={halted} viewer={v.view} />
            {children}
          </main>
        </div>
        <TabBar view={v.view} />
      </body>
    </html>
  );
}
