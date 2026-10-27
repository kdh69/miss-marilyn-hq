import "server-only";
import { unstable_cache } from "next/cache";
import { Core, type Row } from "@mm/core";

const TABS = ["tasks", "assets", "products", "skus", "listings", "content", "mom_queue", "research", "costs", "transactions", "log", "config"] as const;
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

/** Shown until the Sheet is connected, so the panel renders from day one. */
function sample(): Snapshot {
  return {
    _sample: true,
    tasks: [
      { task_id: "T-0012", product_id: "OL-B01", title: "Ollie interior layout", task_type: "interior_layout", owner: "builder", status: "awaiting_mom", due_date: "2026-11-03", updated_at: "" },
      { task_id: "T-0014", product_id: "OL-B01", title: "Ollie KDP packet", task_type: "kdp_packet", owner: "publisher", status: "in_progress", due_date: "2026-11-05", updated_at: "" },
      { task_id: "T-0021", product_id: "MM-B01", title: "Miss M Book 1 story draft", task_type: "story_draft", owner: "story_producer", status: "ready_for_qc", due_date: "2026-11-10", updated_at: "" },
    ] as Row[],
    mom_queue: [
      { item_id: "M-T-0012-1", task_id: "T-0012", item_type: "approve", summary: "Ollie interior: all 32 pages laid out", preview_url: "", answer: "", processed_at: "" },
      { item_id: "M-T-0019-1", task_id: "T-0019", item_type: "rewrite", summary: "Book 1 story: make the words yours", preview_url: "", answer: "", processed_at: "" },
      { item_id: "M-T-0016-1", task_id: "T-0016", item_type: "photos", summary: "Send 5 photos of Miss M playing", preview_url: "", answer: "", processed_at: "" },
    ] as Row[],
    products: [
      { product_id: "OL-B01", title: "Ollie and the New Baby", status: "in_production" },
      { product_id: "MM-B01", title: "The Adventures of Miss Marilyn: Book 1", status: "concept" },
    ] as Row[],
    costs: [
      { date: today(), category: "ai_credits", amount_usd: "5.10" },
      { date: today(), category: "qc_api", amount_usd: "1.30" },
    ] as Row[],
    research: [{ research_id: "R-20261027-01", topic: "Sibling printables", finding: "Searches for new-sibling activity pages are rising this month.", confidence: "med", status: "new" }] as Row[],
    assets: [], skus: [], listings: [], content: [], transactions: [], log: [],
    config: [{ key: "daily_bot_cap_usd", value: "15" }] as Row[],
  };
}

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
