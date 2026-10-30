import "server-only";
import { unstable_cache } from "next/cache";
import { Core, type Row } from "@mm/core";
import { STAGE_TRACK, TASK_STATUS, TASK_TYPE } from "./labels";

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

const OPEN = (t: Row) => !["done", "cancelled"].includes(t.status);

/** Rough book progress: share of the production chain that's done. */
export function bookProgress(s: Snapshot, productId: string) {
  const tasks = s.tasks.filter((t) => t.product_id === productId && t.status !== "cancelled");
  if (!tasks.length) return { pct: 0, stage: "Not started" };
  const done = tasks.filter((t) => t.status === "done").length;
  const current = tasks.find((t) => t.status !== "done");
  return { pct: Math.round((done / tasks.length) * 100), stage: current ? current.title : "Complete" };
}

/** Where a book is on the Story → Art → Layout → Publish → On sale track, in plain words. */
export function bookStage(s: Snapshot, productId: string) {
  const product = s.products.find((p) => p.product_id === productId);
  const tasks = s.tasks.filter((t) => t.product_id === productId && t.status !== "cancelled");
  const pages = s.pages.filter((p) => p.product_id === productId);
  const yours = pages.filter((p) => p.text_final).length;
  const stageOf = (type: string) => Math.max(0, STAGE_TRACK.findIndex((st) => st.types.includes(type)));
  const open = tasks.filter(OPEN);
  const live = product?.status === "live" || s.listings.some((l) => l.sku.startsWith(productId) && l.status === "live");
  let index = live ? 4 : open.length ? Math.min(...open.map((t) => stageOf(t.task_type))) : tasks.length ? Math.min(3, Math.max(...tasks.map((t) => stageOf(t.task_type))) + 1) : 0;
  if (live) index = 4;
  const waitingOnYou = tasks.filter((t) => t.status === "awaiting_mom");
  const working = open.filter((t) => !["awaiting_mom", "todo"].includes(t.status)).sort((a, b) => stageOf(a.task_type) - stageOf(b.task_type));
  const queued = open.filter((t) => t.status === "todo");
  const name = (t: Row) => TASK_TYPE[t.task_type] ?? t.title;
  const now = live ? "On sale." : working.length ? `${name(working[0])}: ${(TASK_STATUS[working[0].status] ?? working[0].status).toLowerCase()}.` : waitingOnYou.length ? "Waiting on you." : queued.length ? `${name(queued[0])} is next in line.` : tasks.length ? "All done." : "Not started yet.";
  const waiting = waitingOnYou.length ? waitingOnYou.map(name).join(", ") : pages.length && yours < pages.length ? `${pages.length - yours} page${pages.length - yours > 1 ? "s" : ""} still in the draft's words` : "";
  const next = queued.length ? name(queued[0]) : index < 4 ? STAGE_TRACK[index + 1]?.label ?? "" : "";
  const done = tasks.filter((t) => t.status === "done").length;
  return { index, label: STAGE_TRACK[index].label, now, waiting, next, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0, pages: pages.length, yours };
}

export type NeedsYouItem =
  | { kind: "approve"; id: string; productId: string; title: string; item: Row }
  | { kind: "question"; id: string; productId: string; title: string; request: Row };

/** Everything waiting on the person looking: approvals in mom_queue and unanswered questions to them. */
export function needsYou(s: Snapshot, view: "mom" | "kyle"): NeedsYouItem[] {
  const taskProduct = (taskId: string) => s.tasks.find((t) => t.task_id === taskId)?.product_id ?? "";
  const approvals: NeedsYouItem[] = view === "mom"
    ? s.mom_queue.filter((m) => !m.answer && !m.processed_at).map((m) => ({ kind: "approve", id: m.item_id, productId: taskProduct(m.task_id), title: m.summary, item: m }))
    : [];
  const questions: NeedsYouItem[] = s.requests
    .filter((r) => r.to === view && !r.reply && !["done", "wont_do"].includes(r.status))
    .map((r) => ({ kind: "question", id: r.request_id, productId: r.product_id, title: r.body, request: r }));
  return [...approvals, ...questions];
}

export const bookTitle = (s: Snapshot, productId: string) => s.products.find((p) => p.product_id === productId)?.title ?? productId;

/** `finish` is set only for things the panel may close with a tick: a Done-type ask, or an account the viewer owns. */
export type TodoItem = { id: string; when: string; what: string; where: string; href: string; finish?: { kind: "item" | "account"; id: string } };

/** Clara's to-do list: approvals, questions, her own accounts, this week's posts. Sorted by date, undated last. */
export function todoList(s: Snapshot, view: "mom" | "kyle"): TodoItem[] {
  const items: TodoItem[] = [];
  for (const n of needsYou(s, view)) {
    const due = n.kind === "approve" ? s.tasks.find((t) => t.task_id === n.item.task_id)?.due_date ?? "" : n.request.created_at.slice(0, 10);
    // Approvals and publish asks need the real button (they can spend or publish); only Done-type asks get a tick.
    const finish = n.kind === "approve" && ["photos", "rewrite"].includes(n.item.item_type) ? { kind: "item" as const, id: n.id } : undefined;
    items.push({ id: n.id, when: due, what: n.title, where: n.productId ? bookTitle(s, n.productId) : "The business", href: n.productId ? `/books/${n.productId}` : n.kind === "approve" ? "/books" : view === "mom" ? "/ideas" : "/inbox", finish });
  }
  const mine = view === "mom" ? "clara" : "kyle";
  for (const a of s.accounts.filter((a) => ["todo", "in_progress", "waiting"].includes(a.status) && a.owner.toLowerCase().includes(mine) && a.phase === "now")) {
    items.push({ id: a.account_id, when: "", what: `Set up ${a.service}`, where: "Accounts", href: view === "mom" ? "/todo#accounts" : "/system#accounts", finish: { kind: "account", id: a.account_id } });
  }
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  for (const c of s.content.filter((c) => ["approved", "scheduled"].includes(c.status) && c.scheduled_for && c.scheduled_for.slice(0, 10) <= weekEnd)) {
    items.push({ id: c.content_id, when: c.scheduled_for.slice(0, 10), what: `Post goes out: ${c.hook || c.content_type}`, where: c.channel, href: "/todo" });
  }
  return items.sort((a, b) => (a.when || "9999").localeCompare(b.when || "9999"));
}

/** When the backend last ran, from the log. */
export function lastTick(s: Snapshot) {
  return [...s.log].reverse().find((l) => l.actor === "backend")?.ts ?? "";
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
