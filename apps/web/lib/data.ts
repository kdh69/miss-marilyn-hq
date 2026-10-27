import "server-only";
import { unstable_cache } from "next/cache";
import { Core, type Row } from "@mm/core";

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
    pages: Array.from({ length: 6 }, (_, i) => ({
      page_id: `OL-B01-P${String(i + 1).padStart(2, "0")}`,
      product_id: "OL-B01",
      page_number: String(i + 1),
      text_draft: [
        "Ollie the otter lived by the bend in the river.",
        "One morning, Mama's tummy was round as a river stone.",
        "\"A baby is coming,\" said Papa. Ollie's whiskers drooped.",
        "Would there be room on the rock for one more otter?",
        "Ollie found the smoothest shell in the whole river.",
        "\"For you,\" he whispered. The baby squeaked hello.",
      ][i],
      art_brief: ["Ollie floating on his back at sunrise", "Mama otter, round belly, gentle smile", "Papa explaining; Ollie looking unsure", "The family rock, a little crowded", "Ollie diving for shells", "Ollie handing the shell to the new baby"][i],
      characters: "Ollie, Mama, Papa",
      art_asset_id: "",
      text_final: i === 0 ? "Ollie the otter lived where the river bends and the cattails wave." : "",
      text_final_by: i === 0 ? "mom" : "",
      text_final_at: "",
      updated_at: "",
    })) as Row[],
    requests: [
      { request_id: "Q-20261027-01", created_at: "2026-10-27T14:02:00Z", from: "orchestrator", to: "mom", product_id: "MM-B01", page_number: "", kind: "question", body: "For Book 1, should Miss M's first adventure be flying to see Nonna and Poppy, or the first day of school?", status: "new", reply: "" },
      { request_id: "Q-20261026-03", created_at: "2026-10-26T19:40:00Z", from: "mom", to: "kyle", product_id: "OL-B01", page_number: "3", kind: "change", body: "Papa should look happier here, not worried.", status: "seen", reply: "" },
    ] as Row[],
    accounts: [
      { account_id: "A01", service: "Business Gmail", owner: "Clara", purpose: "owns every store and social account", phase: "now", status: "todo", two_factor: "TRUE" },
      { account_id: "A04", service: "GitHub", owner: "Kyle", purpose: "repo, scheduled backend, secrets", phase: "now", status: "done", two_factor: "TRUE" },
      { account_id: "A15", service: "Amazon KDP", owner: "Clara", purpose: "publish paperbacks", phase: "phase_0", status: "todo", two_factor: "TRUE" },
      { account_id: "A16", service: "Etsy shop", owner: "Clara", purpose: "sell printables", phase: "phase_0", status: "todo", two_factor: "TRUE" },
    ] as Row[],
    assets: [], skus: [], listings: [], content: [], transactions: [], log: [],
    config: [{ key: "daily_bot_cap_usd", value: "15" }, { key: "system_status", value: "RUN" }] as Row[],
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
