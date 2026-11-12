/**
 * Two gates taken from the videograph repo, as pure functions over a snapshot of MM Core:
 *  - planImage: the budget gate in front of every paid picture (its ledger: check before the
 *    call, record after it), with a retry limit per image.
 *  - verifyClaim: an agent's report is checked against the Sheet before anyone acts on it
 *    (its Stop-hook verifier: trust the manifest, not the report).
 */
import type { Row } from "@mm/core";
import { idList, latestReview, missingOutput, postAssets, type Board } from "./team";

/** The slice of a book format (formats/*.json) that decides what a picture costs and how often it may be retried. */
export type ImageRules = {
  kinds: Record<string, { model: string; resolution: string; aspect: string; fitToPage: boolean }>;
  models: Record<string, { name: string; endpoint: string; maxRefs: number; usd: Record<string, number> }>;
  /** Live paid attempts at one picture within a round (since its task last went in_progress). */
  maxAttemptsPerImage: number;
  /** Rows of any kind, failures and releases included, at one picture, ever: then only a person decides. Default 6. */
  maxAttemptsLifetime?: number;
  /** What a task may spend per picture it covers, per kind. Default 3.5 x the kind's price. */
  perImageCapUsd?: Record<string, number>;
  /** A task covering more pictures than this is refused, so a budget can't grow by inventing names. Default 26. */
  maxPicturesPerTask?: number;
};
export type ImagePlan = {
  model: ImageRules["models"][string]; resolution: string; aspect: string; fitToPage: boolean;
  usd: number;
  /** This picture's lifetime number: every row at it so far, plus this one. It is what the costs note says. */
  attempt: number; lifetime: number; lifetimeLimit: number;
  /** Live attempts in this round, counting this one, and the round's limit. */
  round: number; roundLimit: number;
  /** The task's budget for this kind of picture: what it has spent, what it may spend, and how many pictures that covers. */
  budget: { spent: number; allowed: number; pictures: number };
  note: string;
};

const DEFAULT_LIFETIME = 6;
const DEFAULT_PICTURES = 26;
const DEFAULT_MULTIPLE = 3.5;

const paid = (board: Board, keep: (c: Row) => boolean) =>
  board.rows("costs").filter((c) => c.category === "ai_credits" && keep(c)).reduce((sum, c) => sum + (Number(c.amount_usd) || 0), 0);

/** A costs note that ends released or failed, not billed is a call that never happened. */
const DEAD = /·\s*(released|failed, not billed)\s*$/;
export const isLiveCost = (c: Row) => !DEAD.test((c.note ?? "").trim());

/**
 * One name for one picture, so a retry can't start again at attempt 1: "p05", "P5" and "page5" are p5,
 * anything else is lower-cased.
 */
export function normalizeSubject(subject: string): string {
  const s = subject.trim().toLowerCase();
  const page = s.match(/^p(?:age)?[-_ ]?0*(\d+)$/);
  return page ? `p${Number(page[1])}` : s;
}

/** The picture a `page=N` or `name=x` names, normalised. A name that looks like a page is refused: say page=N. */
export function subjectOf(opts: { page?: string; name?: string }): string {
  if (opts.page && opts.name) throw new Error("give page=N or name=x, not both");
  if (opts.page) {
    if (!/^\d+$/.test(opts.page.trim()) || Number(opts.page) < 1) throw new Error(`page=N takes a page number, got "${opts.page}"`);
    return `p${Number(opts.page)}`;
  }
  const name = (opts.name ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][\w-]*$/.test(name)) throw new Error("name the image: page=N, or name=letters-and-dashes");
  if (/^p(age)?[-_ ]?\d+$/.test(name)) throw new Error(`name=${opts.name} looks like a page: use page=${name.replace(/\D/g, "")}, so its attempts are counted together`);
  return name;
}

/** The page numbers a task's title names: "Pages 3-4" is p3 and p4, "Pages 5, 6 and 9" is p5, p6, p9. */
export function coveredPages(title: string): string[] {
  const m = title.match(/\bpages?\s+(\d+(?:\s*(?:-|\u2013|to|,|&|and)\s*\d+)*)/i);
  if (!m) return [];
  const tokens = m[1].match(/\d+|-|\u2013|to/gi) ?? [];
  const out = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (!/^\d+$/.test(tokens[i])) continue;
    const from = Number(tokens[i]);
    if (tokens[i + 1] && !/^\d+$/.test(tokens[i + 1]) && /^\d+$/.test(tokens[i + 2] ?? "")) {
      const to = Number(tokens[i + 2]);
      for (let n = from; n <= Math.min(to, from + 64); n++) out.add(`p${n}`);
      i += 2;
    } else out.add(`p${from}`);
  }
  return [...out];
}

/** When the task last went (back) into in_progress: the start of this round of work. "" when the log never says. */
export function roundStart(board: Board, taskId: string): string {
  const entered = board.rows("log").filter((l) => l.task_id === taskId && l.to_status === "in_progress" && l.from_status !== "in_progress");
  return entered.map((l) => l.ts ?? "").sort().at(-1) ?? "";
}

/**
 * Everything the limits look at, for one picture of one kind on one task. `pending` is 1 while a call is
 * being planned (this picture isn't in the costs rows yet) and 0 when re-checking after its row was reserved.
 * Throws the refusal, or returns the numbers.
 */
function limits(board: Board, task: Row, kind: string, subject: string, rules: ImageRules, today: string, usd: number, pending: 0 | 1) {
  const taskRows = board.rows("costs").filter((c) => c.task_id === task.task_id);
  const stem = `image ${kind} ${subject} ·`;
  const mine = taskRows.filter((c) => (c.note ?? "").startsWith(stem));

  const lifetimeLimit = rules.maxAttemptsLifetime ?? DEFAULT_LIFETIME;
  const lifetime = mine.length + pending;
  if (lifetime > lifetimeLimit) {
    throw new Error(`${subject} has ${mine.length} costs rows (the lifetime limit is ${lifetimeLimit}, failures and releases included): block the task and say what keeps going wrong, so a person decides`);
  }
  const since = roundStart(board, task.task_id);
  const live = mine.filter((c) => isLiveCost(c) && (c.created_at ?? "") >= since).length;
  const round = live + pending;
  if (round > rules.maxAttemptsPerImage) {
    throw new Error(`${subject} has had ${live} paid attempts this round (the limit is ${rules.maxAttemptsPerImage}): block the task and say what keeps going wrong, so a person decides`);
  }

  // The task's budget for this kind: a cap per picture it covers. A page task covers the pages in its title and any it has drawn.
  const kindRows = taskRows.filter((c) => (c.note ?? "").startsWith(`image ${kind} `));
  const pictures = new Set<string>([subject, ...kindRows.map((c) => c.note.match(/^image \S+ (\S+) ·/)?.[1] ?? "").filter(Boolean)]);
  if (kind === "page" || kind === "draft") for (const p of coveredPages(task.title ?? "")) pictures.add(p);
  const maxPictures = rules.maxPicturesPerTask ?? DEFAULT_PICTURES;
  if (pictures.size > maxPictures) throw new Error(`${task.task_id} covers ${pictures.size} ${kind} pictures (the limit is ${maxPictures}): split the task or ask Kyle`);
  const price = rules.models[rules.kinds[kind].model]?.usd[rules.kinds[kind].resolution] ?? usd;
  const each = rules.perImageCapUsd?.[kind] ?? DEFAULT_MULTIPLE * price;
  const spent = kindRows.reduce((sum, c) => sum + (Number(c.amount_usd) || 0), 0);
  const allowed = pictures.size * each;
  if (spent + (pending ? usd : 0) > allowed + 1e-9) {
    throw new Error(`${task.task_id} has spent $${spent.toFixed(2)} on ${kind} pictures; ${pending ? `this $${usd.toFixed(2)} one would pass` : "counting this one that passes"} its $${allowed.toFixed(2)} budget (${pictures.size} picture(s) at $${each.toFixed(2)} each). Block the task and ask Kyle`);
  }

  // The spend guard halts every write at the cap, so the team stops one picture short of it.
  const cap = Number(board.config("daily_bot_cap_usd") || 15);
  const onDay = paid(board, (c) => c.date === today);
  if (onDay + (pending ? usd : 0) >= cap - 1e-9) {
    throw new Error(`today's paid spend is $${onDay.toFixed(2)}${pending ? "" : " counting this image"}; ${pending ? `this $${usd.toFixed(2)} image would reach` : "that reaches"} the $${cap} daily cap, where the spend guard halts every write. Stop for today`);
  }
  return { lifetime, lifetimeLimit, round, roundLimit: rules.maxAttemptsPerImage, budget: { spent, allowed, pictures: pictures.size } };
}

const priced = (rules: ImageRules, kind: string) => {
  const spec = rules.kinds[kind];
  if (!spec) throw new Error(`kind is one of ${Object.keys(rules.kinds).join(", ")}, got "${kind}"`);
  const model = rules.models[spec.model];
  const usd = model?.usd[spec.resolution];
  if (!model || usd === undefined) throw new Error(`the format has no price for ${spec.model} at ${spec.resolution}`);
  return { spec, model, usd };
};

/**
 * Refuses when this picture is out of attempts (this round, or ever), when the task has spent its budget
 * for this kind of picture, or when the call would bring the day to the daily cap. `subject` names the
 * picture within the task ("p5", "miss-marilyn-turnaround"); its attempts are counted from the task's costs rows.
 */
export function planImage(board: Board, task: Row, kind: string, rawSubject: string, rules: ImageRules, today: string): ImagePlan {
  const { spec, model, usd } = priced(rules, kind);
  const subject = normalizeSubject(rawSubject);
  if (!/^[\w-]+$/.test(subject)) throw new Error("name the image: page=N, or name=letters-and-dashes");
  const l = limits(board, task, kind, subject, rules, today, usd, 1);
  return {
    model, resolution: spec.resolution, aspect: spec.aspect, fitToPage: spec.fitToPage, usd,
    attempt: l.lifetime, lifetime: l.lifetime, lifetimeLimit: l.lifetimeLimit, round: l.round, roundLimit: l.roundLimit, budget: l.budget,
    note: `image ${kind} ${subject} · ${model.name} ${spec.resolution} · attempt ${l.lifetime}`,
  };
}

/**
 * After the row was reserved and the tabs re-read (this call's own row included): returns why the call must be
 * released, or "" when it may go ahead. A parallel call that reserved first shows up here.
 */
export function recheckImage(board: Board, task: Row, kind: string, rawSubject: string, rules: ImageRules, today: string): string {
  const { usd } = priced(rules, kind);
  try {
    limits(board, task, kind, normalizeSubject(rawSubject), rules, today, usd, 0);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
}

/** The costs note of a row that is reserved, settled, released, failed or unconfirmed, as the ledger writes them. */
export const reservedNote = (note: string) => `${note} \u00b7 reserved`;
export const releasedNote = (note: string) => `${note.replace(/\s*\u00b7 reserved$/, "")} \u00b7 released`;
export const settledNote = (note: string) => note.replace(/\s*\u00b7 reserved$/, "");
export const failedNote = (note: string) => `${note.replace(/\s*\u00b7 reserved$/, "")} \u00b7 failed, not billed`;
export const unconfirmedNote = (note: string, requestId: string) => `${note.replace(/\s*\u00b7 reserved$/, "")} \u00b7 unconfirmed (request ${requestId || "unknown"})`;

const CLAIM = /\b(T-\d{4})\b[^\n]*?\b(ready for review|blocked|review pass|review fail|handed in)\b/gi;
/** A task past the maker's hands: handed in, or already moved on by QC or Clara. */
const HANDED_IN = ["ready_for_qc", "in_qc", "qc_fail", "escalated", "awaiting_mom", "changes_requested", "approved", "publishing", "done"];

/**
 * Returns how an agent's final message contradicts the board, or "" when it holds. Only the closing line
 * counts: a sentence earlier in the message that mentions a task and "blocked" is not a claim.
 */
export function verifyClaim(board: Board, role: string, message: string): string {
  const closing = message.split("\n").map((l) => l.trim()).filter(Boolean).at(-1) ?? "";
  const claims = [...closing.matchAll(CLAIM)];
  if (!claims.length) {
    const want = role === "quality_checker" ? "T-#### review pass, or T-#### review fail | N fixes, see log" : "T-#### ready for review | self-check: …, or T-#### blocked | reason, or T-#### handed in";
    return `end with one line the dispatcher can act on: ${want}`;
  }
  for (const [, taskId, said] of claims) {
    const task = board.rows("tasks").find((t) => t.task_id === taskId);
    if (!task) return `${taskId} isn't on the board`;
    const claim = said.toLowerCase();
    if (claim === "blocked" && task.status !== "blocked") {
      return `${taskId} is ${task.status}, not blocked: run the block command with the reason, so the board says so`;
    }
    if (claim === "handed in" && !HANDED_IN.includes(task.status)) return `${taskId} is ${task.status}, not handed in: hand it in with the handin command first`;
    if (claim === "ready for review") {
      if (task.status !== "in_progress") return `${taskId} is ${task.status}; work that is ready for review is in_progress`;
      const own = idList(task.output_asset_ids);
      const gap = missingOutput(board, task, own.length || task.task_type !== "social_batch" ? own : postAssets(board, task));
      if (gap) return `${taskId} isn't ready for review: ${gap}`;
    }
    if (claim.startsWith("review")) {
      const review = latestReview(board, taskId);
      if (!review) return `${taskId} has no review in the log: record it with the review command`;
      if (review.pass !== (claim === "review pass")) return `the log's latest verdict on ${taskId} is a ${review.pass ? "pass" : "fail"}, but you said ${claim}`;
    }
  }
  return "";
}
