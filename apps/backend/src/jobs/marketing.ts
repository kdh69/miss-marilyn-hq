/**
 * Marketing, after the book (Launch step and Social page). Runs right after Clara sync, so her
 * answers from this tick are already applied:
 *  1. Her approvals reach the rows they cover: an approved kdp_packet / etsy_listing approves its
 *     listings row, an approved social_batch approves its posts, an approved marketing_plan approves
 *     its plan rows and retires the book's older plan. A rejected batch's posts are killed.
 *  2. Her marks from the panel ("Posted C-… <link>", "Live L-… <link>" notes in requests) set
 *     content → posted and listings → live with the link (backend-only columns).
 *  3. Autopilot (config social_autopilot, ON by default): once a book reaches Building, ask the
 *     Orchestrator for a marketing plan; once the plan is approved, ask for the next week of posts
 *     whenever fewer than 7 days are queued. One open ask per book at a time; bots do the writing.
 */
import { Core, nowIso, type Row } from "@mm/core";

const nyDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const OPEN = (status: string) => !["done", "cancelled"].includes(status);
const CHANNEL: Record<string, string> = { kdp_packet: "KDP", etsy_listing: "ETSY" };

/** "Posted C-0012 https://…" / "Live L-0003 https://…": what the panel writes when Clara marks one. */
export const MARK = /^(Posted|Live) (\S+)(?: (\S+))?/;

export async function marketing(core: Core, only?: (product: Row) => boolean): Promise<void> {
  const products = core.rows("products").filter((p) => !only || only(p));
  const ids = new Set(products.map((p) => p.product_id));
  await applyApprovals(core, ids);
  await applyMarks(core, ids);
  if ((core.config("social_autopilot") || "ON").trim().toUpperCase() === "ON") await autopilot(core, products);
}

async function applyApprovals(core: Core, ids: Set<string>) {
  for (const t of core.rows("tasks")) {
    if (!ids.has(t.product_id)) continue;
    const yes = t.mom_decision === "Approve" && ["approved", "done"].includes(t.status);
    const no = t.mom_decision === "Reject" && t.status === "cancelled";
    if (!yes && !no) continue;

    if (t.task_type === "social_batch") {
      for (const c of core.rows("content").filter((c) => c.task_id === t.task_id && c.status === "draft")) {
        await core.update("content", c.content_id, { status: yes ? "approved" : "killed" });
      }
    } else if (t.task_type in CHANNEL) {
      // The Lister puts its task_id on the row; older rows without one match by SKU and channel.
      const rows = core.rows("listings").filter((l) => ["draft", "packet_ready"].includes(l.status) &&
        (l.task_id ? l.task_id === t.task_id : l.sku === t.sku && l.channel === CHANNEL[t.task_type]));
      for (const l of rows) await core.update("listings", l.listing_id, { status: yes ? "approved" : "retired" });
    } else if (t.task_type === "marketing_plan") {
      for (const p of core.rows("plans").filter((p) => p.task_id === t.task_id && p.status === "draft")) {
        await core.update("plans", p.plan_id, { status: yes ? "approved" : "retired" });
      }
      if (yes) {
        for (const p of core.rows("plans").filter((p) => p.product_id === t.product_id && p.task_id !== t.task_id && p.status === "approved")) {
          await core.update("plans", p.plan_id, { status: "retired" });
        }
      }
    }
  }
}

async function applyMarks(core: Core, ids: Set<string>) {
  for (const r of core.rows("requests")) {
    const m = r.kind === "note" && ids.has(r.product_id) ? r.body.match(MARK) : null;
    if (!m) continue;
    const [, what, id, link = ""] = m;
    if (what === "Posted") {
      const c = core.rows("content").find((x) => x.content_id === id);
      if (c && c.status !== "posted") await core.update("content", id, { status: "posted", posted_url: link });
    } else {
      const l = core.rows("listings").find((x) => x.listing_id === id);
      if (l && l.status !== "live") await core.update("listings", id, { status: "live", live_url: link, published_at: r.created_at || nowIso() });
    }
  }
}

async function autopilot(core: Core, products: Row[]) {
  const today = nyDay();
  const asked = (pid: string, prefix: string) => core.rows("requests").some((r) =>
    r.product_id === pid && r.to === "orchestrator" && r.body.startsWith(prefix) && !["done", "wont_do"].includes(r.status));
  const ask: Partial<Row>[] = [];
  const stamp = nowIso().replace(/\D/g, "").slice(0, 14);

  for (const p of products.filter((p) => ["in_production", "live"].includes(p.status))) {
    const id = p.product_id;
    const tasks = core.rows("tasks").filter((t) => t.product_id === id && t.status !== "cancelled");
    const building = p.status === "live" || tasks.some((t) => ["interior_layout", "cover_wrap", "kdp_packet"].includes(t.task_type));
    if (!building) continue;

    if (!tasks.some((t) => t.task_type === "marketing_plan")) {
      if (!asked(id, "Marketing plan:")) {
        ask.push({ product_id: id, body: `Marketing plan: ${p.title} (${id}) has reached Building. Create a marketing_plan task for Marketer: plans rows covering Instagram, Facebook, Pinterest and TikTok, paced for about 15 minutes a day of Clara's time, with launch rows for before, launch week and after (rubric marketing_plan).` });
      }
      continue;
    }
    if (!core.rows("plans").some((x) => x.product_id === id && x.status === "approved")) continue;
    if (tasks.some((t) => t.task_type === "social_batch" && OPEN(t.status)) || asked(id, "Social idea:")) continue;

    const queued = core.rows("content")
      .filter((c) => c.product_id === id && ["draft", "approved", "scheduled"].includes(c.status) && c.scheduled_for.slice(0, 10) >= today)
      .map((c) => c.scheduled_for.slice(0, 10)).sort();
    const last = queued[queued.length - 1] ?? "";
    if (last >= addDays(today, 6)) continue; // 7 days or more queued, today included
    const from = last ? addDays(last, 1) : today;
    ask.push({ product_id: id, body: `Social idea: posts for ${p.title} (${id}), ${from} to ${addDays(from, 6)}, following its approved marketing plan. One social_batch task for Marketer; one content row per post, ready to paste: hook, body, hashtags, asset_ids, link_url with UTMs, notes.` });
  }

  if (!ask.length) return;
  const now = nowIso();
  await core.append("requests", ask.map((a, i) => ({
    request_id: `Q-${stamp}-${90 + i}`, created_at: now, from: "backend", to: "orchestrator", kind: "idea",
    status: "new", updated_at: now, updated_by: "backend", ...a,
  })));
  console.log(`  asked the Orchestrator for: ${ask.map((a) => a.body!.split(":")[0] + ` ${a.product_id}`).join(", ")}`);
}
