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
  maxAttemptsPerImage: number;
  taskCapUsd: number;
};
export type ImagePlan = {
  model: ImageRules["models"][string]; resolution: string; aspect: string; fitToPage: boolean;
  usd: number; attempt: number; note: string;
};

const paid = (board: Board, keep: (c: Row) => boolean) =>
  board.rows("costs").filter((c) => c.category === "ai_credits" && keep(c)).reduce((sum, c) => sum + (Number(c.amount_usd) || 0), 0);

/**
 * Refuses when this image is out of attempts, or when the call would take the task past its cap
 * or the day past config!daily_bot_cap_usd. `subject` names the image within the task ("p5",
 * "miss-marilyn-turnaround"); its attempts are counted from the task's costs rows.
 */
export function planImage(board: Board, task: Row, kind: string, subject: string, rules: ImageRules, today: string): ImagePlan {
  const spec = rules.kinds[kind];
  if (!spec) throw new Error(`kind is one of ${Object.keys(rules.kinds).join(", ")}, got "${kind}"`);
  const model = rules.models[spec.model];
  const usd = model?.usd[spec.resolution];
  if (!model || usd === undefined) throw new Error(`the format has no price for ${spec.model} at ${spec.resolution}`);
  if (!/^[\w-]+$/.test(subject)) throw new Error("name the image: page=N, or name=letters-and-dashes");

  const stem = `image ${kind} ${subject} ·`;
  const attempts = board.rows("costs").filter((c) => c.task_id === task.task_id && c.note.startsWith(stem)).length;
  if (attempts >= rules.maxAttemptsPerImage) {
    throw new Error(`${subject} has had ${attempts} paid attempts (the limit is ${rules.maxAttemptsPerImage}): block the task and say what keeps going wrong, so a person decides`);
  }
  const onTask = paid(board, (c) => c.task_id === task.task_id);
  if (onTask + usd > rules.taskCapUsd + 1e-9) {
    throw new Error(`${task.task_id} has spent $${onTask.toFixed(2)}; this $${usd.toFixed(2)} image would pass its $${rules.taskCapUsd} cap. Block the task and ask Kyle`);
  }
  const cap = Number(board.config("daily_bot_cap_usd") || 15);
  const onDay = paid(board, (c) => c.date === today);
  if (onDay + usd > cap + 1e-9) {
    throw new Error(`today's paid spend is $${onDay.toFixed(2)}; this $${usd.toFixed(2)} image would pass the $${cap} daily cap. Stop for today`);
  }
  return {
    model, resolution: spec.resolution, aspect: spec.aspect, fitToPage: spec.fitToPage, usd, attempt: attempts + 1,
    note: `${stem} ${model.name} ${spec.resolution} · attempt ${attempts + 1}`,
  };
}

const CLAIM = /\b(T-\d{4})\b[^\n]*?\b(ready for review|blocked|review pass|review fail)\b/gi;

/** Returns how an agent's final message contradicts the board, or "" when it holds. */
export function verifyClaim(board: Board, role: string, message: string): string {
  const claims = [...message.matchAll(CLAIM)];
  if (!claims.length) {
    const want = role === "quality_checker" ? "T-#### review pass, or T-#### review fail | N fixes, see log" : "T-#### ready for review | self-check: …, or T-#### blocked | reason";
    return `end with one line the dispatcher can act on: ${want}`;
  }
  for (const [, taskId, said] of claims) {
    const task = board.rows("tasks").find((t) => t.task_id === taskId);
    if (!task) return `${taskId} isn't on the board`;
    const claim = said.toLowerCase();
    if (claim === "blocked" && task.status !== "blocked") {
      return `${taskId} is ${task.status}, not blocked: run the block command with the reason, so the board says so`;
    }
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
