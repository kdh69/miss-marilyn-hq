import NextAuth from "next-auth";
import { cookies } from "next/headers";
import Google from "next-auth/providers/google";

export type PanelRole = "mom" | "kyle";

/** PANEL_USERS="clara@gmail.com:mom,kyle@gmail.com:kyle" — the only people who can sign in. */
export function panelUsers(): Map<string, PanelRole> {
  return new Map(
    (process.env.PANEL_USERS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase().split(":") as [string, PanelRole])
      .filter(([e, r]) => e && (r === "mom" || r === "kyle")),
  );
}

export const authConfigured = () => !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    signIn: ({ profile }) => !!profile?.email && panelUsers().has(profile.email.toLowerCase()),
    session: ({ session }) => {
      const role = panelUsers().get(session.user?.email?.toLowerCase() ?? "");
      return { ...session, role };
    },
    authorized: ({ auth: s, request }) => {
      if (!authConfigured()) return true; // preview mode: read-only sample, writes refused in actions
      if (request.nextUrl.pathname.startsWith("/signin")) return true;
      return !!s?.user;
    },
  },
});

/** Who is acting, or null. Server actions refuse to write without this. */
export async function me(): Promise<{ email: string; role: PanelRole } | null> {
  if (!authConfigured()) return null;
  const s = await auth();
  const email = s?.user?.email?.toLowerCase();
  const role = email ? panelUsers().get(email) : undefined;
  return email && role ? { email, role } : null;
}

// ---------- Which view is on screen ----------

export const VIEW_COOKIE = "mm_view";

/**
 * The view being rendered, as distinct from who is signed in. Kyle can flip to Clara's
 * view to see exactly what she sees; preview mode (no sign-in) also shows Clara's view
 * by default. Clara always gets her own view. Writes never use this: server actions use me().
 */
export async function viewer(): Promise<{ real: PanelRole | null; view: PanelRole; canSwitch: boolean }> {
  const who = await me();
  const real = who?.role ?? null;
  if (real === "mom") return { real, view: "mom", canSwitch: false };
  const pick = (await cookies()).get(VIEW_COOKIE)?.value;
  const view: PanelRole = pick === "kyle" || pick === "mom" ? pick : real === "kyle" ? "kyle" : "mom";
  return { real, view, canSwitch: true };
}
