/**
 * MM Core off Google (roadmap R2). The Sheet is the business; this keeps a copy we hold ourselves.
 *   npm run backup -- <dir>            every tab to <dir>/<tab>.json, plus manifest.json
 *   npm run restore -- <dir>           fill a fresh Sheet (after npm run sheet:setup) from a backup
 *   npm run restore -- <dir> --into-live   allow it on a Sheet that already has tasks (backup rows win)
 * Rows are keyed by header name, so a backup survives added columns. Never commit a backup to this
 * repo: it is public.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Core, headersOf, nowIso, schema, type Row } from "@mm/core";

const fromCaller = (p: string) => resolve(process.env.INIT_CWD ?? process.cwd(), p);
/** Rebuilt from schema.json by sheet:setup, so never restored. */
const DERIVED = ["lists"];
const CHUNK = 400;

export type RestorePlan = { tab: string; append: Row[]; update: { id: string; patch: Partial<Row> }[]; skipped: string }[];

/**
 * What a restore would write: rows the live tab lacks are appended; rows it has under the same ID
 * are updated where they differ; a tab with no ID column (the log) is restored only when empty.
 */
export function planRestore(backup: Record<string, Row[]>, live: (tab: string) => Row[]): RestorePlan {
  return schema.tabs.filter((t) => !DERIVED.includes(t.name)).map((t) => {
    const headers = headersOf(t);
    const rows = (backup[t.name] ?? []).map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""])) as Row);
    const now = live(t.name);
    if (!t.id) return now.length ? { tab: t.name, append: [], update: [], skipped: `has ${now.length} rows and no ID column: left alone` } : { tab: t.name, append: rows, update: [], skipped: "" };
    const have = new Map(now.map((r) => [r[t.id!], r]));
    const update = rows.filter((r) => have.has(r[t.id!])).flatMap((r) => {
      const cur = have.get(r[t.id!])!;
      const patch = Object.fromEntries(headers.filter((h) => h !== t.id && (cur[h] ?? "") !== r[h]).map((h) => [h, r[h]]));
      return Object.keys(patch).length ? [{ id: r[t.id!], patch }] : [];
    });
    return { tab: t.name, append: rows.filter((r) => r[t.id!] && !have.has(r[t.id!])), update, skipped: "" };
  });
}

async function backup(dir: string) {
  const core = await Core.load();
  await mkdir(dir, { recursive: true });
  const counts: Record<string, number> = {};
  for (const t of schema.tabs) {
    counts[t.name] = core.rows(t.name).length;
    await writeFile(resolve(dir, `${t.name}.json`), `${JSON.stringify(core.rows(t.name), null, 1)}\n`);
  }
  await writeFile(resolve(dir, "manifest.json"), `${JSON.stringify({ taken_at: nowIso(), rows: counts, headers: Object.fromEntries(schema.tabs.map((t) => [t.name, headersOf(t)])) }, null, 1)}\n`);
  console.log(`MM Core backed up to ${dir}: ${Object.values(counts).reduce((a, b) => a + b, 0)} rows in ${schema.tabs.length} tabs`);
}

async function restore(dir: string, intoLive: boolean) {
  const core = await Core.load();
  if (core.rows("tasks").length && !intoLive) {
    throw new Error("this Sheet already has tasks. A restore is for a fresh Sheet (npm run sheet:setup first); to overwrite a live one with the backup's rows, add --into-live");
  }
  const data: Record<string, Row[]> = {};
  for (const t of schema.tabs) data[t.name] = JSON.parse(await readFile(resolve(dir, `${t.name}.json`), "utf8").catch(() => "[]"));
  for (const p of planRestore(data, (tab) => core.rows(tab))) {
    for (let i = 0; i < p.append.length; i += CHUNK) await core.append(p.tab, p.append.slice(i, i + CHUNK));
    // Core.update stamps updated_at with now and updated_by with the actor: restored rows say who restored them.
    let failed = 0;
    for (const u of p.update) if (!(await core.update(p.tab, u.id, u.patch, "backend"))) failed++;
    console.log(`${p.tab}: +${p.append.length} rows, ~${p.update.length - failed} updated${failed ? `, ${failed} changed under us` : ""}${p.skipped ? ` (${p.skipped})` : ""}`);
  }
}


async function main() {
  const [mode, dir, flag] = process.argv.slice(2);
  if (!["backup", "restore"].includes(mode) || !dir) throw new Error("usage: npm run backup -- <dir>   |   npm run restore -- <dir> [--into-live]");
  if (mode === "backup") await backup(fromCaller(dir));
  else await restore(fromCaller(dir), flag === "--into-live");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e?.response?.data ?? e?.message ?? e);
    process.exit(1);
  });
}
