import NextAuth from "next-auth";
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
