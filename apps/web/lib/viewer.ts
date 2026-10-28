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
