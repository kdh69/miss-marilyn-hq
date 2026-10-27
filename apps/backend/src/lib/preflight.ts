/**
 * Job 3 wiring: run the deterministic KDP checks (preflight/preflight.py) on PDF
 * assets before any Claude spend. Failures go straight to qc_notes.
 */
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Core, driveReader, type Row } from "@mm/core";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../../preflight/preflight.py", import.meta.url));
const KIND: Record<string, "interior" | "cover"> = { interior_layout: "interior", cover_wrap: "cover" };

export const needsPreflight = (taskType: string) => taskType in KIND;

export async function preflight(core: Core, task: Row, assets: Row[]): Promise<string[]> {
  const kind = KIND[task.task_type];
  if (!kind) return [];
  const pdfs = assets.filter((a) => /pdf/.test(a.asset_type));
  if (!pdfs.length) return [`no PDF asset to check (expected an ${kind === "interior" ? "interior_pdf" : "cover_pdf"})`];

  let pages = "";
  if (kind === "cover") {
    const skus = core.rows("skus");
    pages = (skus.find((s) => s.sku === task.sku) ?? skus.find((s) => s.product_id === task.product_id && s.format === "PB"))?.page_count ?? "";
    if (!pages) return ["cover check needs the book's page_count in the skus tab"];
  }

  const dir = await mkdtemp(join(tmpdir(), "mm-preflight-"));
  const failures: string[] = [];
  try {
    for (const a of pdfs) {
      const id = a.file_url.match(/[-\w]{25,}/)?.[0];
      if (!id) { failures.push(`${a.asset_id}: file_url isn't a Drive link`); continue; }
      const file = join(dir, `${a.asset_id}.pdf`);
      const bin = await driveReader().files.get({ fileId: id, alt: "media" }, { responseType: "arraybuffer" });
      await writeFile(file, Buffer.from(bin.data as ArrayBuffer));
      const args = ["-I", SCRIPT, kind, file, ...(kind === "cover" ? ["--pages", pages] : [])];
      const { stdout } = await run("python3", args, { maxBuffer: 4_000_000 }).catch((e) => ({ stdout: e.stdout as string }));
      const result = JSON.parse(stdout || '{"ok":false,"failures":["preflight crashed"]}');
      failures.push(...(result.failures as string[]).map((f) => `${a.asset_id}: ${f}`));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  return failures;
}
