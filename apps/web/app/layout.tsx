import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { authConfigured, me, signOut } from "@/auth";

async function UserChip() {
  if (!authConfigured()) return <p className="mt-6 hidden text-xs text-[var(--quiet)] md:block">Preview mode — sign-in not set up, editing off.</p>;
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
            <p className="text-[15px] font-semibold">Miss Marilyn</p>
            <p className="mb-4 text-xs text-[var(--quiet)]">Control panel</p>
            <Nav />
            <UserChip />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
