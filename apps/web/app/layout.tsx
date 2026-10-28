import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { PreviewSwitch } from "@/components/PreviewSwitch";
import { authConfigured, me, signOut } from "@/auth";
import { SystemBanner } from "@/components/SystemBanner";
import { getSnapshot } from "@/lib/data";
import { viewerRole } from "@/lib/viewer";

async function UserChip({ viewer }: { viewer: "mom" | "kyle" | null }) {
  if (!authConfigured()) return <PreviewSwitch as={viewer === "kyle" ? "kyle" : "mom"} />;
  const who = await me();
  if (!who) return null;
  return (
    <form className="mt-6 hidden md:block" action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}>
      <p className="text-xs text-[var(--quiet)]">Signed in as {who.role === "mom" ? "Clara" : "Kyle"}</p>
      <button className="text-xs text-[var(--quiet)] underline">Sign out</button>
    </form>
  );
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Miss Marilyn HQ", description: "Clara's control panel" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, viewer] = await Promise.all([getSnapshot().catch(() => null), viewerRole()]);
  const halted = s?.config.find((c) => c.key === "system_status")?.value === "HALT";
  const open = (r: Record<string, string>) => r.to === viewer && !r.reply && !["done", "wont_do"].includes(r.status);
  const waiting = s ? s.mom_queue.filter((m) => !m.answer && !m.processed_at).length : 0;
  const forMe = s ? s.requests.filter(open).length : 0;
  const badges = { "/": viewer === "mom" ? waiting + forMe : forMe, "/messages": forMe };
  return (
    <html lang="en">
      <body>
        <div className="orbs" aria-hidden>
          <span style={{ width: 420, height: 420, left: -120, top: -120, background: "rgb(249 115 22 / 0.45)" }} />
          <span style={{ width: 460, height: 460, right: -140, bottom: -160, background: "rgb(139 92 246 / 0.4)" }} />
          <span style={{ width: 260, height: 260, right: "22%", top: -60, background: "rgb(249 115 22 / 0.28)" }} />
          <span style={{ width: 300, height: 300, left: "30%", bottom: -140, background: "rgb(139 92 246 / 0.22)" }} />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:flex-row md:p-6">
          <aside className="glass rounded-3xl p-4 md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-56 md:shrink-0">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-violet-500 text-sm font-bold text-white shadow-sm">M</span>
              <div>
                <p className="text-[15px] font-semibold leading-tight">Miss Marilyn</p>
                <p className="text-xs text-[var(--quiet)]">Control panel</p>
              </div>
            </div>
            <Nav badges={badges} />
            <UserChip viewer={viewer} />
          </aside>
          <main className="min-w-0 flex-1">
            <SystemBanner halted={halted} viewer={viewer} />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
