import "server-only";
import { cookies } from "next/headers";
import { authConfigured, me, type PanelRole } from "@/auth";

export const PREVIEW_COOKIE = "mm_preview_as";

/**
 * Whose view to render. Signed in: that person. Preview mode (sign-in not set up): whoever the
 * preview switch says, Clara by default. Display only — server actions still call me() and refuse.
 */
export async function viewerRole(): Promise<PanelRole | null> {
  if (authConfigured()) return (await me())?.role ?? null;
  return (await cookies()).get(PREVIEW_COOKIE)?.value === "kyle" ? "kyle" : "mom";
}

/** First name for greetings. */
export async function viewerName(): Promise<string> {
  if (authConfigured()) return (await me())?.name ?? "";
  return (await viewerRole()) === "kyle" ? "Kyle" : "Clara";
}

/** Tabs each role can open. Costs live only on Money, so Money is Kyle's alone. */
const HIDDEN: Record<PanelRole, string[]> = { kyle: [], mom: ["/money"], family: ["/money", "/accounts", "/messages"] };
export const hiddenTabs = (role: PanelRole | null) => (role ? HIDDEN[role] : []);
export const canSee = (role: PanelRole | null, href: string) => !!role && !HIDDEN[role].includes(href);
