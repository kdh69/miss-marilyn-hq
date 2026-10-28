import "server-only";
import type { Row } from "@mm/core";
import type { Snapshot } from "./data";

/**
 * Shown until the Sheet is connected, so the panel renders from day one.
 * Every row uses the real schema headers and dropdown values; dates are relative to today.
 */
const NY = "America/New_York";
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toLocaleDateString("en-CA", { timeZone: NY });
const ago = (hours: number) => new Date(Date.now() - hours * 36e5).toISOString().replace(/\.\d+Z$/, "Z");
const rows = (xs: Record<string, string>[]) => xs as Row[];

/** Deterministic "random" so the sample looks the same on every load. */
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const task = (task_id: string, product_id: string, task_type: string, title: string, owner: string, status: string, due: number, extra: Record<string, string> = {}) =>
  ({ task_id, product_id, task_type, title, owner, status, priority: "P2", due_date: day(due), updated_at: ago(Math.abs(due) + 2), ...extra });

const OLLIE_TEXT = [
  "Ollie the otter lived by the bend in the river.",
  "One morning, Mama's tummy was round as a river stone.",
  "\"A baby is coming,\" said Papa. Ollie's whiskers drooped.",
  "Would there be room on the rock for one more otter?",
  "Ollie swam away to think. The river was quiet and cold.",
  "Grandpa Otter floated by. \"When you came, the rock grew bigger,\" he said.",
  "\"Rocks don't grow,\" said Ollie. Grandpa just smiled.",
  "Ollie found the smoothest shell in the whole river.",
  "That night the baby came, tiny and squeaky and wet.",
  "\"For you,\" Ollie whispered. The baby squeaked hello.",
  "Mama scooted over. Papa scooted over. There was room after all.",
  "And Ollie learned that love, like the river, always makes more room.",
];
const OLLIE_ART = [
  "Ollie floating on his back at sunrise", "Mama otter, round belly, gentle smile", "Papa explaining; Ollie looking unsure",
  "The family rock, a little crowded", "Ollie alone in grey-blue water", "Grandpa Otter drifting by on a log",
  "Close-up: Grandpa's knowing smile", "Ollie diving for shells, sunlight through water", "Night scene, the tiny new baby",
  "Ollie handing the shell to the baby", "The whole family squeezing onto the rock", "Wide sunset over the river bend",
];

export function sample(): Snapshot {
  const r = rand(7);
  const transactions: Row[] = [];
  for (let d = 75; d >= 0; d--) {
    if (r() < (d > 40 ? 0.25 : 0.5)) {
      const qty = r() < 0.2 ? 2 : 1;
      const gross = 4.99 * qty;
      const fees = +(gross * 0.095 + 0.45).toFixed(2);
      transactions.push({ txn_id: `X-${day(-d).replace(/-/g, "")}-${transactions.length}`, date: day(-d), channel: "ETSY", txn_type: "sale", sku: "OL-P01-PRT", qty: String(qty), gross_usd: gross.toFixed(2), fees_usd: fees.toFixed(2), net_usd: (gross - fees).toFixed(2) } as Row);
    }
  }
  const costs: Row[] = [
    { cost_id: "C-today-1", date: day(), category: "ai_credits", vendor: "Grok", amount_usd: "5.10", estimated: "TRUE", role: "illustrator" },
    { cost_id: "C-today-2", date: day(), category: "qc_api", vendor: "Anthropic", amount_usd: "1.30", estimated: "FALSE", role: "backend" },
    { cost_id: "C-s1", date: day(-62), category: "software", vendor: "Canva", amount_usd: "14.99", product_id: "" },
    { cost_id: "C-s2", date: day(-31), category: "software", vendor: "Canva", amount_usd: "14.99", product_id: "" },
    { cost_id: "C-s3", date: day(-1), category: "software", vendor: "Canva", amount_usd: "14.99", product_id: "" },
    { cost_id: "C-l1", date: day(-58), category: "listing_fees", vendor: "Etsy", amount_usd: "0.20", product_id: "OL-P01" },
    { cost_id: "C-l2", date: day(-28), category: "listing_fees", vendor: "Etsy", amount_usd: "0.20", product_id: "OL-P01" },
    { cost_id: "C-p1", date: day(-9), category: "print_proof", vendor: "Amazon KDP", amount_usd: "6.48", product_id: "OL-B01" },
  ] as Row[];
  for (let d = 70; d >= 1; d--) {
    if (r() < 0.55) costs.push({ cost_id: `C-ai-${d}`, date: day(-d), category: "ai_credits", vendor: "Grok", amount_usd: (1 + r() * 6).toFixed(2), estimated: "TRUE", product_id: r() < 0.6 ? "OL-B01" : "MM-B01" } as Row);
  }

  return {
    _sample: true,
    products: rows([
      { product_id: "OL-B01", line: "OL", series_no: "1", title: "Ollie and the New Baby", lesson_theme: "welcoming a sibling", age_range: "3-6", status: "in_production" },
      { product_id: "MM-B01", line: "MM", series_no: "1", title: "The Adventures of Miss Marilyn: Book 1", lesson_theme: "being brave somewhere new", age_range: "3-7", status: "in_production" },
      { product_id: "OL-P01", line: "OL", series_no: "", title: "Ollie Coloring Pages", subtitle: "12 printable pages", age_range: "3-8", status: "live" },
      { product_id: "OL-P02", line: "OL", series_no: "", title: "Big Sibling Activity Pack", subtitle: "from Scout's trend", age_range: "3-6", status: "concept" },
    ]),
    skus: rows([
      { sku: "OL-B01-PB", product_id: "OL-B01", format: "PB", trim_size: "8.5x8.5", page_count: "32", list_price: "12.99", print_cost: "3.24", status: "draft" },
      { sku: "MM-B01-PB", product_id: "MM-B01", format: "PB", trim_size: "8.5x8.5", page_count: "32", list_price: "12.99", status: "draft" },
      { sku: "OL-P01-PRT", product_id: "OL-P01", format: "PRT", list_price: "4.99", status: "live" },
    ]),
    listings: rows([
      { listing_id: "L-01", sku: "OL-P01-PRT", channel: "ETSY", status: "live", title: "Ollie the Otter Coloring Pages", price: "4.99", live_url: "" },
      { listing_id: "L-02", sku: "OL-B01-PB", channel: "KDP", status: "draft", title: "Ollie and the New Baby", price: "12.99" },
      { listing_id: "L-03", sku: "OL-P01-PRT", channel: "PINTEREST", status: "live", title: "Coloring pages pin", price: "" },
    ]),
    tasks: rows([
      task("T-0003", "OL-P01", "printable_set", "Ollie coloring pages", "builder", "done", -40),
      task("T-0004", "OL-P01", "etsy_listing", "Etsy listing: coloring pages", "publisher", "done", -36),
      task("T-0006", "OL-B01", "book_plan", "Ollie book plan", "orchestrator", "done", -21),
      task("T-0007", "OL-B01", "story_draft", "Ollie story draft", "story_producer", "done", -17),
      task("T-0009", "OL-B01", "art_page", "Ollie page art (12 pages)", "illustrator", "done", -8),
      task("T-0010", "OL-B01", "art_cover", "Ollie front cover", "illustrator", "done", -5),
      task("T-0012", "OL-B01", "interior_layout", "Ollie interior layout", "builder", "awaiting_mom", 2, { qc_result: "pass" }),
      task("T-0013", "OL-B01", "cover_wrap", "Ollie cover wrap", "builder", "in_progress", 4),
      task("T-0014", "OL-B01", "kdp_packet", "Ollie KDP packet", "publisher", "todo", 6),
      task("T-0015", "MM-B01", "book_plan", "Miss M Book 1 plan", "orchestrator", "done", -6),
      task("T-0016", "MM-B01", "photo_request", "Photos of Miss M playing", "orchestrator", "awaiting_mom", 1),
      task("T-0019", "MM-B01", "story_draft", "Miss M Book 1 story draft", "story_producer", "awaiting_mom", 3, { qc_result: "pass" }),
      task("T-0020", "MM-B01", "art_page", "Miss M character sheet", "illustrator", "blocked", 7, { blocked_reason: "Waiting on photos of Miss M" }),
      task("T-0022", "OL-P01", "social_batch", "Pinterest pins: coloring pages", "growth", "qc_fail", 1, { qc_notes: "Two pins have text cut off at the edge" }),
      task("T-0023", "OL-P02", "printable_set", "Big Sibling Activity Pack", "builder", "todo", 9),
      task("T-0024", "OL-B01", "social_batch", "Ollie launch posts", "growth", "ready_for_qc", 5),
      task("T-0025", "", "email", "Welcome email for the list", "growth", "escalated", 3, { qc_notes: "Mentions a discount Clara never approved" }),
    ]),
    mom_queue: rows([
      { item_id: "M-T-0012-1", task_id: "T-0012", item_type: "approve", summary: "Ollie interior: all 32 pages laid out", qc_summary: "Passed every KDP check: trim, bleed, fonts, page count.", preview_url: "", requested_at: ago(5), answer: "", processed_at: "" },
      { item_id: "M-T-0019-1", task_id: "T-0019", item_type: "rewrite", summary: "Book 1 story: make the words yours", qc_summary: "Story is 410 words, reads at age 4–6. Ready for your voice.", preview_url: "", requested_at: ago(20), answer: "", processed_at: "" },
      { item_id: "M-T-0016-1", task_id: "T-0016", item_type: "photos", summary: "Send 5 photos of Miss M playing", qc_summary: "", preview_url: "", requested_at: ago(28), answer: "", processed_at: "" },
    ]),
    pages: OLLIE_TEXT.map((text_draft, i) => ({
      page_id: `OL-B01-P${String(i + 1).padStart(2, "0")}`, product_id: "OL-B01", page_number: String(i + 1),
      text_draft, art_brief: OLLIE_ART[i], characters: i === 5 || i === 6 ? "Ollie, Grandpa" : "Ollie, Mama, Papa", art_asset_id: "",
      text_final: ["Ollie the otter lived where the river bends and the cattails wave.", "", "", "Was there room on the rock for one more otter? Ollie wasn't so sure."][i] ?? "",
      text_final_by: i === 0 || i === 3 ? "mom" : "", text_final_at: "", updated_at: "",
    })) as Row[],
    requests: rows([
      { request_id: "Q-01", created_at: ago(3), from: "orchestrator", to: "mom", product_id: "MM-B01", kind: "question", body: "For Book 1, should Miss M's first adventure be flying to see Nonna and Poppy, or the first day of school?", status: "new", reply: "" },
      { request_id: "Q-02", created_at: ago(26), from: "mom", to: "kyle", product_id: "OL-B01", page_number: "3", kind: "change", body: "Papa should look happier here, not worried.", status: "seen", reply: "" },
      { request_id: "Q-03", created_at: ago(30), from: "mom", to: "kyle", kind: "idea", body: "What about a Halloween coloring page with Miss M in a pumpkin costume?", status: "new", reply: "" },
      { request_id: "Q-04", created_at: ago(50), from: "mom", to: "orchestrator", kind: "rule", body: "Miss M's collar is always red, in every book.", status: "done", reply: "Got it — added to the series bible.", reply_by: "orchestrator" },
      { request_id: "Q-05", created_at: ago(70), from: "orchestrator", to: "mom", product_id: "OL-B01", kind: "question", body: "Should Grandpa Otter wear glasses?", status: "done", reply: "Yes! Little round ones.", reply_by: "mom" },
    ]),
    research: rows([
      { research_id: "R-01", date: day(), topic: "Sibling printables", research_type: "trend", finding: "Searches for new-sibling activity pages are rising this month.", numbers: "+38% in 30 days", confidence: "med", suggested_action: "A Big Sibling activity pack to sell next to the Ollie book", status: "new" },
      { research_id: "R-02", date: day(-1), topic: "\"otter coloring pages\"", research_type: "keyword", finding: "Low competition on Etsy; most results are generic sea animals.", numbers: "1.2K searches/mo · 140 listings", confidence: "high", suggested_action: "Add 'otter' to the coloring pages title and tags", status: "new" },
      { research_id: "R-03", date: day(-4), topic: "Picture book pricing", research_type: "pricing", finding: "Comparable 32-page paperbacks sell at $10.99–$13.99.", numbers: "median $12.49", confidence: "high", suggested_action: "Keep Ollie at $12.99", status: "reviewed" },
      { research_id: "R-04", date: day(-6), topic: "Holiday dog books", research_type: "idea", finding: "Dog-character Christmas books peak in early November.", numbers: "", confidence: "low", suggested_action: "Consider a short Miss M holiday printable", status: "new" },
    ]),
    content: rows([
      { content_id: "CT-01", product_id: "OL-P01", channel: "PINTEREST", content_type: "pin", scheduled_for: `${day(1)}T14:00:00Z`, hook: "Free otter coloring page for little ones", status: "scheduled" },
      { content_id: "CT-02", product_id: "OL-P01", channel: "INSTAGRAM", content_type: "reel", scheduled_for: `${day(2)}T16:00:00Z`, hook: "Watch Ollie come to life, crayon by crayon", status: "approved" },
      { content_id: "CT-03", product_id: "", channel: "EMAIL", content_type: "email", scheduled_for: `${day(4)}T13:00:00Z`, hook: "Meet Miss Marilyn (and her red collar)", status: "approved" },
      { content_id: "CT-04", product_id: "OL-B01", channel: "FACEBOOK", content_type: "post", scheduled_for: `${day(6)}T15:00:00Z`, hook: "Ollie's book is almost here — a peek inside", status: "scheduled" },
      { content_id: "CT-05", product_id: "OL-B01", channel: "PINTEREST", content_type: "pin", scheduled_for: `${day(10)}T14:00:00Z`, hook: "Books for a new big brother or sister", status: "approved" },
    ]),
    accounts: rows([
      { account_id: "A01", service: "Business Gmail", owner: "Clara", purpose: "owns every store and social account", phase: "now", status: "todo", two_factor: "TRUE" },
      { account_id: "A02", service: "Password manager", owner: "Clara", purpose: "shared vault with Kyle", phase: "now", status: "todo", two_factor: "TRUE" },
      { account_id: "A03", service: "Bot Gmail", owner: "Kyle", purpose: "Grok's Drive and Sheet access only", phase: "now", status: "in_progress", two_factor: "TRUE" },
      { account_id: "A04", service: "GitHub", owner: "Kyle", purpose: "repo, scheduled backend, secrets", phase: "now", status: "done", two_factor: "TRUE" },
      { account_id: "A05", service: "Google Cloud", owner: "Clara", purpose: "Sheet and Drive keys for the backend", phase: "now", status: "todo", two_factor: "TRUE" },
      { account_id: "A06", service: "Vercel", owner: "Kyle", purpose: "hosts this panel", phase: "now", status: "todo", two_factor: "TRUE" },
      { account_id: "A10", service: "LLC + EIN", owner: "Clara", purpose: "the business itself", phase: "phase_0", status: "todo", two_factor: "FALSE" },
      { account_id: "A11", service: "Business bank", owner: "Clara", purpose: "every fee and payout", phase: "phase_0", status: "todo", two_factor: "TRUE" },
      { account_id: "A12", service: "Brand domain", owner: "Clara", purpose: "email and website address", phase: "phase_0", status: "waiting", two_factor: "TRUE" },
      { account_id: "A15", service: "Amazon KDP", owner: "Clara", purpose: "publish paperbacks", phase: "phase_1", status: "todo", two_factor: "TRUE" },
      { account_id: "A16", service: "Etsy shop", owner: "Clara", purpose: "sell printables", phase: "phase_1", status: "done", two_factor: "TRUE" },
      { account_id: "A17", service: "Pinterest business", owner: "Clara", purpose: "pins that link to the shop", phase: "phase_1", status: "done", two_factor: "TRUE" },
      { account_id: "A18", service: "Meta Business Suite", owner: "Clara", purpose: "Facebook Page + Instagram", phase: "phase_1", status: "todo", two_factor: "TRUE" },
      { account_id: "A20", service: "Etsy developer app", owner: "Clara", purpose: "lets the panel publish listings", phase: "phase_2", status: "waiting", two_factor: "TRUE" },
    ]),
    log: rows([
      { ts: ago(0.5), actor: "builder", task_id: "T-0013", from_status: "todo", to_status: "in_progress", message: "Started the cover wrap" },
      { ts: ago(1.2), actor: "backend", task_id: "T-0022", from_status: "in_qc", to_status: "qc_fail", message: "Two pins have text cut off at the edge" },
      { ts: ago(2), actor: "growth", task_id: "T-0024", from_status: "in_progress", to_status: "ready_for_qc", message: "6 launch posts drafted" },
      { ts: ago(5), actor: "backend", task_id: "T-0012", from_status: "in_qc", to_status: "awaiting_mom", message: "Passed KDP preflight and QC" },
      { ts: ago(6), actor: "builder", task_id: "T-0012", from_status: "in_progress", to_status: "ready_for_qc", message: "32 pages laid out" },
      { ts: ago(9), actor: "backend", task_id: "T-0025", from_status: "in_qc", to_status: "escalated", message: "Mentions a discount Clara never approved" },
      { ts: ago(20), actor: "backend", task_id: "T-0019", from_status: "in_qc", to_status: "awaiting_mom", message: "Story passed QC" },
      { ts: ago(26), actor: "illustrator", task_id: "T-0020", from_status: "in_progress", to_status: "blocked", message: "Needs reference photos of Miss M" },
      { ts: ago(40), actor: "mom", task_id: "T-0010", from_status: "awaiting_mom", to_status: "approved", message: "Love the cover!" },
      { ts: ago(41), actor: "backend", task_id: "T-0010", from_status: "approved", to_status: "done", message: "" },
    ]),
    assets: [], transactions, costs,
    config: rows([{ key: "daily_bot_cap_usd", value: "15" }, { key: "daily_qc_cap_usd", value: "5" }, { key: "system_status", value: "RUN" }]),
  } as Snapshot;
}
