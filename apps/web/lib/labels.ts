/** Plain-English names for schema values. Safe to import from client components. */

export const STATUS: Record<string, string> = {
  todo: "Queued", in_progress: "Working", blocked: "Stuck", ready_for_qc: "Waiting for check", in_qc: "Being checked",
  qc_fail: "Fixing", escalated: "Kyle looking", awaiting_mom: "Needs you", changes_requested: "Making your changes",
  approved: "Approved", publishing: "Publishing", done: "Done", cancelled: "Cancelled",
};

/** The Progress board: each task status lands in one column. */
export const BOARD: { id: string; label: string; statuses: string[]; tone: string }[] = [
  { id: "queued", label: "Queued", statuses: ["todo"], tone: "bg-black/20" },
  { id: "working", label: "Working", statuses: ["in_progress", "qc_fail", "changes_requested"], tone: "bg-orange-500" },
  { id: "checking", label: "Being checked", statuses: ["ready_for_qc", "in_qc"], tone: "bg-violet-500" },
  { id: "you", label: "Needs you", statuses: ["awaiting_mom", "approved", "publishing"], tone: "bg-orange-600" },
  { id: "stuck", label: "Stuck", statuses: ["blocked", "escalated"], tone: "bg-rose-500" },
];

/** The seven Grok bots plus the humans and the backend, as they appear in the panel. */
export const ROLE: Record<string, { name: string; job: string; bot?: true; color: string }> = {
  orchestrator: { name: "Orchestrator", job: "Plans the work and hands it out", bot: true, color: "#ea580c" },
  story_producer: { name: "Story", job: "Writes and revises the stories", bot: true, color: "#8b5cf6" },
  illustrator: { name: "Art", job: "Draws pages and covers", bot: true, color: "#db2777" },
  builder: { name: "Builder", job: "Lays out interiors, covers and printables", bot: true, color: "#0d9488" },
  publisher: { name: "Publisher", job: "Prepares KDP packets and Etsy listings", bot: true, color: "#2563eb" },
  growth: { name: "Growth", job: "Pins, posts and emails", bot: true, color: "#65a30d" },
  scout: { name: "Scout", job: "Watches trends and keywords", bot: true, color: "#ca8a04" },
  mom: { name: "Clara", job: "Owner", color: "#ea580c" },
  kyle: { name: "Kyle", job: "Runs the system", color: "#6b6475" },
  backend: { name: "System", job: "Checks quality and keeps things safe", color: "#6b6475" },
};
export const BOTS = Object.keys(ROLE).filter((k) => ROLE[k].bot);
export const who = (role = "") => ROLE[role]?.name ?? role;

export const STAGE_LABEL: Record<string, string> = {
  story_draft: "Story", art_page: "Page art", art_cover: "Cover art", interior_layout: "Layout", cover_wrap: "Cover wrap", kdp_packet: "KDP packet",
};

export const CHANNEL: Record<string, string> = {
  KDP: "Amazon KDP", ETSY: "Etsy", SHOPIFY: "Shop", POD: "Print on demand", AMZ_MERCH: "Merch", PINTEREST: "Pinterest",
  INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", EMAIL: "Email",
};

/** "3h ago", "yesterday", "Oct 12". */
export function ago(iso: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  if (m < 60 * 48) return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

/** "Tue, Oct 28" from a YYYY-MM-DD or ISO string. */
export function dayLabel(d: string) {
  if (!d) return "";
  const date = new Date(d.length === 10 ? `${d}T12:00:00Z` : d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });
}
