/**
 * npm run lesson -- <applies_to> "<rule>"
 * Adds a standing rule from Kyle to the lessons tab. Every bot reads the active lessons for its
 * role, its task type and "all" at the start of every run, so rule changes go here rather than
 * into the Grok descriptions. Re-running with the same rule adds nothing.
 * Away from the laptop: Actions → MM backend tick → job "lesson" (task_id = applies_to, text = rule).
 */
import { Core, schema } from "@mm/core";

async function main() {
  const [appliesTo = "", ...words] = process.argv.slice(2);
  const rule = words.join(" ").trim();
  const allowed = new Set(["all", ...schema.lists.role, ...schema.lists.task_type]);
  if (!allowed.has(appliesTo) || !rule) throw new Error('usage: npm run lesson -- <role | task_type | all> "<rule>"');

  const core = await Core.load(["lessons"]);
  const lessons = core.rows("lessons");
  if (lessons.some((l) => l.rule.trim() === rule && l.status === "active")) return console.log("That rule is already an active lesson.");
  const last = Math.max(0, ...lessons.map((l) => Number(l.lesson_id.match(/^L-(\d{4})$/)?.[1] ?? 0)));
  const lesson_id = `L-${String(last + 1).padStart(4, "0")}`;
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  await core.append("lessons", [{ lesson_id, date, applies_to: appliesTo, rule, evidence_task_id: "", source: "kyle", status: "active" }]);
  console.log(`${lesson_id} (${appliesTo}): ${rule}`);
}

main().catch((e) => {
  console.error(e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
