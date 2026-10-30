import "server-only";
import { cookies } from "next/headers";
import { authConfigured, editor, me, type PanelRole } from "@/auth";

/** Which view to show: "mom" or "kyle". Kyle (and preview mode) can flip it; nobody else can. */
export const PREVIEW_COOKIE = "mm_preview_as";

/**
 * Whose view to render. Clara and family always get their own. Kyle gets his, or Clara's if he
 * flipped the "Viewing as" switch. Preview mode (sign-in not set up): the switch, Clara by default.
 * Display only — server actions call editor() and act as whoever is really signed in.
 */
export async function viewerRole(): Promise<PanelRole | null> {
  const pick = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!authConfigured()) return pick === "kyle" ? "kyle" : "mom";
  const who = await me();
  if (!who) return null;
  return who.role === "kyle" && pick === "mom" ? "mom" : who.role;
}

/** Everything a page needs about the person looking. */
export async function viewer() {
  const [view, who, ed] = await Promise.all([viewerRole(), me(), editor()]);
  return {
    view: (view ?? "family") as PanelRole,  // whose view is on screen; nobody signed in = read-only
    real: who?.role ?? null,                // who is actually signed in
    canSwitch: !authConfigured() || who?.role === "kyle",
    canWrite: !!ed,                         // false in preview mode and for family
  };
}

/** First name for greetings: whoever's view is on screen. */
export async function viewerName(): Promise<string> {
  const [view, who] = await Promise.all([viewerRole(), me()]);
  if (view === "mom") return "Clara";
  if (view === "kyle") return "Kyle";
  return who?.name ?? "";
}

/**
 * Pages each view can open. Clara's Money shows sales only (costs are Kyle's). Family is
 * read-only: no messages, ideas, to-do, accounts or money.
 */
const HIDDEN: Record<PanelRole, string[]> = {
  kyle: [],
  mom: ["/inbox", "/system"],
  family: ["/money", "/accounts", "/messages", "/inbox", "/system", "/ideas", "/todo", "/script", "/art", "/build", "/review"],
};
export const hiddenTabs = (role: PanelRole | null) => (role ? HIDDEN[role] : []);
export const canSee = (role: PanelRole | null, href: string) => !!role && !HIDDEN[role].includes(href);
