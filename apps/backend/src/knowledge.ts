/**
 * npm run knowledge — checks docs/knowledge/ (format in its README): every file has a title, a
 * review date and 5 to 12 rules; every claim ends with [label, checked YYYY-MM-DD]. Lists the
 * claims nobody has re-checked in 60 days. Format errors exit 1; stale claims are a to-do list.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../../../docs/knowledge/", import.meta.url));
const LABELS = ["proven", "videograph", "official", "unproven"];
const TAG = /\[(\w+), checked (\d{4}-\d{2}-\d{2})\]/;
const STALE_DAYS = 60;

export type Knowledge = { claims: number; errors: string[]; stale: string[] };

export function checkKnowledge(dir = DIR, today = new Date().toISOString().slice(0, 10)): Knowledge {
  const out: Knowledge = { claims: 0, errors: [], stale: [] };
  const age = (date: string) => Math.round((Date.parse(today) - Date.parse(date)) / 864e5);
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const lines = readFileSync(resolve(dir, name), "utf8").split(/\r?\n/);
    const bad = (line: number, why: string) => out.errors.push(`${name}:${line + 1} ${why}`);
    if (!lines[0]?.startsWith("# ")) bad(0, "line 1 must be the # title");
    if (!/^Last reviewed: \d{4}-\d{2}-\d{2}$/.test(lines[1] ?? "")) bad(1, "line 2 must be `Last reviewed: YYYY-MM-DD`");

    let section = "";
    let rules = 0;
    lines.forEach((line, i) => {
      if (line.startsWith("## ")) return void (section = line.slice(3).trim());
      const bullet = line.startsWith("- ");
      const tag = line.match(TAG);
      if (section === "Rules" && bullet) rules++;
      // Outside the README, every bullet is a claim; in it, only the rules are.
      if (bullet && !tag && (name !== "README.md" || section === "Rules")) return bad(i, "a claim must end with [label, checked YYYY-MM-DD]");
      if (!tag) return;
      out.claims++;
      if (!LABELS.includes(tag[1])) bad(i, `label "${tag[1]}" isn't one of ${LABELS.join(", ")}`);
      if (Number.isNaN(Date.parse(tag[2]))) bad(i, `"${tag[2]}" isn't a date`);
      else if (age(tag[2]) > STALE_DAYS) out.stale.push(`${name}:${i + 1} checked ${tag[2]} (${age(tag[2])} days ago): ${line.replace(/^[-|]\s*/, "").slice(0, 90)}`);
    });
    if (rules < 5 || rules > 12) bad(0, `## Rules has ${rules} rules; it needs 5 to 12`);
  }
  return out;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const k = checkKnowledge();
  for (const e of k.errors) console.error(`✗ ${e}`);
  console.log(`${k.claims} claims in docs/knowledge/, ${k.errors.length} format errors, ${k.stale.length} not re-checked in ${STALE_DAYS} days`);
  for (const s of k.stale) console.log(`  · ${s}`);
  if (k.errors.length) process.exit(1);
}
