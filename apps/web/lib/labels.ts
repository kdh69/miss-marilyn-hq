/** Plain-English words for Sheet codes. Safe for client components (no server imports). */

export const WHO: Record<string, string> = {
  mom: "Clara", kyle: "Kyle", orchestrator: "Team", story_producer: "Story writer", illustrator: "Artist",
  builder: "Layout", publisher: "Publisher", growth: "Marketing", scout: "Scout", quality_checker: "Quality Checker", backend: "System",
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

export const PRODUCT_STATUS: Record<string, string> = { concept: "Idea", in_production: "In the works", paused: "On pause", live: "On sale", retired: "Retired" };

export const MOM_ITEM: Record<string, string> = { approve: "Approve", photos: "Send photos", rewrite: "Make the words yours", kdp_publish: "OK to publish" };

export const ACCOUNT_STATUS: Record<string, string> = { todo: "To do", in_progress: "In progress", waiting: "Waiting", done: "Done", not_needed: "Not needed" };

export const CHANNEL: Record<string, string> = {
  KDP: "Amazon KDP", ETSY: "Etsy", SHOPIFY: "Shopify", POD: "Print on demand", AMZ_MERCH: "Amazon Merch",
  PINTEREST: "Pinterest", INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", EMAIL: "Email",
};

/**
 * How a book gets made, as Clara works it: Idea → Script → Illustrations → Building → Full book
 * review. Each step owns some task types and has its own page in her panel.
 */
export const STAGE_TRACK: { key: string; label: string; short: string; href: string; types: string[]; blurb: string }[] = [
  { key: "idea", label: "Idea", short: "Idea", href: "/ideas", types: ["book_plan"], blurb: "Jot it down; the team turns it into a plan." },
  { key: "script", label: "Script", short: "Script", href: "/script", types: ["story_draft"], blurb: "Read the script, make the words yours, then approve it." },
  { key: "art", label: "Illustrations", short: "Art", href: "/art", types: ["art_page", "art_cover"], blurb: "The approved script gets its pictures. Look them over and approve the cover." },
  { key: "build", label: "Building", short: "Build", href: "/build", types: ["interior_layout", "cover_wrap", "printable_set"], blurb: "Words and pictures are put together into the printed book and its cover." },
  { key: "review", label: "Full book review", short: "Review", href: "/review", types: ["kdp_packet", "etsy_listing"], blurb: "Read the finished book start to finish, then give the final OK." },
];
export const stageOfType = (type = "") => STAGE_TRACK.find((st) => st.types.includes(type));

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

/** Kinds of idea. The prefix leads the request text so the team (and the filters) know what it is. */
export const IDEA_KINDS: { id: string; label: string; emoji: string; prefix: string; placeholder: string }[] = [
  { id: "book", label: "Book", emoji: "📖", prefix: "New book idea: ", placeholder: "What happens in it? A line or two is plenty." },
  { id: "printable", label: "Printable", emoji: "🖍️", prefix: "Printable idea: ", placeholder: "Coloring pages, activity sheets, a chart…" },
  { id: "merch", label: "Merch", emoji: "👕", prefix: "Merch idea: ", placeholder: "A shirt, a mug, a plush Miss Marilyn…" },
  { id: "social", label: "Social", emoji: "📣", prefix: "Social idea: ", placeholder: "A post, a reel, something to share…" },
  { id: "business", label: "Business", emoji: "💼", prefix: "Business idea: ", placeholder: "A shop, a partner, a price, a plan…" },
  { id: "other", label: "Anything", emoji: "💡", prefix: "", placeholder: "Anything at all — the team sorts it out." },
];

/** Which kind an idea is, from how its text starts. */
export function ideaKind(body = "") {
  return IDEA_KINDS.find((k) => k.prefix && body.toLowerCase().startsWith(k.prefix.trim().toLowerCase()))?.id ?? "other";
}

/** Series names for each product line. */
export const LINE: Record<string, string> = { OL: "Ollie's Firsts", MM: "The Adventures of Miss Marilyn" };

/** "Ollie's Firsts · Book 1" — the series and book number, when the Sheet has them. */
export const bookNumber = (p?: Record<string, string>) =>
  p ? [LINE[p.line] ?? p.line, p.series_no ? `Book ${p.series_no}` : ""].filter(Boolean).join(" · ") : "";
