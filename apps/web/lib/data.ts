import "server-only";
import { unstable_cache } from "next/cache";
import { Core, type Row } from "@mm/core";
import { sample } from "./sample";

const TABS = ["tasks", "assets", "products", "skus", "listings", "content", "mom_queue", "pages", "requests", "research", "accounts", "costs", "transactions", "log", "config"] as const;
type Tab = (typeof TABS)[number];
export type Snapshot = Record<Tab, Row[]> & { _sample?: boolean };

/** One Sheet read per minute across all visitors (spec §9b: 60-second cache). */
export const getSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.MM_CORE_SHEET_ID) return sample();
    const core = await Core.load([...TABS]);
    return Object.fromEntries(TABS.map((t) => [t, core.rows(t)])) as unknown as Snapshot;
  },
  ["mm-core-snapshot"],
  { revalidate: 60, tags: ["mm-core-snapshot"] },
);

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export const STAGES = ["story_draft", "art_page", "art_cover", "interior_layout", "cover_wrap", "kdp_packet"];

/** Rough book progress: share of the production chain that's done. */
export function bookProgress(s: Snapshot, productId: string) {
  const tasks = s.tasks.filter((t) => t.product_id === productId && t.status !== "cancelled");
  if (!tasks.length) return { pct: 0, stage: "Not started" };
  const done = tasks.filter((t) => t.status === "done").length;
  const current = tasks.find((t) => t.status !== "done");
  return { pct: Math.round((done / tasks.length) * 100), stage: current ? current.title : "Complete" };
}

export function spendToday(s: Snapshot) {
  const d = today();
  const sum = (cat: string) => s.costs.filter((c) => c.date === d && c.category === cat).reduce((a, c) => a + (Number(c.amount_usd) || 0), 0);
  const cap = Number(s.config.find((c) => c.key === "daily_bot_cap_usd")?.value || 15);
  return { bots: sum("ai_credits"), qc: sum("qc_api"), cap };
}

/** Drive file ID from any Drive/Docs URL, for the /api/asset proxy. */
export const driveId = (url = "") => url.match(/[-\w]{25,}/)?.[0] ?? "";

/** Pages of one book, with the latest art URL resolved from assets. */
export function bookPages(s: Snapshot, productId: string) {
  const assets = new Map(s.assets.map((a) => [a.asset_id, a]));
  const latestArt = new Map<string, Row>();
  for (const a of s.assets) {
    if (a.product_id === productId && a.asset_type === "page_art" && a.status !== "superseded") latestArt.set(a.page_number, a);
  }
  return s.pages
    .filter((p) => p.product_id === productId)
    .sort((a, b) => Number(a.page_number) - Number(b.page_number))
    .map((p) => {
      const art = assets.get(p.art_asset_id) ?? latestArt.get(p.page_number);
      return { ...p, art_id: driveId(art?.file_url), text: p.text_final || p.text_draft } as Row;
    });
}

/** One step per production stage: done, active (has open work), or still to come. */
export function bookStages(s: Snapshot, productId: string) {
  const tasks = s.tasks.filter((t) => t.product_id === productId && t.status !== "cancelled");
  return STAGES.map((type) => {
    const ts = tasks.filter((t) => t.task_type === type);
    const open = ts.find((t) => t.status !== "done");
    const state = open ? "active" : ts.length ? "done" : "upcoming";
    return { type, state, status: open?.status ?? "" };
  });
}

/** What each bot is doing now, busiest first. */
export function teamNow(s: Snapshot, bots: string[]) {
  const open = s.tasks.filter((t) => !["done", "cancelled"].includes(t.status));
  return bots.map((role) => {
    const mine = open.filter((t) => t.owner === role);
    const now = mine.find((t) => t.status === "in_progress") ?? mine[0];
    const last = s.log.filter((l) => l.actor === role).sort((a, b) => b.ts.localeCompare(a.ts))[0];
    return { role, open: mine.length, now, last };
  });
}

/** Sales (net) and costs per month, oldest first, for the last `n` months (New York calendar). */
export function moneyByMonth(s: Snapshot, n = 6) {
  const months: string[] = [];
  const d = new Date(`${today().slice(0, 7)}-15T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) months.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 15)).toISOString().slice(0, 7));
  const sum = (xs: Row[], key: string, m: string) => xs.filter((x) => x.date?.startsWith(m)).reduce((a, x) => a + (Number(x[key]) || 0), 0);
  return months.map((m) => ({ month: m, sales: sum(s.transactions, "net_usd", m), costs: sum(s.costs, "amount_usd", m) }));
}

export function costsByCategory(s: Snapshot) {
  const by = new Map<string, number>();
  for (const c of s.costs) by.set(c.category, (by.get(c.category) ?? 0) + (Number(c.amount_usd) || 0));
  return [...by].sort((a, b) => b[1] - a[1]);
}
