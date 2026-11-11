/**
 * npm run bot -- <role> <command> …   The team's only door to MM Core and Drive.
 * Each maker is a Claude agent (.claude/agents/); this is how it reads its work and writes results,
 * with the house rules enforced here instead of trusted (lib/team.ts). How it's used: docs/TEAM.md.
 *
 * Read (any role, and kyle):
 *   board                           the whole board: products, open tasks, requests, what needs doing
 *   brief <task>                    everything for one task: brief, lessons, pages, files, QC notes, log
 *   rows <tab> [col=value …]        rows of a tab as JSON
 *   fetch <asset|drive url> …       download files into .mm-work/ to look at them
 * Status (each writes its log row):
 *   start <task> ["note"]           todo or blocked → in_progress (the owner)
 *   block <task> "<why>"            in_progress → blocked (the owner)
 *   handin <task> "self-check: …"   in_progress → ready_for_qc, only after a Quality Checker pass
 *   todo <task> "<why>"             qc_fail / changes_requested / blocked → todo (Orchestrator)
 *   cancel <task> "<why>"           → cancelled (Orchestrator)
 *   review <task> pass|fail "…"     the Quality Checker's verdict: a log row, no status change
 *   note <task> "<text>"            a log row that leaves the status alone
 * Rows and files:
 *   apply <ops.json>                [{ "tab", "id"?, "set": {…} }] checked against the role's rights
 *   folder <task>                   the task's Drive folder (made if missing)
 *   upload <task> <file> <asset_type> [page=N] [version=v2] [made_with="…"] [doc=1] [k=v …]
 *   asset <task> <drive url> <asset_type> [k=v …]    register a file that's already in Drive
 *   cost <task> <usd> <vendor> "<note>"              a paid call made outside `image`, never Claude itself
 * Pictures and checks (the page taken from the videograph repo):
 *   image <task> <prompt.txt> kind=sheet|draft|page|cover page=N|name=x [ref=<asset ids or files>] [dry=1]
 *                                   one picture from the image model, behind the budget gate; writes its costs row
 *   check <file> [kind=interior|cover pages=N]       print specs for a PNG, KDP preflight for a PDF
 *   contact <task> [files…]         every page's art on one sheet, to see drift between pages
 *   verify "<an agent's last line>" does the board agree with what the agent says it did? (the Stop hook)
 */
import { execFile } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Core, driveReader, driveWriter, nowIso, schema, tabDef, writerIdentity, type Row } from "@mm/core";
import { planImage, verifyClaim } from "./lib/gates";
import { checkArt, contactSheet, fitToPage, format, generateImage, practiceImage } from "./lib/image";
import { python } from "./lib/python";
import { rubricPath } from "./lib/qc";
import {
  BOT_ROLES, MAX_IN_PROGRESS, idList, isBotRole, isTeamRole, latestReview, mintAssetId, mintCostId, parkedProducts, planMove, planOps, planReview,
  type BotRole, type Move, type Op, type TeamRole,
} from "./lib/team";

const PREFLIGHT = fileURLToPath(new URL("../preflight/preflight.py", import.meta.url));

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const WORK_DIR = resolve(ROOT, ".mm-work");
/** npm runs this from apps/backend; paths on the command line are relative to where it was typed. */
const fromCaller = (p: string) => resolve(process.env.INIT_CWD ?? process.cwd(), p);
const nyDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const FOLDER = "application/vnd.google-apps.folder";
const DOC = "application/vnd.google-apps.document";
const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf",
  ".txt": "text/plain", ".md": "text/markdown", ".html": "text/html", ".json": "application/json", ".csv": "text/csv",
  ".svg": "image/svg+xml", ".zip": "application/zip", ".py": "text/x-python",
};

const one = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max - 1)}…` : s).replace(/\s*\n\s*/g, " ⏎ ");
const indent = (s: string, by = "    ") => s.replace(/\n/g, `\n${by}`);
const kv = (args: string[]) => Object.fromEntries(args.filter((a) => /^[a-z_]+=/.test(a)).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]));

function spendToday(core: Core) {
  const spent = core.rows("costs").filter((c) => c.category === "ai_credits" && c.date === nyDay()).reduce((s, c) => s + (Number(c.amount_usd) || 0), 0);
  return `$${spent.toFixed(2)} of $${core.config("daily_bot_cap_usd") || 15} paid spend today`;
}

function board(core: Core) {
  const parked = parkedProducts(core);
  const types = new Map(core.rows("task_types").map((t) => [t.task_type, t]));
  console.log(`system_status ${core.config("system_status")} · ${spendToday(core)} · ${nowIso()}`);

  console.log("\nPRODUCTS (lowest series_no first; paused and retired get no work)");
  const products = [...core.rows("products")].sort((a, b) => Number(a.series_no) - Number(b.series_no));
  for (const p of products.filter((p) => p.status !== "retired")) {
    console.log(`  ${p.product_id}  Book ${p.series_no || "?"}  ${p.status}  "${p.title}"${p.author_name ? "" : "  (author_name empty)"}`);
  }

  const asks = core.rows("requests").filter((r) => r.to === "orchestrator" && ["new", "in_progress"].includes(r.status));
  console.log(`\nREQUESTS TO THE ORCHESTRATOR (${asks.length} open)`);
  for (const r of asks) console.log(`  ${r.request_id}  ${r.status}  from ${r.from}  ${r.kind}  ${r.product_id || "-"}${r.task_id ? `  → ${r.task_id}` : ""}\n    ${indent(r.body)}`);

  const out = core.rows("requests").filter((r) => r.from === "orchestrator" && !["done", "wont_do"].includes(r.status));
  if (out.length) console.log("\nTHE ORCHESTRATOR'S OPEN QUESTIONS");
  for (const r of out) console.log(`  ${r.request_id}  to ${r.to}  ${r.product_id || "-"}  ${one(r.body)}\n    reply: ${r.reply ? indent(r.reply) : "(none yet)"}`);

  const open = core.rows("tasks").filter((t) => !["done", "cancelled"].includes(t.status) && !parked.has(t.product_id));
  console.log(`\nOPEN TASKS (${open.length})`);
  for (const p of products) {
    const mine = open.filter((t) => t.product_id === p.product_id);
    if (!mine.length) continue;
    console.log(`  ${p.product_id} "${p.title}"`);
    for (const t of mine) {
      const review = t.status === "in_progress" ? latestReview(core, t.task_id) : undefined;
      const extra = t.status === "blocked" ? `blocked: ${t.blocked_reason}`
        : t.status === "qc_fail" ? `QC fail ${t.qc_attempts}: ${t.qc_notes}`
        : t.status === "changes_requested" ? `Clara: ${t.mom_note}`
        : t.status === "escalated" ? `escalated to Kyle: ${t.qc_notes}`
        : t.status === "in_progress" ? (review ? `${review.pass ? "review pass" : `review fail ×${review.fails}`}${review.fails >= 2 ? " → ask Kyle (L-0014)" : ""}` : "no review yet") : "";
      console.log(`    ${t.task_id}  ${t.status.padEnd(17)} ${t.owner.padEnd(15)} ${t.priority}  ${t.task_type}  due ${t.due_date || "-"}  ${t.title}${extra ? `\n      ${one(extra, 300)}` : ""}`);
    }
  }

  const recent = core.rows("tasks").filter((t) => t.status === "done" && !parked.has(t.product_id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8);
  console.log("\nLATEST DONE (does each have its next task in the chain?)");
  for (const t of recent) console.log(`  ${t.task_id}  ${t.product_id}  ${t.task_type}  ${t.title}  (${t.updated_at})`);

  console.log("\nTO DO NOW");
  const say = (label: string, list: Row[]) => list.length && console.log(`  ${label}: ${list.map((t) => `${t.task_id} (${t.owner})`).join(", ")}`);
  say("back to todo with the notes (Orchestrator)", open.filter((t) => ["qc_fail", "changes_requested"].includes(t.status)));
  say("start", open.filter((t) => t.status === "todo" && isBotRole(t.owner)));
  say("finish, then review", open.filter((t) => t.status === "in_progress" && !latestReview(core, t.task_id)?.pass && (types.get(t.task_type)?.needs_qc === "TRUE")));
  say("hand in (review passed)", open.filter((t) => t.status === "in_progress" && latestReview(core, t.task_id)?.pass));
  say("Claude's QC (npm run qc)", open.filter((t) => t.status === "ready_for_qc"));
  say("waiting on Clara", open.filter((t) => t.status === "awaiting_mom"));
  say("waiting on Kyle", open.filter((t) => t.status === "escalated"));
  const busy = BOT_ROLES.map((r) => [r, open.filter((t) => t.owner === r && t.status === "in_progress").length] as const).filter(([, n]) => n);
  console.log(`  in progress per role (max ${MAX_IN_PROGRESS}): ${busy.map(([r, n]) => `${r} ${n}`).join(", ") || "none"}`);
}

function brief(core: Core, role: string, taskId: string) {
  const task = core.rows("tasks").find((t) => t.task_id === taskId);
  if (!task) throw new Error(`no task ${taskId}`);
  const product = core.rows("products").find((p) => p.product_id === task.product_id);
  const type = core.rows("task_types").find((t) => t.task_type === task.task_type);
  const assets = new Map(core.rows("assets").map((a) => [a.asset_id, a]));
  const showAsset = (a: Row) => console.log(`  ${a.asset_id}  ${a.asset_type}${a.page_number ? ` p${a.page_number}` : ""}  ${a.version}  ${a.status}  ${a.rights_source}  ${a.made_with}\n    ${a.file_name}  ${a.file_url || "(no file_url)"}`);

  console.log(`system_status ${core.config("system_status")}${core.config("system_status") === "HALT" ? "  — STOP: nothing runs until Kyle sets RUN" : ""}`);
  console.log(`\n${task.task_id}  ${task.task_type}  ${task.status}  owner ${task.owner}  ${task.priority}  due ${task.due_date || "-"}${role !== task.owner ? `  (you are ${role})` : ""}`);
  console.log(`${task.title}`);
  console.log(`Product ${task.product_id}${task.sku ? ` / ${task.sku}` : ""}: "${product?.title}", Book ${product?.series_no}, ${product?.status}${parkedProducts(core).has(task.product_id) ? "  — STOP: paused or retired, no work" : ""}`);
  if (product?.notes) console.log(`  notes: ${one(product.notes, 400)}`);
  console.log(`Series bible docs/brand/series-bible.md · style guide docs/brand/style-guide.md`);
  console.log(`Checklist for this task type: ${fileURLToPath(rubricPath(type?.qc_rubric ?? "")).replace(ROOT, "")}  (needs QC: ${type?.needs_qc}; goes to Clara: ${type?.needs_mom})`);

  console.log(`\nBRIEF\n  ${indent(task.brief, "  ")}`);
  if (task.input_refs) console.log(`\nINPUTS\n  ${indent(task.input_refs, "  ")}`);
  if (task.blocked_reason) console.log(`\nBLOCKED: ${task.blocked_reason}`);
  if (task.qc_notes) console.log(`\nLAST QC (${task.qc_result}, attempt ${task.qc_attempts})\n  ${indent(task.qc_notes, "  ")}`);
  if (task.mom_note) console.log(`\nCLARA'S NOTE (${task.mom_decision})\n  ${indent(task.mom_note, "  ")}`);

  console.log("\nLESSONS (requirements, every one)");
  for (const l of core.rows("lessons").filter((l) => l.status === "active" && ["all", task.task_type, task.owner, role].includes(l.applies_to))) {
    console.log(`  ${l.lesson_id} (${l.applies_to}): ${l.rule}`);
  }

  const outs = task.output_asset_ids.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`\nOUTPUT FILES (${outs.length})`);
  for (const id of outs) assets.has(id) ? showAsset(assets.get(id)!) : console.log(`  ${id}  (missing from assets)`);

  const mentioned = [...new Set(`${task.brief} ${task.input_refs}`.match(/\b[AP]-[\w-]+\b/g) ?? [])].filter((id) => assets.has(id) && !outs.includes(id));
  if (mentioned.length) console.log("\nFILES NAMED IN THE BRIEF");
  for (const id of mentioned) showAsset(assets.get(id)!);

  const photos = core.rows("assets").filter((a) => a.asset_type === "photo" && a.status !== "superseded" && (!a.product_id || a.product_id === task.product_id));
  if (photos.length) console.log(`\nREFERENCE PHOTOS (${photos.length})`);
  for (const a of photos) console.log(`  ${a.asset_id}  ${a.file_name}  ${a.rights_note ? `${one(a.rights_note, 80)}  ` : ""}${a.file_url}`);

  const sheets = core.rows("assets").filter((a) => a.asset_type === "character_sheet" && a.product_id === task.product_id && a.status !== "superseded");
  if (sheets.length) console.log(`\nCHARACTER SHEETS (${sheets.length})`);
  for (const a of sheets) showAsset(a);

  const pages = core.rows("pages").filter((p) => p.product_id === task.product_id).sort((a, b) => Number(a.page_number) - Number(b.page_number));
  if (pages.length) console.log(`\nPAGES (${pages.length})  text_final is Clara's and the only text that prints`);
  for (const p of pages) {
    console.log(`  p${p.page_number}  ${p.page_id}  art ${p.art_asset_id || "-"}  characters: ${p.characters || "-"}`);
    if (p.text_draft) console.log(`    draft: ${indent(p.text_draft, "           ")}`);
    if (p.text_final) console.log(`    FINAL: ${indent(p.text_final, "           ")}`);
    if (p.art_brief) console.log(`    art:   ${indent(p.art_brief, "           ")}`);
  }

  const log = core.rows("log").filter((l) => l.task_id === taskId).slice(-12);
  console.log(`\nLOG (last ${log.length})`);
  for (const l of log) console.log(`  ${l.ts}  ${l.actor}  ${l.from_status || "·"} → ${l.to_status || "·"}  ${indent(l.message)}`);
}

function rows(core: Core, role: string, tab: string, filters: string[]) {
  tabDef(tab);
  if (role === "scout" && !["research", "lessons", "products", "costs"].includes(tab)) throw new Error("Scout reads research, lessons, products and costs only");
  const want = Object.entries(kv(filters));
  console.log(JSON.stringify(core.rows(tab).filter((r) => want.every(([k, v]) => r[k] === v)), null, 1));
}

/** The task's folder in Drive, MM Work/products/{product_id}/{task_id}, made if it isn't there. */
async function taskFolder(core: Core, task: Row): Promise<string> {
  let parent = core.config("drive_work_folder_id");
  if (!parent) throw new Error("config!drive_work_folder_id is empty");
  for (const name of ["products", task.product_id, task.task_id]) {
    const found = await driveReader().files.list({ q: `'${parent}' in parents and name = '${name}' and mimeType = '${FOLDER}' and trashed = false`, fields: "files(id)" });
    parent = found.data.files?.[0]?.id
      ?? (await driveWriter().files.create({ requestBody: { name, mimeType: FOLDER, parents: [parent] }, fields: "id" })).data.id!;
  }
  return parent;
}

/** Downloads one Drive file (by asset ID or URL) into .mm-work/ and returns its path. */
async function fetchOne(core: Core, ref: string): Promise<string> {
  await mkdir(WORK_DIR, { recursive: true });
  const drive = driveReader();
  const asset = core.rows("assets").find((a) => a.asset_id === ref);
  const id = (asset?.file_url ?? ref).match(/[-\w]{25,}/)?.[0];
  if (!id) throw new Error(`${ref}: no Drive file ID in "${asset?.file_url ?? ref}"`);
  const meta = await drive.files.get({ fileId: id, fields: "name,mimeType" });
  const mime = meta.data.mimeType ?? "";
  const native = mime.startsWith("application/vnd.google-apps.");
  const as = mime === DOC ? ["text/plain", ".txt"] : mime.endsWith("spreadsheet") ? ["text/csv", ".csv"] : ["application/pdf", ".pdf"];
  const res = native
    ? await drive.files.export({ fileId: id, mimeType: as[0] }, { responseType: "arraybuffer" })
    : await drive.files.get({ fileId: id, alt: "media" }, { responseType: "arraybuffer" });
  const name = `${asset ? `${asset.asset_id}_` : ""}${(meta.data.name ?? id).replace(/[^\w.-]+/g, "_")}${native ? as[1] : ""}`;
  await writeFile(resolve(WORK_DIR, name), Buffer.from(res.data as ArrayBuffer));
  return resolve(WORK_DIR, name);
}

async function fetchFiles(core: Core, refs: string[]) {
  for (const ref of refs) {
    try {
      console.log(`${ref}: ${(await fetchOne(core, ref)).replace(ROOT, "")}`);
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}

/** KDP preflight on a local PDF (the same script the QC gate runs). Returns what's wrong. */
async function preflightFile(kind: "interior" | "cover", file: string, pages?: string): Promise<string[]> {
  const args = ["-I", PREFLIGHT, kind, file, ...(kind === "cover" ? ["--pages", pages || String(format.pages)] : [])];
  const out = await promisify(execFile)(python, args, { maxBuffer: 4_000_000 }).catch((e) => ({ stdout: String(e.stdout ?? "") }));
  try {
    return JSON.parse(out.stdout).failures as string[];
  } catch {
    return ["preflight couldn't run: it needs python3 with PyMuPDF (pip install -r apps/backend/preflight/requirements.txt)"];
  }
}

/** The deterministic checks for a file, before anyone spends a review on it. */
async function checkFile(file: string, opts: Record<string, string>): Promise<string[]> {
  if (extname(file).toLowerCase() === ".pdf") return preflightFile(opts.kind === "cover" ? "cover" : "interior", file, opts.pages);
  return checkArt(file);
}

async function contact(core: Core, taskId: string, files: string[]) {
  const task = core.rows("tasks").find((t) => t.task_id === taskId);
  if (!task) throw new Error(`no task ${taskId}`);
  const items: { label: string; image: Buffer }[] = [];
  if (files.length) {
    for (const f of files) items.push({ label: basename(f).replace(/\.\w+$/, ""), image: await readFile(fromCaller(f)) });
  } else {
    const pages = core.rows("pages").filter((p) => p.product_id === task.product_id && p.art_asset_id).sort((a, b) => Number(a.page_number) - Number(b.page_number));
    if (!pages.length) throw new Error(`no page of ${task.product_id} has art yet`);
    for (const p of pages) items.push({ label: `p${p.page_number}  ${p.art_asset_id}`, image: await readFile(await fetchOne(core, p.art_asset_id)) });
  }
  await mkdir(WORK_DIR, { recursive: true });
  const out = resolve(WORK_DIR, `${files.length ? task.task_id : task.product_id}_contact.png`);
  await writeFile(out, await contactSheet(items));
  console.log(`${items.length} pictures: ${out.replace(ROOT, "")}\nOpen it and compare every character with its character sheet and with itself across pages.`);
}

/** One picture from the image model: gate → call → costs row → print-size file in .mm-work/<task>/. */
async function image(core: Core, role: BotRole, task: Row, promptPath: string, opts: Record<string, string>) {
  const kind = opts.kind ?? "page";
  const subject = opts.page ? `p${opts.page}` : (opts.name ?? "");
  const prompt = (await readFile(fromCaller(promptPath), "utf8")).trim();
  if (prompt.length < 40) throw new Error("the prompt file is nearly empty");
  const dir = resolve(WORK_DIR, task.task_id);
  await mkdir(dir, { recursive: true });

  if (opts.dry) {
    const spec = format.image.kinds[kind];
    if (!spec || !subject) throw new Error(`usage: image <task> <prompt.txt> kind=${Object.keys(format.image.kinds).join("|")} page=N|name=x`);
    const out = resolve(dir, `PRACTICE_${kind}_${subject}.png`);
    await writeFile(out, await practiceImage(`${kind} ${subject}`, spec.fitToPage));
    return console.log(`practice (no model called, $0): ${out.replace(ROOT, "")}\nPractice files can't be uploaded.`);
  }

  const plan = planImage(core, task, kind, subject, format.image, nyDay());
  const refs: string[] = [];
  for (const ref of idList(opts.ref)) refs.push(existsSync(fromCaller(ref)) ? fromCaller(ref) : await fetchOne(core, ref));
  if (refs.length > plan.model.maxRefs) throw new Error(`${plan.model.name} takes at most ${plan.model.maxRefs} reference images; you gave ${refs.length}`);

  const made = await generateImage({ model: plan.model, prompt, aspect: plan.aspect, resolution: plan.resolution, refs });
  // The call succeeded, so it is billed: record it before anything else can fail.
  const now = nowIso();
  const cost_id = mintCostId(core.rows("costs").map((c) => c.cost_id));
  await core.append("costs", [{
    cost_id, date: nyDay(), category: "ai_credits", vendor: "fal.ai", amount_usd: plan.usd.toFixed(2), estimated: "TRUE",
    product_id: task.product_id, sku: task.sku, task_id: task.task_id, role, note: plan.note, entered_by: role, created_at: now,
  }]);

  const out = resolve(dir, `${kind}_${subject}_a${plan.attempt}.png`);
  let png = made.png;
  let warn = "";
  if (plan.fitToPage) {
    try {
      png = await fitToPage(made.png);
    } catch (e) {
      warn = `\n  ! ${(e as Error).message}. Saved as the model returned it.`;
    }
  }
  await writeFile(out, png);
  // The recipe: everything needed to make this picture again, or to move it to another model.
  const recipe = out.replace(/\.png$/, ".recipe.json");
  await writeFile(recipe, JSON.stringify({
    task_id: task.task_id, product_id: task.product_id, kind, subject, attempt: plan.attempt, made_at: now,
    model: plan.model.name, endpoint: made.endpoint, request_id: made.requestId, resolution: plan.resolution, aspect: plan.aspect,
    fitted_to_page: plan.fitToPage && !warn, usd_estimate: plan.usd, references: idList(opts.ref), prompt,
  }, null, 2));
  const madeWith = `${plan.model.name} via fal.ai (${made.endpoint})`;
  console.log(`${out.replace(ROOT, "")}  attempt ${plan.attempt} of ${format.image.maxAttemptsPerImage}  $${plan.usd.toFixed(2)} (${cost_id})  ·  ${spendToday(core)}${warn}`);
  console.log(`Open it and look before anything else. When it's right, upload its recipe, then the picture:\n  npm run bot -- ${role} upload ${task.task_id} ${recipe.replace(ROOT, "")} page_plan made_with="Claude Code"\n  npm run bot -- ${role} upload ${task.task_id} ${out.replace(ROOT, "")} <asset_type>${opts.page ? ` page=${opts.page}` : ""} made_with="${madeWith}" prompt_ref=<the recipe's asset id>${plan.fitToPage ? "" : " draft=1"}`);
}

/** Appends the assets row, then puts its ID on the task (and on the page, for an Illustrator's page art). */
async function register(core: Core, role: BotRole, task: Row, assetType: string, file: { url: string; name: string }, opts: Record<string, string>) {
  if (!schema.lists.asset_type.includes(assetType)) throw new Error(`asset_type "${assetType}" isn't one of ${schema.lists.asset_type.join(", ")}`);
  const rights = opts.rights_source ?? "AI";
  if (!schema.lists.rights_source.includes(rights)) throw new Error(`rights_source is ${schema.lists.rights_source.join(", ")}`);
  if (!opts.made_with?.trim()) throw new Error('made_with is required: the exact tool and model, e.g. made_with="Claude Code (claude-…)"');
  const asset_id = mintAssetId(core.rows("assets").map((a) => a.asset_id), task.task_id);
  const now = nowIso();
  await core.append("assets", [{
    asset_id, task_id: task.task_id, product_id: task.product_id, sku: task.sku, asset_type: assetType, page_number: opts.page ?? "",
    version: `${opts.version ?? "v1"}${opts.draft ? "-draft" : ""}`, file_url: file.url, file_name: file.name, rights_source: rights, rights_note: opts.rights_note ?? "",
    made_with: opts.made_with, prompt_ref: opts.prompt_ref ?? "", status: "draft", created_by: role, created_at: now, updated_at: now, updated_by: role,
  }]);
  const ids = [...task.output_asset_ids.split(",").map((s) => s.trim()).filter(Boolean), asset_id].join(",");
  const linked = await core.update("tasks", task.task_id, { output_asset_ids: ids }, role);
  console.log(`${asset_id}  ${assetType}${opts.page ? ` p${opts.page}` : ""}  ${file.url}`);
  if (!linked) console.log(`  ! ${task.task_id} changed under us: output_asset_ids not updated; run the command again without re-uploading (use \`asset\` with the URL above)`);
  if (role === "illustrator" && assetType === "page_art" && opts.page) {
    const page = core.rows("pages").find((p) => p.product_id === task.product_id && Number(p.page_number) === Number(opts.page));
    if (page && (await core.update("pages", page.page_id, { art_asset_id: asset_id }, role))) console.log(`  ${page.page_id}.art_asset_id = ${asset_id}`);
    else console.log(`  ! no pages row for ${task.product_id} p${opts.page} (or it changed): set art_asset_id with apply`);
  }
}

async function upload(core: Core, role: BotRole, task: Row, path: string, assetType: string, opts: Record<string, string>) {
  const file = fromCaller(path);
  const size = (await stat(file)).size;
  const mime = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  // Checked here, in code, so a file that can't print never reaches a reviewer or Clara.
  if (/^PRACTICE_/i.test(basename(file))) throw new Error("practice placeholders are never uploaded");
  const pdfKind = assetType === "interior_pdf" ? "interior" : assetType === "cover_pdf" ? "cover" : "";
  const fails = ["page_art", "cover_art"].includes(assetType) && !opts.draft ? await checkArt(file)
    : pdfKind && !/REVIEW/.test(basename(file))
      ? await preflightFile(pdfKind, file, core.rows("skus").find((s) => s.sku === task.sku || (s.product_id === task.product_id && s.format === "PB"))?.page_count)
      : [];
  if (fails.length) {
    throw new Error(`${basename(file)} isn't print-ready, so it wasn't uploaded:\n  ${fails.join("\n  ")}${pdfKind ? "" : "\n  (a low-resolution draft picture uploads with draft=1)"}`);
  }
  const folder = await taskFolder(core, task);
  const name = opts.name ?? basename(file);
  try {
    const made = await driveWriter().files.create({
      requestBody: { name: opts.doc ? name.replace(/\.\w+$/, "") : name, parents: [folder], ...(opts.doc ? { mimeType: DOC } : {}) },
      media: { mimeType: mime, body: createReadStream(file) },
      fields: "id,name,webViewLink",
    });
    await register(core, role, task, assetType, { url: made.data.webViewLink ?? `https://drive.google.com/file/d/${made.data.id}/view`, name: made.data.name ?? name }, opts);
  } catch (e) {
    const m = String((e as { message?: string })?.message ?? e);
    if (!/quota/i.test(m)) throw e;
    throw new Error(
      `Drive refused the upload (${size} bytes) as the ${writerIdentity() === "owner" ? "owner" : "service account"}: service accounts can't own files in a personal Drive.\n` +
      `Either set GOOGLE_OWNER_REFRESH_TOKEN, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in this environment (docs/SETUP.md, Uploads),\n` +
      `or create the file with the Google Drive connector in folder ${folder} and register it:\n` +
      `  npm run bot -- ${role} asset ${task.task_id} <drive url> ${assetType} …`,
    );
  }
}

async function apply(core: Core, role: TeamRole, path: string) {
  const ops = JSON.parse(await readFile(fromCaller(path), "utf8")) as Op[];
  if (!Array.isArray(ops)) throw new Error('apply takes a JSON array: [{ "tab": "pages", "id": "MM-B02-p03", "set": { "text_draft": "…" } }]');
  const planned = planOps(core, role, ops, nowIso());
  let skipped = 0;
  for (const p of planned) {
    if (p.kind === "append") {
      await core.append(p.tab, [p.row]);
      if (p.tab === "tasks") await core.log(role, p.id, "", "todo", `created: ${one(p.row.title ?? "", 100)}`);
      console.log(`+ ${p.tab} ${p.id}`);
    } else if (await core.update(p.tab, p.id, p.row, role)) console.log(`~ ${p.tab} ${p.id}: ${Object.keys(p.row).filter((k) => !k.startsWith("updated_")).join(", ")}`);
    else { skipped++; console.log(`! ${p.tab} ${p.id} changed since it was read: skipped, run it again`); }
  }
  if (skipped) process.exitCode = 1;
}

export async function run(core: Core, role: string, command: string, args: string[]) {
  const words = (from: number) => args.slice(from).join(" ").trim();
  const reads: Record<string, () => unknown> = {
    board: () => board(core),
    brief: () => brief(core, role, args[0] ?? ""),
    rows: () => rows(core, role, args[0] ?? "", args.slice(1)),
    fetch: () => fetchFiles(core, args),
    contact: () => contact(core, args[0] ?? "", args.slice(1)),
    check: async () => {
      const fails = await checkFile(fromCaller(args[0] ?? ""), kv(args.slice(1)));
      console.log(fails.length ? `${basename(args[0])}: NOT print-ready\n  ${fails.join("\n  ")}` : `${basename(args[0])}: print-ready`);
      if (fails.length) process.exitCode = 1;
    },
    verify: () => {
      const why = verifyClaim(core, role, args.join(" "));
      if (!why) return console.log("ok");
      console.error(why);
      process.exitCode = 2;
    },
  };
  if (reads[command]) return void (await reads[command]());

  if (core.config("system_status") === "HALT") throw new Error("system_status is HALT: nothing is written until Kyle sets it back to RUN");
  if (role === "critic") {
    if (command !== "apply") throw new Error("the critic reads, and adds lessons with apply; nothing else");
    return apply(core, role, args[0] ?? "");
  }
  if (!isBotRole(role)) throw new Error("Kyle reads here; his writes are npm run task, npm run lesson and npm run qc");
  const task = () => {
    const t = core.rows("tasks").find((t) => t.task_id === args[0]);
    if (!t) throw new Error(`no task ${args[0] ?? ""}`);
    if (parkedProducts(core).has(t.product_id)) throw new Error(`${t.product_id} is paused or retired`);
    return t;
  };
  /** Files and costs belong to the task's owner while they work on it. */
  const mine = () => {
    const t = task();
    if (t.owner !== role) throw new Error(`${t.task_id} is ${t.owner}'s task, not ${role}'s`);
    if (!["in_progress", "blocked"].includes(t.status)) throw new Error(`${t.task_id} is ${t.status}; start it first`);
    return t;
  };

  if (["start", "block", "handin", "todo", "cancel"].includes(command)) {
    const move = planMove(core, role, args[0] ?? "", command as Move, words(1));
    if (!(await core.update("tasks", args[0], move.patch, role))) throw new Error(`${args[0]} changed since it was read; run the command again`);
    await core.log(role, args[0], move.from, move.to, move.message);
    console.log(`${args[0]}: ${move.from} → ${move.to}${move.message ? `  (${one(move.message, 100)})` : ""}`);
  } else if (command === "review") {
    if (role !== "quality_checker") throw new Error("only the Quality Checker reviews");
    const r = planReview(core, args[0] ?? "", args[1] ?? "", words(2));
    await core.log(role, args[0], r.status, r.status, r.message);
    console.log(`${args[0]}: ${one(r.message, 100)}${r.fails >= 2 ? `\n  ${r.fails} fails this round: the Orchestrator sends it to Kyle (L-0014)` : ""}`);
  } else if (command === "note") {
    const t = task();
    if (!words(1)) throw new Error("say what happened");
    await core.log(role, t.task_id, t.status, t.status, words(1));
    console.log(`${t.task_id}: noted`);
  } else if (command === "apply") {
    await apply(core, role, args[0] ?? "");
  } else if (command === "folder") {
    const id = await taskFolder(core, mine());
    console.log(`${id}  https://drive.google.com/drive/folders/${id}`);
  } else if (command === "upload") {
    await upload(core, role, mine(), args[1] ?? "", args[2] ?? "", kv(args.slice(3)));
  } else if (command === "image") {
    await image(core, role, mine(), args[1] ?? "", kv(args.slice(2)));
  } else if (command === "asset") {
    const t = mine();
    if (!/[-\w]{25,}/.test(args[1] ?? "")) throw new Error("give the file's Drive URL");
    const meta = await driveReader().files.get({ fileId: args[1].match(/[-\w]{25,}/)![0], fields: "name,webViewLink" });
    await register(core, role, t, args[2] ?? "", { url: meta.data.webViewLink ?? args[1], name: meta.data.name ?? "" }, kv(args.slice(3)));
  } else if (command === "cost") {
    const t = task();
    const usd = Number(args[1]);
    if (!(usd > 0) || !args[2] || !words(3)) throw new Error('usage: cost <task> <usd> <vendor> "<what it paid for>"');
    const now = nowIso();
    const cost_id = mintCostId(core.rows("costs").map((c) => c.cost_id));
    await core.append("costs", [{
      cost_id, date: nyDay(), category: "ai_credits", vendor: args[2], amount_usd: usd.toFixed(2), estimated: "TRUE",
      product_id: t.product_id, sku: t.sku, task_id: t.task_id, role, note: words(3), entered_by: role, created_at: now,
    }]);
    console.log(`${cost_id}: $${usd.toFixed(2)} ${args[2]} · ${spendToday(core)}`);
  } else {
    throw new Error(`unknown command "${command}" (see apps/backend/src/bot.ts)`);
  }
}

async function main() {
  const [role = "", command = "", ...args] = process.argv.slice(2);
  if (!isTeamRole(role) && role !== "kyle") throw new Error(`usage: npm run bot -- <${BOT_ROLES.join(" | ")}> <command> …  (see apps/backend/src/bot.ts)`);
  await run(await Core.load(), role, command, args);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    const api = e?.response?.data;
    console.error(api ? JSON.stringify(api).slice(0, 600) : e?.message ?? e);
    process.exit(1);
  });
}
