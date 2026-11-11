/**
 * npm run team:export [dir] — the team as plain text (roadmap R1): for each role, the house rules
 * plus its description, with nothing Claude-specific in it. Paste one into any agent that can run
 * commands in this repo (another coding agent, another model) and it is that role. Default
 * output: .mm-work/team-export/.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** role file name (without .md) → the full, portable prompt for that role. */
export function exportTeam(root = ROOT): Record<string, string> {
  // Windows checkouts may have CRLF; every match below assumes LF.
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const team = read(resolve(root, "docs/TEAM.md"));
  const start = team.indexOf("## House rules");
  const rules = team.slice(start, team.indexOf("\n## ", start + 5)).trim();
  if (start < 0 || rules.length < 500) throw new Error("docs/TEAM.md has no House rules section");
  const dir = resolve(root, ".claude/agents");
  const out: Record<string, string> = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const body = read(resolve(dir, file)).replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    out[file.replace(/\.md$/, "")] = [
      "You are one role on the Miss Marilyn HQ team. You work in a checkout of the miss-marilyn-hq repository with a shell;",
      "MM Core (the Google Sheet) and Drive are reached only with `npm run bot -- <role> <command>`, which enforces the rules below.",
      "When you finish, the dispatcher checks your last line with `npm run bot -- <role> verify \"<line>\"`.",
      "",
      rules,
      "",
      "## Your role",
      "",
      body,
    ].join("\n");
  }
  return out;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2] ?? resolve(ROOT, ".mm-work/team-export"));
  mkdirSync(dir, { recursive: true });
  const team = exportTeam();
  for (const [name, text] of Object.entries(team)) writeFileSync(resolve(dir, `${name}.txt`), `${text}\n`);
  console.log(`${Object.keys(team).length} roles written to ${dir}: ${Object.keys(team).join(", ")}`);
}
