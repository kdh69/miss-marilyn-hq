/** Plain-English words for Sheet codes. Safe for client components (no server imports). */

export const WHO: Record<string, string> = {
  mom: "Clara", kyle: "Kyle", orchestrator: "Team", story_producer: "Story writer", illustrator: "Artist",
  builder: "Layout", publisher: "Publisher", growth: "Marketing", scout: "Scout", backend: "System",
};

export const KIND: Record<string, string> = { note: "Note", change: "Change", idea: "Idea", question: "Question", rule: "House rule" };

export const REQUEST_STATUS: Record<string, string> = { new: "New", seen: "Seen", in_progress: "Team is on it", done: "Done", wont_do: "Not doing" };

/** Task status → what Clara reads. Kyle's view shows the raw code next to it. */
export const TASK_STATUS: Record<string, string> = {
  todo: "Queued", in_progress: "Working on it", blocked: "Stuck", ready_for_qc: "Waiting for a check", in_qc: "Being checked",
  qc_fail: "Fixing", escalated: "Kyle is looking", awaiting_mom: "Needs you", changes_requested: "Making your changes",
  approved: "Approved", publishing: "Publishing", done: "Done", cancelled: "Cancelled",
};

export const TASK_TYPE: Record<string, string> = {
  book_plan: "Book plan", story_draft: "Story", art_page: "Page art", art_cover: "Cover art", interior_layout: "Inside layout",
  cover_wrap: "Cover layout", printable_set: "Printables", kdp_packet: "Amazon listing", etsy_listing: "Etsy listing",
  social_batch: "Social posts", email: "Email", lead_magnet: "Freebie", photo_request: "Photos of Miss M", dryrun: "Test run",
};

export const PRODUCT_STATUS: Record<string, string> = { concept: "Idea", in_production: "In the works", live: "On sale", retired: "Retired" };

export const MOM_ITEM: Record<string, string> = { approve: "Approve", photos: "Send photos", rewrite: "Make the words yours", kdp_publish: "OK to publish" };

export const ACCOUNT_STATUS: Record<string, string> = { todo: "To do", in_progress: "In progress", waiting: "Waiting", done: "Done", not_needed: "Not needed" };

export const CHANNEL: Record<string, string> = {
  KDP: "Amazon KDP", ETSY: "Etsy", SHOPIFY: "Shopify", POD: "Print on demand", AMZ_MERCH: "Amazon Merch",
  PINTEREST: "Pinterest", INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", EMAIL: "Email",
};

/** The five stages a book moves through, in order, and the task types that belong to each. */
export const STAGE_TRACK: { key: string; label: string; types: string[] }[] = [
  { key: "story", label: "Story", types: ["book_plan", "story_draft"] },
  { key: "art", label: "Art", types: ["art_page", "art_cover"] },
  { key: "layout", label: "Layout", types: ["interior_layout", "cover_wrap", "printable_set"] },
  { key: "publish", label: "Publish", types: ["kdp_packet", "etsy_listing"] },
  { key: "live", label: "On sale", types: [] },
];

export const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

/** Where to sign in for a service, matched on its name in the accounts tab. No passwords, just the door. */
const ACCOUNT_URLS: [match: string, url: string][] = [
  ["business gmail", "https://mail.google.com"],
  ["github", "https://github.com"],
  ["google cloud", "https://console.cloud.google.com"],
  ["anthropic", "https://console.anthropic.com"],
  ["grok", "https://grok.com"],
  ["vercel", "https://vercel.com/dashboard"],
  ["resend", "https://resend.com"],
  ["amazon kdp", "https://kdp.amazon.com"],
  ["etsy developer", "https://www.etsy.com/developers/your-apps"],
  ["etsy shop", "https://www.etsy.com/your/shops/me/dashboard"],
  ["meta business", "https://business.facebook.com"],
  ["pinterest business", "https://www.pinterest.com/business/hub/"],
  ["shopify", "https://admin.shopify.com"],
  ["amazon merch", "https://merch.amazon.com"],
];
export const accountUrl = (service = "") => ACCOUNT_URLS.find(([m]) => service.toLowerCase().includes(m))?.[1] ?? "";

/** Accounts phases, folded into the two groups Clara needs. */
export const SET_UP_NOW = ["now", "phase_0"];
