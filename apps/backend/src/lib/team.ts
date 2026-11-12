/**
 * The team's rules, in code. The makers (Claude agents, one per role) never touch the Sheet
 * directly: every read and write goes through `npm run bot`, which asks this module what a role
 * may do. Nothing here talks to Google, so the rules are unit-tested (tests/team.test.ts).
 *
 * What a role may write (spec §8, the old bot descriptions):
 *   orchestrator     tasks (never status here), products, skus, requests, lessons
 *   story_producer   pages: text_draft, art_brief, characters
 *   illustrator      pages: art_asset_id
 *   publisher        listings (draft, packet_ready)
 *   growth           plans and content (draft only)
 *   scout            research
 *   critic           lessons (not a Sheet role; it owns no tasks)
 *   every maker      its own assets rows
 * Statuses move only through `planMove`; the log is append-only and never written through `planOps`.
 */
import { randomBytes } from "node:crypto";
import { headersOf, isLegalTransition, schema, tabDef, type Row } from "@mm/core";

export const BOT_ROLES = ["orchestrator", "story_producer", "illustrator", "builder", "publisher", "growth", "quality_checker", "scout"] as const;
export type BotRole = (typeof BOT_ROLES)[number];
export const isBotRole = (r: string): r is BotRole => (BOT_ROLES as readonly string[]).includes(r);
/** Who may use `npm run bot` to write. The critic is not a Sheet role: it owns no tasks and only adds lessons. */
export type TeamRole = BotRole | "critic";
export const isTeamRole = (r: string): r is TeamRole => isBotRole(r) || r === "critic";

/** What the rules need from a snapshot of MM Core (`Core` fits). */
export type Board = { rows(tab: string): Row[]; config(key: string): string };

export type Op = { tab: string; id?: string; set: Record<string, unknown> };
export type Planned = { kind: "append" | "update"; tab: string; id: string; row: Partial<Row> };

type Grant = {
  append?: boolean;
  update?: boolean;
  /** Columns the role may set; default: every column the backend doesn't own. */
  columns?: string[];
  /** The only statuses the role may write, and the only ones an existing row may be in. */
  statuses?: string[];
};

const ASSET_COLS = ["asset_type", "page_number", "version", "file_url", "file_name", "rights_source", "rights_note", "made_with", "prompt_ref", "status"];
const OWN_ASSETS: Grant = { update: true, columns: ASSET_COLS };

const GRANTS: Record<TeamRole, Record<string, Grant>> = {
  orchestrator: {
    tasks: { append: true, update: true, columns: ["parent_task_id", "product_id", "sku", "task_type", "title", "brief", "input_refs", "owner", "priority", "due_date"] },
    products: { append: true, update: true },
    skus: { append: true, update: true },
    requests: { append: true, update: true },
    lessons: { append: true },
  },
  story_producer: { pages: { append: true, update: true, columns: ["product_id", "page_number", "text_draft", "art_brief", "characters"] }, assets: OWN_ASSETS },
  illustrator: { pages: { update: true, columns: ["art_asset_id"] }, assets: OWN_ASSETS },
  builder: { assets: OWN_ASSETS },
  publisher: { listings: { append: true, update: true, statuses: ["draft", "packet_ready"] }, assets: OWN_ASSETS },
  growth: { plans: { append: true, update: true, statuses: ["draft"] }, content: { append: true, update: true, statuses: ["draft"] }, assets: OWN_ASSETS },
  quality_checker: {},
  scout: { research: { append: true, statuses: ["new"] } },
  critic: { lessons: { append: true } },
};

/** New rows on these tabs always get their ID from the tool. */
const MINTED_ONLY = ["tasks", "requests", "lessons", "content", "research"];
/** Tabs where a paused or retired product closes its rows to the team (L-0009). */
const PRODUCT_WORK = ["tasks", "products", "skus", "pages", "listings", "plans", "content", "assets"];
/** Set by the tool on every write, never by a role. */
const STAMPS = ["created_at", "updated_at", "updated_by", "created_by"];
/** The backend and Clara hold a task in these; nobody edits it meanwhile. */
const HELD = ["in_qc", "awaiting_mom", "approved", "publishing"];
const PARKED = ["paused", "retired"];
export const MAX_IN_PROGRESS = 3;

const nyDay = (now: string) => new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const pad = (n: number, width: number) => String(n).padStart(width, "0");
const text = (v: unknown) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : v === null || v === undefined ? "" : String(v));

/** Columns a role could ever set on a tab: everything before the backend's columns, minus the stamps. */
export function writable(tab: string): string[] {
  const def = tabDef(tab);
  const headers = headersOf(def);
  const end = def.backendOnlyFrom ? headers.indexOf(def.backendOnlyFrom) : headers.length;
  return headers.slice(0, end).filter((h) => !STAMPS.includes(h));
}

export const parkedProducts = (board: Board) => new Set(board.rows("products").filter((p) => PARKED.includes(p.status)).map((p) => p.product_id));

/** The product a row belongs to, directly or through its SKU or task. */
export function productOf(board: Board, row: Partial<Row>): string {
  if (row.product_id) return row.product_id;
  if (row.sku) return board.rows("skus").find((s) => s.sku === row.sku)?.product_id ?? "";
  if (row.task_id) return board.rows("tasks").find((t) => t.task_id === row.task_id)?.product_id ?? "";
  return "";
}

/** Next ID after the highest one matching `pattern` (its first group is the number). */
export function nextId(ids: string[], pattern: RegExp, make: (n: number) => string): string {
  const last = Math.max(0, ...ids.map((id) => Number(id.match(pattern)?.[1] ?? 0)));
  return make(last + 1);
}

const MINT: Record<string, (ids: string[], row: Partial<Row>) => string> = {
  tasks: (ids) => nextId(ids.filter((id) => id !== "T-9999"), /^T-(\d{4})$/, (n) => `T-${pad(n, 4)}`),
  requests: (ids) => nextId(ids, /^R-(\d{4})$/, (n) => `R-${pad(n, 4)}`),
  lessons: (ids) => nextId(ids, /^L-(\d{4})$/, (n) => `L-${pad(n, 4)}`),
  // Counted within the task, so two Marketers on two tasks can't mint the same ID: C-T0043-01.
  content: (ids, row) => {
    const stem = `C-${(row.task_id ?? "").replace("-", "")}`;
    return nextId(ids, new RegExp(`^${stem}-(\\d+)$`), (n) => `${stem}-${pad(n, 2)}`);
  },
  research: (ids) => nextId(ids, /^RS-(\d{4})$/, (n) => `RS-${pad(n, 4)}`),
  plans: (ids, row) => nextId(ids, new RegExp(`^MP-${row.product_id}-(\\d+)$`), (n) => `MP-${row.product_id}-${pad(n, 2)}`),
  listings: (_ids, row) => `${row.sku}-${row.channel}`,
};

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const randomChars = (n: number) => Array.from(randomBytes(n), (b) => BASE36[b % 36]).join("");
const stamp = (now: Date) => now.toISOString().replace(/\.\d{3}Z$/, "").replace(/\D/g, ""); // yyyymmddHHMMSS, UTC
const mintedHere = new Set<string>();

/** An ID no other process can mint at the same moment: a time stamp and random characters, never "highest + 1". */
function unique(ids: string[], make: () => string): string {
  for (;;) {
    const id = make();
    if (ids.includes(id) || mintedHere.has(id)) continue;
    mintedHere.add(id);
    return id;
  }
}

/** `A-T0026-<HHMMSS><2 random chars>`: per task, and safe when two uploads to one task overlap. */
export const mintAssetId = (ids: string[], taskId: string, now = new Date(), rand: (n: number) => string = randomChars) =>
  unique(ids, () => `A-${taskId.replace("-", "")}-${stamp(now).slice(8)}${rand(2)}`);

/** `C-<yyyymmddHHMMSS>-<4 random base36 chars>`: costs rows are appended by every maker, in parallel. */
export const mintCostId = (ids: string[] = [], now = new Date(), rand: (n: number) => string = randomChars) =>
  unique(ids, () => `C-${stamp(now)}-${rand(4)}`);

/**
 * Checks a batch of row writes for a role and resolves it into appends and updates with IDs,
 * defaults and stamps filled in. Throws one error listing every problem, so nothing is written
 * unless the whole batch is allowed.
 */
export function planOps(board: Board, role: TeamRole, ops: Op[], now: string): Planned[] {
  const errs: string[] = [];
  const planned: Planned[] = [];
  const parked = parkedProducts(board);
  const minted = new Map<string, string[]>();
  const idsOf = (tab: string) => [...board.rows(tab).map((r) => r[tabDef(tab).id!]), ...(minted.get(tab) ?? [])];

  ops.forEach((op, i) => {
    const at = `#${i + 1} ${op?.tab ?? ""}${op?.id ? ` ${op.id}` : ""}`;
    const fail = (why: string) => void errs.push(`${at}: ${why}`);
    if (!op || typeof op !== "object" || Array.isArray(op)) return fail('each entry is { "tab": …, "id"?: …, "set": { … } }');
    const grant = GRANTS[role][op?.tab];
    if (!grant) return fail(`${role} can't write ${op?.tab ?? "(no tab)"}`);
    if (op.tab === "assets" && !op.id) return fail("new files are registered with `upload` or `asset`");
    const def = tabDef(op.tab);
    const set: Row = Object.fromEntries(Object.entries(op.set ?? {}).map(([k, v]) => [k, text(v)]));
    const existing = op.id ? board.rows(op.tab).find((r) => r[def.id!] === op.id) : undefined;

    const allowed = grant.columns ?? writable(op.tab);
    for (const col of Object.keys(set)) {
      if (col === def.id && (!existing || set[col] === op.id)) continue;
      if (!allowed.includes(col)) fail(`${col} isn't ${role}'s to set`);
    }
    if (op.tab === "requests" && "from" in set && set.from !== existing?.from) fail("from isn't settable: the tool fills it with the role that wrote the request");
    for (const [col, list] of Object.entries(def.dropdowns ?? {})) {
      if (set[col] && !schema.lists[list].includes(set[col])) fail(`${col}="${set[col]}" isn't in ${list} (${schema.lists[list].join(", ")})`);
    }

    const row: Partial<Row> = { ...set };
    if (existing) {
      if (!grant.update) return fail(`${role} can't change existing ${op.tab} rows`);
      delete row[def.id!];
    } else {
      if (!grant.append) return fail(op.id ? `no ${op.tab} row ${op.id}` : `${role} can't add ${op.tab} rows`);
      if (op.id && MINTED_ONLY.includes(op.tab)) return fail(`no ${op.tab} row ${op.id}; a new row gets its id from the tool, so leave id out`);
      if (op.id && def.id && !row[def.id]) row[def.id] = op.id; // "id" on a new row is its ID column
      defaults(board, role, op.tab, row, now, fail);
      const id = MINTED_ONLY.includes(op.tab) ? MINT[op.tab](idsOf(op.tab), row) : (op.id ?? row[def.id!] ?? MINT[op.tab]?.(idsOf(op.tab), row));
      if (!id || /undefined/.test(id)) return fail(`needs an id (${def.id})`);
      if (idsOf(op.tab).includes(id)) return fail(`${def.id} ${id} already exists`);
      row[def.id!] = id;
      minted.set(op.tab, [...(minted.get(op.tab) ?? []), id]);
    }

    const after = { ...existing, ...row };
    if (grant.statuses) {
      if (existing && !grant.statuses.includes(existing.status)) fail(`is ${existing.status}; ${role} only edits ${grant.statuses.join(" / ")} rows`);
      if (after.status && !grant.statuses.includes(after.status)) fail(`status "${after.status}" isn't ${role}'s to set (${grant.statuses.join(", ")})`);
    }
    const product = productOf(board, after);
    if (PRODUCT_WORK.includes(op.tab) && parked.has(product)) fail(`${product} is paused or retired`);
    rules(board, role, op.tab, existing, row, after, fail);

    if (headersOf(def).includes("updated_at")) Object.assign(row, { updated_at: now, updated_by: role });
    planned.push({ kind: existing ? "update" : "append", tab: op.tab, id: existing ? op.id! : row[def.id!]!, row });
  });

  if (errs.length) throw new Error(`Nothing written:\n  ${errs.join("\n  ")}`);
  return planned;
}

/** Defaults and tool-set fields for a new row. */
function defaults(board: Board, role: TeamRole, tab: string, row: Partial<Row>, now: string, fail: (why: string) => void) {
  const headers = headersOf(tabDef(tab));
  if (headers.includes("created_at")) row.created_at = now;
  if (headers.includes("created_by")) row.created_by = role;
  const need = (...cols: string[]) => cols.filter((c) => !row[c]?.trim()).forEach((c) => fail(`${c} is required`));

  if (tab === "tasks") {
    need("product_id", "task_type", "title", "brief");
    const type = board.rows("task_types").find((t) => t.task_type === row.task_type);
    row.owner ||= type?.default_owner ?? "";
    row.priority ||= "P2";
    row.status = "todo";
  } else if (tab === "requests") {
    need("to", "body");
    Object.assign(row, { from: role, kind: row.kind || "question", status: "new" });
  } else if (tab === "lessons") {
    need("applies_to", "rule");
    Object.assign(row, { date: nyDay(now), source: row.source || "qc_fail", status: "active" });
  } else if (tab === "products") {
    need("product_id", "line", "title");
    row.status ||= "concept";
  } else if (tab === "skus") {
    need("sku", "product_id", "format");
    row.status ||= "draft";
  } else if (tab === "pages") {
    need("page_id", "product_id", "page_number");
  } else if (tab === "listings") {
    need("sku", "channel");
    row.status ||= "draft";
  } else if (tab === "plans") {
    need("product_id", "task_id", "section", "title");
    row.status = "draft";
  } else if (tab === "content") {
    need("product_id", "task_id", "channel", "content_type", "scheduled_for");
    row.status = "draft";
  } else if (tab === "research") {
    need("topic", "research_type", "finding", "confidence");
    Object.assign(row, { date: row.date || nyDay(now), status: "new" });
  }
}

/** Per-tab rules that aren't a column list or a dropdown. */
function rules(board: Board, role: TeamRole, tab: string, existing: Row | undefined, row: Partial<Row>, after: Partial<Row>, fail: (why: string) => void) {
  const product = (id = "") => board.rows("products").find((p) => p.product_id === id);
  if (tab === "tasks") {
    if (!product(after.product_id)) fail(`no product ${after.product_id}`);
    if (existing && HELD.includes(existing.status)) fail(`is ${existing.status}: the backend or Clara has it`);
    if (after.owner && !isBotRole(after.owner) && after.owner !== "mom") fail(`owner "${after.owner}" isn't on the team`);
  } else if (tab === "requests") {
    if (!existing && !["mom", "kyle"].includes(after.to ?? "")) fail("the Orchestrator's own requests go to mom or kyle");
    // A reply belongs to whoever the request is addressed to, never to the one who wrote it.
    if (("reply" in row || "reply_by" in row) && after.to !== role) fail(`reply and reply_by are for ${after.to || "the person it is addressed to"} to fill in, not ${role}`);
    if (existing && existing.from !== role) {
      for (const col of Object.keys(row)) if (!["status", "task_id", "reply", "reply_by"].includes(col)) fail(`${col}: on someone else's request only status and task_id change`);
    }
  } else if (tab === "lessons") {
    const who = ["all", ...schema.lists.role, ...schema.lists.task_type];
    if (!who.includes(after.applies_to ?? "")) fail(`applies_to must be a role, a task type or all`);
    if (after.source === "kyle") fail("source kyle is Kyle's (npm run lesson)");
  } else if (tab === "products") {
    if (!existing && after.status !== "concept") fail("a new product starts as concept");
    if (row.status && PARKED.includes(row.status)) fail("only Kyle pauses or retires a product");
    if (after.product_id && after.line && !after.product_id.startsWith(`${after.line}-`)) fail(`product_id must start with its line (${after.line}-)`);
  } else if (tab === "skus") {
    if (!product(after.product_id)) fail(`no product ${after.product_id}`);
  } else if (tab === "pages") {
    if (!product(after.product_id)) fail(`no product ${after.product_id}`);
    if (after.page_id && !after.page_id.toLowerCase().startsWith(`${(after.product_id ?? "").toLowerCase()}-p`)) fail("page_id is {product_id}-p{nn}");
    if (row.art_asset_id && !board.rows("assets").some((a) => a.asset_id === row.art_asset_id)) fail(`no asset ${row.art_asset_id}`);
  } else if (tab === "listings") {
    if (!board.rows("skus").some((s) => s.sku === after.sku)) fail(`no sku ${after.sku}`);
  } else if (tab === "content") {
    if (after.scheduled_for && !/^\d{4}-\d{2}-\d{2}$/.test(after.scheduled_for)) fail("scheduled_for is YYYY-MM-DD");
  } else if (tab === "assets") {
    if (existing?.created_by !== role) fail(`belongs to ${existing?.created_by || "someone else"}`);
    // After the hand-in the files are QC's, Clara's and the backend's to judge: a maker edits its own only while the work is open.
    const owner = board.rows("tasks").find((t) => t.task_id === existing?.task_id);
    if (existing && !["in_progress", "blocked"].includes(owner?.status ?? "")) fail(`${existing.task_id} is ${owner?.status ?? "not on the board"}; a file is edited only while its task is in_progress or blocked`);
  }
}

export type Move = "start" | "block" | "handin" | "todo" | "cancel";
export type MovePlan = { from: string; to: string; patch: Partial<Row>; message: string };

/** The latest Quality Checker verdict since the task last went back into work, if any. */
export function latestReview(board: Board, taskId: string): { pass: boolean; message: string; fails: number } | undefined {
  const rows = board.rows("log").filter((l) => l.task_id === taskId);
  const entered = rows.map((l) => l.to_status === "in_progress" && l.from_status !== "in_progress").lastIndexOf(true);
  const reviews = rows.slice(entered + 1).filter((l) => l.actor === "quality_checker" && /^review (pass|fail)/i.test(l.message));
  const last = reviews.at(-1);
  return last && { pass: /^review pass/i.test(last.message), message: last.message, fails: reviews.filter((r) => /^review fail/i.test(r.message)).length };
}

export const idList = (s = "") => s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);

/** A week of posts hands in the pictures its posts use: the asset IDs on its content rows. */
export function postAssets(board: Board, task: Row): string[] {
  return [...new Set(board.rows("content").filter((c) => c.task_id === task.task_id).flatMap((c) => idList(c.asset_ids)))];
}

/** Why a task's hand-in would bounce at the QC gate's completeness check, or "". */
export function missingOutput(board: Board, task: Row, ids = idList(task.output_asset_ids)): string {
  const assets = new Map(board.rows("assets").map((a) => [a.asset_id, a]));
  const missing = ids.filter((id) => !assets.get(id)?.file_url);
  if (missing.length) return `no file_url on ${missing.join(",")}`;
  if (ids.length) return "";
  if (task.task_type === "marketing_plan") return board.rows("plans").some((p) => p.task_id === task.task_id) ? "" : "no plans rows with this task_id";
  return "output_asset_ids is empty: upload the files first";
}

/**
 * One status change by a role (spec §6): who may make it, from where, and what has to be true
 * first. `note` is the log message: the reason for a block, the self-check for a hand-in.
 */
export function planMove(board: Board, role: TeamRole, taskId: string, move: Move, note: string): MovePlan {
  const task = board.rows("tasks").find((t) => t.task_id === taskId);
  if (!task) throw new Error(`no task ${taskId}`);
  const type = board.rows("task_types").find((t) => t.task_type === task.task_type);
  const needsQc = type?.needs_qc === "TRUE";
  const no = (why: string) => new Error(`${taskId} (${task.status}): ${why}`);

  if (board.config("system_status") === "HALT") throw no("system_status is HALT; nothing moves until Kyle sets RUN");
  if (move !== "cancel" && parkedProducts(board).has(task.product_id)) throw no(`${task.product_id} is paused or retired`);
  const planner = move === "todo" || move === "cancel";
  // The Orchestrator may also hold someone else's task (todo → blocked, with the reason); `todo` releases it.
  const holds = move === "block" && role === "orchestrator";
  if (planner && role !== "orchestrator") throw no(`only the Orchestrator sends a task back to todo or cancels it`);
  if (!planner && !holds && task.owner !== role) throw no(`it's ${task.owner}'s task, not ${role}'s`);

  // Cancelling closes work that has been judged or is with the backend or Clara: that is Kyle's call (npm run task).
  if (move === "cancel" && ["done", ...HELD].includes(task.status)) throw no(`${task.status} work isn't cancelled by the team: ask Kyle (npm run task -- ${taskId} cancelled "<why>")`);

  const to = move === "start" ? "in_progress" : move === "block" ? "blocked" : move === "todo" ? "todo" : move === "cancel" ? "cancelled" : needsQc ? "ready_for_qc" : "done";
  if (!isLegalTransition("bot", task.status, to, { needsQc }) || task.status === to) throw no(`${task.status} → ${to} isn't a move the team can make`);
  if (move !== "start" && !note.trim()) throw no(move === "handin" ? 'add the self-check line: "self-check: …"' : "say why in one line");

  const patch: Partial<Row> = { status: to };
  if (move === "start") {
    const parked = parkedProducts(board); // a paused book's work doesn't count, as on the board
    const busy = board.rows("tasks").filter((t) => t.owner === role && t.status === "in_progress" && !parked.has(t.product_id)).length;
    if (busy >= MAX_IN_PROGRESS) throw no(`${role} already has ${busy} tasks in progress (max ${MAX_IN_PROGRESS})`);
    patch.blocked_reason = "";
  }
  if (move === "block") patch.blocked_reason = note.trim();
  if (move === "todo") {
    // The reason travels with the task: QC's notes or Clara's note go into the brief once.
    const why = task.status === "qc_fail" ? `QC FAIL (attempt ${task.qc_attempts || 1}): ${task.qc_notes}`
      : task.status === "changes_requested" ? `CLARA ASKED FOR CHANGES: ${task.mom_note}` : "";
    if (why && !task.brief.includes(why)) patch.brief = `${why}\n\n${task.brief}`;
    patch.blocked_reason = "";
  }
  if (move === "handin") {
    if (needsQc) {
      const own = idList(task.output_asset_ids);
      const ids = own.length || task.task_type !== "social_batch" ? own : postAssets(board, task);
      const gap = missingOutput(board, task, ids);
      if (gap) throw no(gap);
      if (!own.length && ids.length) patch.output_asset_ids = ids.join(",");
      if (!/^self-check/i.test(note.trim())) throw no('the hand-in note starts "self-check:" and lists what you checked (L-0012)');
      const review = latestReview(board, taskId);
      if (!review) throw no("no Quality Checker review since work started (L-0013)");
      if (!review.pass) throw no(`the Quality Checker's latest verdict is a fail: fix it and get a new review (${review.message.slice(0, 120)})`);
    }
  }
  return { from: task.status, to, patch, message: note.trim() };
}

/** A Quality Checker verdict: a log row that leaves the status alone. */
export function planReview(board: Board, taskId: string, verdict: string, notes: string): { status: string; message: string; fails: number } {
  const task = board.rows("tasks").find((t) => t.task_id === taskId);
  if (!task) throw new Error(`no task ${taskId}`);
  if (verdict !== "pass" && verdict !== "fail") throw new Error(`verdict is pass or fail, got "${verdict}"`);
  if (task.status !== "in_progress") throw new Error(`${taskId} is ${task.status}; reviews happen while it's in_progress`);
  if (!notes.trim()) throw new Error(verdict === "pass" ? "say what you checked" : "list exactly what to fix, numbered");
  const fails = (latestReview(board, taskId)?.fails ?? 0) + (verdict === "fail" ? 1 : 0);
  return { status: task.status, message: `review ${verdict}: ${notes.trim()}`, fails };
}

/** Whether an upload becomes the page's picture (pages.art_asset_id): the colour page art only, never its ink line layer. */
export function isPagePicture(role: string, assetType: string, opts: Record<string, string>, fileName = ""): boolean {
  if (role !== "illustrator" || assetType !== "page_art" || !opts.page) return false;
  return !/ink|lines?$/i.test(opts.version ?? "") && !/[_-]ink\b/i.test(fileName);
}

/** A sweep that began longer ago than this is taken as crashed, and a new one may start. */
export const SWEEP_LOCK_MINUTES = 90;
export const SWEEP_KEY = "sweep_started_at";

/** What the sweep lock says now: "" when free, else who holds it and how long ago it began. */
export function sweepHeldBy(board: Board, nowMs: number): { since: string; minutes: number } | undefined {
  const since = board.config(SWEEP_KEY).trim();
  const began = Date.parse(since);
  if (!since || Number.isNaN(began)) return undefined;
  const minutes = Math.floor((nowMs - began) / 60_000);
  return minutes < SWEEP_LOCK_MINUTES ? { since, minutes } : undefined;
}

/**
 * `sweep start` writes config!sweep_started_at; `sweep end` clears it. A start is refused while another sweep began
 * under 90 minutes ago and hasn't ended: one Orchestrator at a time, because it is the only minter of task and request IDs.
 */
export function planSweep(board: Board, action: string, nowMs: number): { value: string; message: string } {
  if (action === "end") return { value: "", message: "sweep ended: the lock is clear" };
  if (action !== "start") throw new Error('usage: sweep start | sweep end');
  const held = sweepHeldBy(board, nowMs);
  if (held) {
    throw new Error(`a sweep began at ${held.since} (${held.minutes} minutes ago) and hasn't ended. Two Orchestrators would mint the same task IDs: wait for it, or ask Kyle to clear config!${SWEEP_KEY} if it crashed (a lock older than ${SWEEP_LOCK_MINUTES} minutes is ignored)`);
  }
  return { value: new Date(nowMs).toISOString().replace(/\.\d{3}Z$/, "Z"), message: "sweep started: nothing else may run an Orchestrator until `sweep end`" };
}
