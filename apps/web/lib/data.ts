import "server-only";
import { unstable_cache } from "next/cache";
import { Core, type Row } from "@mm/core";
import { STAGE_TRACK, TASK_STATUS, TASK_TYPE, stageOfType } from "./labels";
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
  const stageOf = (type: string) => STAGE_TRACK.findIndex((st) => st.types.includes(type));
  // Only work that belongs to a step moves a book along (a photo request, say, doesn't).
  const stepped = tasks.filter((t) => stageOf(t.task_type) >= 0);
  const open = tasks.filter(OPEN);
  const openStepped = stepped.filter(OPEN);
  const live = product?.status === "live" || s.listings.some((l) => l.sku.startsWith(productId) && l.status === "live");
  // The step the book is on: the earliest step with open work. Nothing open: the step after the
  // last finished one. On sale: past every step.
  const last = STAGE_TRACK.length;
  const index = live ? last : openStepped.length ? Math.min(...openStepped.map((t) => stageOf(t.task_type))) : stepped.length ? Math.min(last - 1, Math.max(...stepped.map((t) => stageOf(t.task_type))) + 1) : 0;
  const waitingOnYou = tasks.filter((t) => t.status === "awaiting_mom");
  const working = open.filter((t) => !["awaiting_mom", "todo"].includes(t.status)).sort((a, b) => stageOf(a.task_type) - stageOf(b.task_type));
  const queued = open.filter((t) => t.status === "todo");
  const name = (t: Row) => TASK_TYPE[t.task_type] ?? t.title;
  const now = live ? "On sale." : working.length ? `${name(working[0])}: ${(TASK_STATUS[working[0].status] ?? working[0].status).toLowerCase()}.` : waitingOnYou.length ? "Waiting on you." : queued.length ? `${name(queued[0])} is next in line.` : tasks.length ? "All done." : "Not started yet.";
  const waiting = waitingOnYou.length ? waitingOnYou.map(name).join(", ") : pages.length && yours < pages.length ? `${pages.length - yours} page${pages.length - yours > 1 ? "s" : ""} still in the draft's words` : "";
  const next = queued.length ? name(queued[0]) : STAGE_TRACK[index + 1]?.label ?? "";
  const done = tasks.filter((t) => t.status === "done").length;
  return { index, key: STAGE_TRACK[index]?.key ?? "done", label: STAGE_TRACK[index]?.label ?? "On sale", now, waiting, next, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0, pages: pages.length, yours };
}

export type NeedsYouItem =
  | { kind: "approve"; id: string; productId: string; title: string; item: Row; href: string }
  | { kind: "question"; id: string; productId: string; title: string; request: Row; href: string };

/** The page where this ask is done: its step's page for that book, else the book itself. */
export function stepHref(s: Snapshot, taskId: string, productId: string) {
  const st = stageOfType(s.tasks.find((t) => t.task_id === taskId)?.task_type);
  return st && productId ? `${st.href}?book=${productId}` : productId ? `/books/${productId}` : "/";
}

/** Everything waiting on the person looking: approvals in mom_queue and unanswered questions to them. */
export function needsYou(s: Snapshot, view: string | null): NeedsYouItem[] {
  if (view !== "mom" && view !== "kyle") return []; // family: read-only, nothing waits on them
  const taskProduct = (taskId: string) => s.tasks.find((t) => t.task_id === taskId)?.product_id ?? "";
  const approvals: NeedsYouItem[] = view === "mom"
    ? s.mom_queue.filter((m) => !m.answer && !m.processed_at).map((m) => ({ kind: "approve", id: m.item_id, productId: taskProduct(m.task_id), title: m.summary, item: m, href: stepHref(s, m.task_id, taskProduct(m.task_id)) }))
    : [];
  const questions: NeedsYouItem[] = s.requests
    .filter((r) => r.to === view && !r.reply && !["done", "wont_do"].includes(r.status))
    .map((r) => ({ kind: "question", id: r.request_id, productId: r.product_id, title: r.body, request: r, href: r.product_id ? `/books/${r.product_id}` : "/" }));
  return [...approvals, ...questions];
}

export const bookTitle = (s: Snapshot, productId: string) => s.products.find((p) => p.product_id === productId)?.title ?? productId;

/** `finish` is set only for things the panel may close with a tick: a Done-type ask, or an account the viewer owns. */
export type TodoItem = { id: string; when: string; what: string; where: string; href: string; finish?: { kind: "item" | "account"; id: string } };

/** Clara's to-do list: approvals, questions, her own accounts, this week's posts. Sorted by date, undated last. */
export function todoList(s: Snapshot, view: string | null): TodoItem[] {
  if (view !== "mom" && view !== "kyle") return [];
  const items: TodoItem[] = [];
  for (const n of needsYou(s, view)) {
    const due = n.kind === "approve" ? s.tasks.find((t) => t.task_id === n.item.task_id)?.due_date ?? "" : n.request.created_at.slice(0, 10);
    // Approvals and publish asks need the real button (they can spend or publish); only Done-type asks get a tick.
    const finish = n.kind === "approve" && ["photos", "rewrite"].includes(n.item.item_type) ? { kind: "item" as const, id: n.id } : undefined;
    items.push({ id: n.id, when: due, what: n.title, where: n.productId ? bookTitle(s, n.productId) : "The business", href: n.href, finish });
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

/** The next page in each book that's still in the draft's words, for "Keep writing". */
export function nextToWrite(s: Snapshot) {
  return s.products
    .filter((p) => p.status !== "retired")
    .map((p) => {
      const pages = s.pages.filter((x) => x.product_id === p.product_id).sort((a, b) => Number(a.page_number) - Number(b.page_number));
      const left = pages.filter((x) => !x.text_final);
      return left.length ? { productId: p.product_id, title: p.title, page: left[0].page_number, left: left.length, total: pages.length } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

export function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
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
      return { ...p, art_id: driveId(art?.file_url), art_at: art?.created_at ?? "", text: p.text_final || p.text_draft } as Row;
    });
}

/** Books that aren't retired. */
export const activeBooks = (s: Snapshot) => s.products.filter((p) => p.status !== "retired");

/** The task of a step for a book: the open one if any, else the latest. */
export function stepTask(s: Snapshot, productId: string, key: string) {
  const types = STAGE_TRACK.find((st) => st.key === key)?.types ?? [];
  const ts = s.tasks.filter((t) => t.product_id === productId && types.includes(t.task_type) && t.status !== "cancelled");
  return ts.find((t) => OPEN(t)) ?? ts[ts.length - 1];
}

/** Clara's open ask (mom_queue) for a step of a book, if there is one. */
export function stepAsk(s: Snapshot, productId: string, key: string) {
  const types = STAGE_TRACK.find((st) => st.key === key)?.types ?? [];
  const ids = new Set(s.tasks.filter((t) => t.product_id === productId && types.includes(t.task_type)).map((t) => t.task_id));
  return s.mom_queue.find((m) => ids.has(m.task_id) && !m.answer && !m.processed_at);
}

/** Latest file of some types for a book (cover art, interior PDF…), from assets. */
export function latestAsset(s: Snapshot, productId: string, types: string[]) {
  return [...s.assets].reverse().find((a) => a.product_id === productId && types.includes(a.asset_type) && a.status !== "superseded");
}

/**
 * What Clara does next on each book, in her words, and where she does it. One line per book,
 * following the steps: approve what's waiting, else keep making the script hers, else see what's new.
 */
export function upNext(s: Snapshot) {
  return activeBooks(s).map((p) => {
    const id = p.product_id;
    const st = bookStage(s, id);
    const pages = s.pages.filter((x) => x.product_id === id).sort((a, b) => Number(a.page_number) - Number(b.page_number));
    const draftOnly = pages.find((x) => !x.text_final);
    const ask = (key: string) => stepAsk(s, id, key);
    const at = (key: string) => `${STAGE_TRACK.find((x) => x.key === key)!.href}?book=${id}`;
    let line: { step: string; text: string; href: string; mine: boolean };
    if (ask("review")) line = { step: "Review", text: "Read the finished book and give the final OK", href: at("review"), mine: true };
    else if (ask("build")) line = { step: "Build", text: "Look over the layout and approve it", href: at("build"), mine: true };
    else if (ask("art")) line = { step: "Art", text: "Approve the cover", href: at("art"), mine: true };
    else if (ask("script")) line = { step: "Script", text: "Read the script and approve it", href: at("script"), mine: true };
    else if (st.key === "script" && draftOnly) line = { step: "Script", text: `Make the script yours — page ${draftOnly.page_number} is next`, href: at("script"), mine: true };
    else if (st.key === "idea") line = { step: "Idea", text: "The team is planning it", href: "/ideas", mine: false };
    else if (st.key === "done") line = { step: "Done", text: "On sale", href: `/books/${id}`, mine: false };
    else line = { step: st.label, text: st.now.replace(/\.$/, ""), href: at(st.key), mine: false };
    return { id, title: p.title, index: st.index, ...line };
  });
}

const APPROVED: Record<"picture" | "layout", string> = { picture: "Picture approved for page", layout: "Layout approved for page" };

/**
 * Pages Clara approved, per kind: the picture (Illustrations) or the finished page (Building).
 * An approval is a done note in `requests` ("Layout approved for page 3."). It only counts if it's
 * newer than what it approved: the picture for a picture; the picture, her words and the latest
 * interior PDF for a layout — so she always signs off on what's there now.
 */
export function pageApprovals(s: Snapshot, productId: string, what: "picture" | "layout"): Record<string, string> {
  const pages = new Map(bookPages(s, productId).map((p) => [p.page_number, p]));
  const layoutAt = what === "layout" ? latestAsset(s, productId, ["interior_pdf"])?.created_at ?? "" : "";
  const out: Record<string, string> = {};
  for (const r of s.requests) {
    if (r.product_id !== productId || !r.page_number || !r.body.startsWith(APPROVED[what])) continue;
    const p = pages.get(r.page_number);
    if (!p?.art_id) continue;
    const since = [p.art_at, what === "layout" ? p.text_final_at : "", layoutAt].filter(Boolean).sort().pop() ?? "";
    if (since && r.created_at < since) continue;
    if (!out[r.page_number] || r.created_at > out[r.page_number]) out[r.page_number] = r.created_at;
  }
  return out;
}
