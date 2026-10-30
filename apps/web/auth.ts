import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { FAMILY_COOKIE, isFamilyCookie } from "@/lib/family";

/** kyle: everything. mom: approves, edits pages, messages; no costs. family: read-only, no money or accounts. */
export type PanelRole = "mom" | "kyle" | "family";
const ROLES: PanelRole[] = ["mom", "kyle", "family"];
type PanelUser = { role: PanelRole; name: string };

/**
 * PANEL_USERS="clara@gmail.com:mom,kyle@gmail.com:kyle,sis@gmail.com:family:Jess" — the only
 * people who can sign in. The name is optional (greeting only); mom and kyle default to Clara and Kyle.
 */
export function panelUsers(): Map<string, PanelUser> {
  const users = new Map<string, PanelUser>();
  for (const entry of (process.env.PANEL_USERS ?? "").split(",")) {
    const [email, role, name] = entry.trim().split(":").map((s) => s.trim());
    if (!email || !ROLES.includes(role as PanelRole)) continue;
    users.set(email.toLowerCase(), { role: role as PanelRole, name: name || (role === "mom" ? "Clara" : role === "kyle" ? "Kyle" : "") });
  }
  return users;
}

export const authConfigured = () => !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    signIn: ({ profile }) => !!profile?.email && panelUsers().has(profile.email.toLowerCase()),
    session: ({ session }) => {
      const role = panelUsers().get(session.user?.email?.toLowerCase() ?? "")?.role;
      return { ...session, role };
    },
    authorized: async ({ auth: s, request }) => {
      if (!authConfigured()) return true; // preview mode: read-only sample, writes refused in actions
      if (["/signin", "/privacy"].some((p) => request.nextUrl.pathname.startsWith(p))) return true;
      return !!s?.user || (await isFamilyCookie(request.cookies.get(FAMILY_COOKIE)?.value));
    },
  },
});

/** Who is signed in, or null. Google sign-in wins; otherwise the family password cookie. */
export async function me(): Promise<{ email: string; role: PanelRole; name: string } | null> {
  if (!authConfigured()) return null;
  const s = await auth();
  const email = s?.user?.email?.toLowerCase();
  const user = email ? panelUsers().get(email) : undefined;
  if (email && user) return { email, ...user };
  if (await isFamilyCookie((await cookies()).get(FAMILY_COOKIE)?.value)) return { email: "", role: "family", name: "Family" };
  return null;
}

/** Who may write, or null. Server actions refuse without this; family is read-only. */
export async function editor(): Promise<{ email: string; role: "mom" | "kyle"; name: string } | null> {
  const who = await me();
  return who && who.role !== "family" ? { ...who, role: who.role } : null;
}
