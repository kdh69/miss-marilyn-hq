import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SideNav, TabBar } from "@/components/Nav";
import { AccountSheet } from "@/components/AccountSheet";
import { ViewToggle } from "@/components/ViewToggle";
import { authConfigured, me, signOut } from "@/auth";
import { viewer } from "@/lib/viewer";
import { familySignOut } from "@/app/actions";
import { SystemBanner } from "@/components/SystemBanner";
import { getSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Miss Marilyn HQ",
  description: "Clara's control panel",
  appleWebApp: { capable: true, title: "Miss Marilyn", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f97316" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, v, who] = await Promise.all([getSnapshot().catch(() => null), viewer(), me()]);
  const halted = s?.config.find((c) => c.key === "system_status")?.value === "HALT";
  const preview = !authConfigured();
  const name = preview ? (v.view === "kyle" ? "Kyle" : "Clara") : who?.name || who?.email || "";
  const family = who?.role === "family";
  // Family-password visitors sign out by dropping their cookie; Google sign-ins through Auth.js.
  const doSignOut = family && !who?.email ? familySignOut : async () => { "use server"; await signOut({ redirectTo: "/signin" }); };
  const toggleView = v.view === "kyle" ? "kyle" : "mom";
  const hq = v.view === "kyle" ? "Kyle's HQ" : v.view === "family" ? "Family view" : "Clara's HQ";
  const signedOut = !preview && !who; // only the sign-in page renders without a session

  return (
    <html lang="en">
      <body>
        <div className="orbs" aria-hidden>
          <span style={{ width: 420, height: 420, left: -120, top: -120, background: "rgb(249 115 22 / 0.45)" }} />
          <span style={{ width: 460, height: 460, right: -140, bottom: -160, background: "rgb(139 92 246 / 0.4)" }} />
          <span style={{ width: 260, height: 260, right: "22%", top: -60, background: "rgb(249 115 22 / 0.28)" }} />
          <span style={{ width: 300, height: 300, left: "30%", bottom: -140, background: "rgb(139 92 246 / 0.22)" }} />
        </div>

        {signedOut ? <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main> : <>
        {/* Phone header */}
        <header className="glass topbar sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 md:hidden">
          <div>
            <p className="text-[15px] font-semibold leading-tight">Miss Marilyn</p>
            <p className="text-[11px] text-[var(--quiet)]">{hq}</p>
          </div>
          <AccountSheet name={name} view={toggleView} canSwitch={v.canSwitch} preview={preview} family={family} signOut={preview ? undefined : doSignOut} />
        </header>

        <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:gap-6 md:p-6">
          {/* Desktop sidebar */}
          <aside className="glass hidden rounded-3xl p-4 md:sticky md:top-6 md:flex md:h-[calc(100vh-3rem)] md:w-60 md:shrink-0 md:flex-col">
            <p className="text-[15px] font-semibold">Miss Marilyn</p>
            <p className="mb-4 text-xs text-[var(--quiet)]">{hq}</p>
            <SideNav view={v.view} />
            <div className="mt-auto">
              {preview ? <p className="text-xs text-[var(--quiet)]">Preview mode — sign-in not set up, nothing saves.</p>
                : <form action={doSignOut}><p className="text-xs text-[var(--quiet)]">Signed in as {name}{family ? " (view only)" : ""}</p><button className="text-xs text-[var(--quiet)] underline">Sign out</button></form>}
              {v.canSwitch && <ViewToggle view={toggleView} />}
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:p-0">
            <SystemBanner halted={halted} viewer={v.view} />
            {children}
          </main>
        </div>
        <TabBar view={v.view} />
        </>}
      </body>
    </html>
  );
}
