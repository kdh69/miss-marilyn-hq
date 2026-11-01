/**
 * npm run sim — takes a throwaway copy of Book 2 (MM-B01) through every step after the script,
 * using the real backend jobs, with no bots, no Drive uploads and no QC spend:
 *   Script: QC pass → Clara makes the words hers → Done (her words recorded as a human asset)
 *   Illustrations: a bot skipping QC gets reverted; page art QC → Clara OKs each picture;
 *                  cover → Clara asks for changes → redo → QC → she approves
 *   Building: a broken interior PDF that KDP preflight must catch → fixed PDF → Clara OKs each
 *             layout and the Building card; cover wrap through preflight
 *   Full book review: KDP packet (its listings row) → the review checklist → Clara's final OK
 *   Launch: listing approved → Clara marks it live; autopilot asks for a marketing plan → plan
 *           approved → autopilot asks for a week of posts → posts approved → Clara marks one posted
 * Every status, log row and card is checked, then everything it made is deleted.
 * Book 2 itself is only read. PDFs are made locally (preflight/sample_pdfs.py) and fed to the
 * real preflight; pictures reuse existing Drive files so the panel can show them with --keep.
 *
 *   npm run sim              run, then clean up
 *   npm run sim -- --keep    leave the SIM book in the panel to click through (shows as paused)
 *   npm run sim -- --clean   delete every SIM book left behind
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Core, nowIso, type Row } from "@mm/core";
import { integrityCheck, qcGate } from "./jobs/gatekeeper";
import { marketing } from "./jobs/marketing";
import { momSync } from "./jobs/momSync";
import { usePdfSource } from "./lib/preflight";
import { python } from "./lib/python";

const exec = promisify(execFile);
const MAKER = fileURLToPath(new URL("../preflight/sample_pdfs.py", import.meta.url));
const SOURCE = "MM-B01";
const PAGES = 24;
const BOOK = `SIM${nowIso().replace(/\D/g, "").slice(0, 12)}`;
const SKU = `${BOOK}-PB`;
const ANY_SIM = /SIM\d{12}/;
const pad = (n: number) => String(n).padStart(2, "0");
const ours = (t: Row) => t.task_id.includes(BOOK);

const results: [string, boolean][] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push([name, pass]);
  console.log(`  ${pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}${detail ? ` — ${detail}` : ""}`);
  return pass;
}
class Stop extends Error {}
const must = (name: string, pass: boolean, detail = "") => { if (!check(name, pass, detail)) throw new Stop(name); };

// ---------- helpers that act the way each party does ----------

const load = (tabs?: string[]) => Core.load(tabs);
const taskRow = async (id: string) => (await load(["tasks"])).rows("tasks").find((t) => t.task_id === id)!;
const openCard = async (id: string) => (await load(["mom_queue"])).rows("mom_queue").find((m) => m.task_id === id && !m.answer && !m.processed_at);

let taskN = 0;
let assetN = 0;
const pdfs = new Map<string, string>(); // asset_id → local PDF, served to preflight instead of Drive

/** Orchestrator: a new task at todo, with its log row. */
async function newTask(type: string, owner: string, title: string): Promise<string> {
  const id = `T-${BOOK}-${pad(++taskN)}`;
  const now = nowIso();
  const core = await load(["tasks", "log"]);
  await core.append("tasks", [{
    task_id: id, product_id: BOOK, sku: SKU, task_type: type, title, brief: `npm run sim: ${title}. Not real work.`,
    owner, status: "todo", priority: "P1", created_by: "orchestrator", created_at: now, updated_at: now, updated_by: "orchestrator",
  }]);
  await core.log("orchestrator", id, "", "todo", "sim: created");
  return id;
}

/** A bot (or the Orchestrator) moves its own task, with the log row lesson L-0015 asks for. */
async function move(id: string, actor: string, to: string, message: string, patch: Partial<Row> = {}) {
  const core = await load(["tasks", "log"]);
  const from = core.rows("tasks").find((t) => t.task_id === id)!.status;
  must(`${actor} moves ${id.slice(-2)} ${from} → ${to}`, await core.update("tasks", id, { ...patch, status: to }, actor));
  await core.log(actor, id, from, to, message);
}

/** Files a bot made for a task. `local` PDFs are kept here and handed to preflight. */
async function addAssets(taskId: string, by: string, files: (Partial<Row> & { local?: string })[]): Promise<string[]> {
  const now = nowIso();
  const rows = files.map(({ local, ...f }) => {
    const asset_id = `A-${BOOK}-${pad(++assetN)}`;
    if (local) pdfs.set(asset_id, local);
    return {
      asset_id, task_id: taskId, product_id: BOOK, sku: SKU, version: "v1", rights_source: "AI", made_with: "npm run sim",
      status: "draft", created_by: by, created_at: now, updated_at: now, updated_by: by, file_name: f.asset_type ?? "", ...f,
    };
  });
  await (await load(["assets"])).append("assets", rows);
  return rows.map((r) => r.asset_id);
}

/** The maker's run: start, self-check, Quality Checker review pass, hand in (L-0012, L-0013). */
async function handIn(id: string, by: string, assetIds: string[]) {
  await move(id, by, "in_progress", "sim: working");
  const core = await load(["log"]);
  await core.log(by, id, "in_progress", "in_progress", "self-check passed: sim");
  await core.log("quality_checker", id, "in_progress", "in_progress", "review pass: sim");
  await move(id, by, "ready_for_qc", "sim: handed in after review pass", { output_asset_ids: assetIds.join(",") });
}

/** Claude's QC, recorded the way `npm run qc` records it (preflight still runs first). */
async function qc(id: string, summaryForMom: string) {
  const core = await load();
  await qcGate(core, true, id, async () => ({ result: "pass", notes: "manual QC: ok", summaryForMom }));
  return taskRow(id);
}

/** Clara answers her card in the panel; the next tick's Clara sync applies it. */
async function clara(id: string, answer: "Approve" | "Changes" | "Done", note = "") {
  const card = await openCard(id);
  must(`Clara has a card for ${id.slice(-2)}`, !!card, card?.summary);
  await (await load(["mom_queue"])).update("mom_queue", card!.item_id, { answer, mom_note: note, answered_at: nowIso() }, "mom");
  await momSync(await load());
  return taskRow(id);
}

/** Clara's "it's posted" / "it's live" from the Social and Launch pages, as the panel writes it. */
async function mark(what: "Posted" | "Live", id: string, link: string) {
  const now = nowIso();
  await (await load(["requests"])).append("requests", [{
    request_id: `Q-${BOOK}-${what[0]}-${id.slice(-3)}`, created_at: now, from: "mom", to: "orchestrator", product_id: BOOK,
    kind: "note", body: `${what} ${id} ${link}`, status: "done", updated_at: now, updated_by: "mom",
  }]);
}

/** Clara's "looks good" on each page's picture or finished layout, as approvePage writes it. */
async function approvePages(what: "Picture" | "Layout") {
  const now = nowIso();
  const rows = Array.from({ length: PAGES }, (_, i) => ({
    request_id: `Q-${BOOK}-${what[0]}${pad(i + 1)}`, created_at: now, from: "mom", to: "orchestrator", product_id: BOOK,
    page_number: String(i + 1), kind: "note", body: `${what} approved for page ${i + 1}.`, status: "done", updated_at: now, updated_by: "mom",
  }));
  await (await load(["requests"])).append("requests", rows);
}

async function makePdf(dir: string, kind: string, name: string, extra: string[] = []) {
  const out = join(dir, name);
  await exec(python, ["-I", MAKER, kind, out, ...extra], { maxBuffer: 4_000_000 });
  return out;
}

// ---------- the run ----------

async function main(dir: string) {
  let core = await load();
  const book2 = core.rows("products").find((p) => p.product_id === SOURCE);
  must("Book 2 is in the Sheet", !!book2, book2?.title);
  const src = core.rows("pages").filter((p) => p.product_id === SOURCE).sort((a, b) => Number(a.page_number) - Number(b.page_number));
  must(`Book 2 has at least ${PAGES} pages to copy`, src.length >= PAGES, `${src.length} pages`);
  const b2 = (type: string) => core.rows("assets").filter((a) => a.product_id === SOURCE && a.asset_type === type && a.file_url);
  const drive = (a?: Row) => (a && /google\.com/.test(a.file_url) ? a.file_url : "");
  // Pictures for the panel: any page art already in Drive, else Book 2's cover drafts.
  const pics = core.rows("assets").filter((a) => a.asset_type === "page_art" && drive(a) && a.status !== "superseded").map((a) => a.file_url);
  const covers = b2("cover_art").map((a) => a.file_url);
  const picFor = (i: number) => pics[i % Math.max(pics.length, 1)] || covers[0] || "sim:no-picture";

  console.log(`\n0. Copy Book 2 into ${BOOK} (Book 2 itself is only read)`);
  const now = nowIso();
  await core.append("products", [{
    product_id: BOOK, line: book2!.line, series_no: "99", title: `SIM — ${book2!.title}`, subtitle: book2!.subtitle,
    lesson_theme: book2!.lesson_theme, age_range: book2!.age_range, author_name: "Sim Author", status: "in_production",
    notes: "npm run sim test copy of Book 2; deleted when the run ends", created_at: now, updated_at: now, updated_by: "backend",
  }]);
  await core.append("skus", [{ sku: SKU, product_id: BOOK, format: "PB", trim_size: "8.5x8.5", page_count: String(PAGES), interior: "premium color", paper: "white", status: "draft", notes: "npm run sim", created_at: now, updated_at: now, updated_by: "backend" }]);
  // Book 2 is still 32 pages; the sim takes p1–p23 and its closing page, the 24-page map (L-0010).
  const picked = [...src.slice(0, PAGES - 1), src[src.length - 1]];
  await core.append("pages", picked.map((p, i) => ({
    page_id: `${BOOK}-p${pad(i + 1)}`, product_id: BOOK, page_number: String(i + 1), text_draft: p.text_draft,
    art_brief: p.art_brief, characters: p.characters, updated_at: now, updated_by: "story_producer",
  })));
  check("product, 24-page sku and 24 pages written", true, BOOK);

  console.log("\n1. Script: QC → Clara makes the words hers → Done");
  const story = await newTask("story_draft", "story_producer", "story text");
  await handIn(story, "story_producer", await addAssets(story, "story_producer", [{ asset_type: "manuscript", file_url: drive(b2("manuscript")[0]) || "sim:manuscript" }]));
  await integrityCheck(await load(), ours);
  check("logged bot moves pass the integrity check", (await taskRow(story)).status === "ready_for_qc");
  let t = await qc(story, "Sim: the script is ready for your words.");
  must("QC pass → waiting on Clara", t.status === "awaiting_mom", t.status);
  let card = await openCard(story);
  check("Script card opens her book workspace", card?.item_type === "rewrite" && card.preview_url === `/books/${BOOK}`, card?.preview_url);
  check("card shows no QC boilerplate", card?.qc_summary === "", card?.qc_summary);
  core = await load(["pages"]);
  const wordy = core.rows("pages").filter((p) => p.product_id === BOOK && p.text_draft.trim());
  for (const p of wordy) await core.update("pages", p.page_id, { text_final: `${p.text_draft.trim()}`, text_final_by: "mom", text_final_at: nowIso() }, "mom");
  check(`Clara's words saved on every page with words`, true, `${wordy.length} of ${PAGES} pages have words`);
  t = await clara(story, "Done");
  check("Done → script task done", t.status === "done", t.status);
  core = await load(["assets"]);
  const human = core.rows("assets").find((a) => a.task_id === story && a.rights_source === "human" && a.asset_type === "page_text");
  check("her words recorded as a human-written asset (KDP AI answer for text: no)", !!human, human?.rights_note);

  console.log("\n2. Illustrations: page art, then the cover with one round of changes");
  const art = await newTask("art_page", "illustrator", "page art, all pages");
  core = await load(["tasks"]);
  await core.update("tasks", art, { status: "done" }, "illustrator"); // a bot skipping QC, no log row
  await integrityCheck(await load(), ours);
  check("a bot marking its own art done (skipping QC) is reverted", (await taskRow(art)).status === "todo");
  const artIds = await addAssets(art, "illustrator", Array.from({ length: PAGES }, (_, i) => ({ asset_type: "page_art", page_number: String(i + 1), file_url: picFor(i), file_name: `sim page ${i + 1}` })));
  core = await load(["pages"]);
  for (let i = 0; i < PAGES; i++) await core.update("pages", `${BOOK}-p${pad(i + 1)}`, { art_asset_id: artIds[i] }, "illustrator");
  await handIn(art, "illustrator", artIds);
  t = await qc(art, "Sim: page art on-model.");
  check("page art QC pass → done (no Clara card for page art)", t.status === "done" && !(await openCard(art)), t.status);
  await approvePages("Picture");
  check("Clara OKs all 24 pictures (Illustrations step)", true);

  const cover = await newTask("art_cover", "illustrator", "front cover");
  const v1 = await addAssets(cover, "illustrator", [{ asset_type: "cover_art", file_url: covers[0] || picFor(0), file_name: "sim cover v1" }]);
  await handIn(cover, "illustrator", v1);
  t = await qc(cover, "Sim: here's the cover.");
  must("cover QC pass → Clara's Illustrations card", t.status === "awaiting_mom", t.status);
  t = await clara(cover, "Changes", "SIM TEST, not a real rule: make the title area calmer.");
  check("her Changes → changes_requested", t.status === "changes_requested", t.status);
  core = await load(["lessons"]);
  const lesson = core.rows("lessons").find((l) => l.evidence_task_id === cover);
  check("her note became a lesson the bots read", !!lesson, lesson?.rule);
  if (lesson) await core.update("lessons", lesson.lesson_id, { status: "retired" }); // a sim rule must never reach a real bot run
  await move(cover, "orchestrator", "todo", "sim: Clara's changes copied into the brief");
  await (await load(["assets"])).update("assets", v1[0], { status: "superseded" }, "illustrator");
  const v2 = await addAssets(cover, "illustrator", [{ asset_type: "cover_art", version: "v2", file_url: covers[1] || covers[0] || picFor(1), file_name: "sim cover v2" }]);
  await handIn(cover, "illustrator", v2);
  t = await qc(cover, "Sim: the cover with your change.");
  const round2 = (await openCard(cover))?.item_id ?? "";
  check("redone cover passes QC → a second card (round 2)", t.status === "awaiting_mom" && round2.endsWith("-2"), round2);
  t = await clara(cover, "Approve");
  check("cover approved → done", t.status === "done", t.status);

  console.log("\n3. Building: interior (broken first, so preflight must catch it), then the cover wrap");
  const texts = join(dir, "texts.json");
  core = await load(["pages"]);
  await writeFile(texts, JSON.stringify(core.rows("pages").filter((p) => p.product_id === BOOK).sort((a, b) => Number(a.page_number) - Number(b.page_number)).map((p) => p.text_final)));
  const title = `SIM — ${book2!.title}`;
  const interior = await newTask("interior_layout", "builder", "interior PDF");
  const bad = await addAssets(interior, "builder", [{ asset_type: "interior_pdf", file_url: `sim:${BOOK}/interior-v1.pdf`, local: await makePdf(dir, "bad-interior", "interior-v1.pdf") }]);
  await handIn(interior, "builder", bad);
  t = await qc(interior, "Sim: this should never reach Clara.");
  check("KDP preflight fails the broken PDF before any QC verdict", t.status === "qc_fail" && t.qc_notes.startsWith("PREFLIGHT"), t.qc_notes.split("\n").slice(0, 3).join(" | "));
  check("nothing reached Clara", !(await openCard(interior)));
  await move(interior, "orchestrator", "todo", "sim: preflight fixes copied into the brief");
  await (await load(["assets"])).update("assets", bad[0], { status: "superseded" }, "builder");
  const good = await addAssets(interior, "builder", [{ asset_type: "interior_pdf", version: "v2", file_url: `sim:${BOOK}/interior-v2.pdf`, local: await makePdf(dir, "interior", "interior-v2.pdf", ["--pages", String(PAGES), "--title", title, "--text-file", texts]) }]);
  await handIn(interior, "builder", good);
  t = await qc(interior, "Sim: the inside of the book, laid out.");
  must("fixed PDF passes preflight + QC → Clara's Building card", t.status === "awaiting_mom", `${t.status} ${t.qc_notes.slice(0, 120)}`);
  card = await openCard(interior);
  check("her card shows this round's note, not the earlier preflight failure", !!card && !/PREFLIGHT/.test(card.qc_summary), card?.qc_summary || "(blank)");
  await approvePages("Layout");
  t = await clara(interior, "Approve");
  check("Clara OKs all 24 layouts and approves the interior → done", t.status === "done", t.status);

  const wrap = await newTask("cover_wrap", "builder", "cover wrap PDF");
  await handIn(wrap, "builder", await addAssets(wrap, "builder", [{ asset_type: "cover_pdf", file_url: `sim:${BOOK}/cover.pdf`, local: await makePdf(dir, "cover", "cover.pdf", ["--pages", String(PAGES), "--title", title]) }]));
  t = await qc(wrap, "Sim: the cover wrap.");
  check("cover wrap sized for 24 pages passes preflight → done", t.status === "done", `${t.status} ${t.qc_notes.slice(0, 120)}`);

  console.log("\n4. Full book review: KDP packet → checklist → Clara's final OK");
  const packet = await newTask("kdp_packet", "publisher", "KDP listing packet");
  // The Lister writes every KDP field into the listings row; the Launch page shows them with copy buttons.
  const LISTING = `L-${BOOK}-KDP`;
  await (await load(["listings"])).append("listings", [{
    listing_id: LISTING, sku: SKU, channel: "KDP", status: "packet_ready", task_id: packet, title: `SIM — ${book2!.title}`,
    subtitle: book2!.subtitle, series: "The Adventures of Miss Marilyn", author: "Sim Author", description: "A sim description for parents.",
    keywords: ["cat picture book", "grandparents book", "first flight", "toddler bedtime", "rescue cat", "ages 2-6", "family love"].join("\n"),
    categories: ["Children's Books > Animals > Cats", "Children's Books > Family Life > Grandparents"].join("\n"),
    details: ["Reading age: 2-6", "AI text: No (owner's own words)", "AI images: Yes", "Ink and paper: Premium color, white", "Trim: 8.5 x 8.5 in", "Bleed: Yes"].join("\n"),
    price: "10.99", packet_url: drive(b2("listing_copy")[0]), created_at: nowIso(), updated_at: nowIso(), updated_by: "publisher",
  }]);
  await handIn(packet, "publisher", await addAssets(packet, "publisher", [{ asset_type: "listing_copy", file_url: drive(b2("listing_copy")[0]) || "sim:packet", file_name: "sim KDP packet" }]));
  t = await qc(packet, "Sim: everything is ready to publish on KDP.");
  must("packet QC pass → the final OK card", t.status === "awaiting_mom" && (await openCard(packet))?.item_type === "kdp_publish", t.status);
  core = await load();
  const pages = core.rows("pages").filter((p) => p.product_id === BOOK);
  const ok = (body: string) => new Set(core.rows("requests").filter((r) => r.product_id === BOOK && r.body.startsWith(body)).map((r) => r.page_number)).size;
  const words = pages.filter((p) => (p.text_final || p.text_draft).trim());
  check("checklist: every page with words is in her words", words.every((p) => p.text_final), `${words.filter((p) => p.text_final).length}/${words.length}`);
  check("checklist: all pictures approved", ok("Picture approved") === PAGES, `${ok("Picture approved")}/${PAGES}`);
  check("checklist: all finished pages approved", ok("Layout approved") === PAGES, `${ok("Layout approved")}/${PAGES}`);
  check("checklist: layout and cover approved", core.rows("tasks").filter((x) => x.task_id === interior || x.task_id === wrap).every((x) => x.status === "done"));
  t = await clara(packet, "Approve");
  check("final OK → packet done (Clara then publishes on KDP by hand)", t.status === "done", t.status);

  console.log("\n5. Launch: the listing goes live, the marketing plan, a week of posts");
  const tick = async () => { await momSync(await load()); await marketing(await load(), (p) => p.product_id === BOOK); };
  const listing = async () => (await load(["listings"])).rows("listings").find((l) => l.listing_id === LISTING)!;
  const asks = async (prefix: string) => (await load(["requests"])).rows("requests").filter((r) => r.product_id === BOOK && r.body.startsWith(prefix));
  await tick();
  check("her final OK approves the KDP listing", (await listing()).status === "approved", (await listing()).status);
  const plansAsked = await asks("Marketing plan:");
  check("autopilot asks the Orchestrator for a marketing plan (book reached Building)", plansAsked.length === 1, plansAsked[0]?.body.slice(0, 60));
  await tick();
  check("…only once while that ask is open", (await asks("Marketing plan:")).length === 1);
  await mark("Live", LISTING, "https://www.amazon.com/dp/SIMTEST");
  await tick();
  const live = await listing();
  check("Clara's 'it's live' mark → listing live with its Amazon link", live.status === "live" && live.live_url.includes("amazon.com"), `${live.status} ${live.live_url}`);

  const plan = await newTask("marketing_plan", "growth", "marketing plan");
  const planRows = [["goal", "", "Launch week", "Get the first 20 copies to families who love cats"], ["audience", "", "Parents and grandparents", "Of 2-6 year olds; cat lovers"],
    ["pillar", "", "The real Miss Marilyn", "Her sneezes and naps"], ["platform", "INSTAGRAM", "Instagram", "4 a week: reels, carousels"], ["platform", "PINTEREST", "Pinterest", "1 pin a day"],
    ["platform", "FACEBOOK", "Facebook", "3 a week"], ["platform", "TIKTOK", "TikTok", "3 a week"], ["launch", "", "Launch week", "Daily posts, cover reveal"],
    ["hashtags", "INSTAGRAM", "Instagram tags", "#catsofinstagram #picturebooks"], ["kpi", "", "Saves and link clicks", "Per week"]];
  await (await load(["plans"])).append("plans", planRows.map(([section, channel, title, detail], i) => ({
    plan_id: `MP-${BOOK}-${pad(i + 1)}`, product_id: BOOK, task_id: plan, section, channel, title, detail, sort: String(i + 1), status: "draft",
    created_at: nowIso(), updated_at: nowIso(), updated_by: "growth",
  })));
  await handIn(plan, "growth", []); // a plan's output is its plans rows, no files
  t = await qc(plan, "Sim: here's the marketing plan.");
  must("plan QC pass → Clara's approval card", t.status === "awaiting_mom", t.status);
  t = await clara(plan, "Approve");
  await tick();
  const planNow = (await load(["plans"])).rows("plans").filter((p) => p.task_id === plan);
  check("her Approve → plan done and every plan row approved", t.status === "done" && planNow.every((p) => p.status === "approved"), `${t.status}, ${planNow.map((p) => p.status).join(" ")}`);
  const postsAsked = await asks("Social idea:");
  check("autopilot asks for the first week of posts once the plan is approved", postsAsked.length === 1, postsAsked[0]?.body.slice(0, 80));

  const batch = await newTask("social_batch", "growth", "week 1 posts");
  const channels = ["INSTAGRAM", "PINTEREST", "FACEBOOK", "TIKTOK"];
  const types: Record<string, string> = { INSTAGRAM: "reel", PINTEREST: "pin", FACEBOOK: "post", TIKTOK: "short" };
  const day0 = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const POSTS = Array.from({ length: 7 }, (_, i) => `C-${BOOK}-${pad(i + 1)}`);
  await (await load(["content"])).append("content", POSTS.map((content_id, i) => ({
    content_id, product_id: BOOK, task_id: batch, channel: channels[i % 4], content_type: types[channels[i % 4]],
    scheduled_for: new Date(Date.parse(`${day0}T12:00:00Z`) + i * 864e5).toISOString().slice(0, 10), hook: `Sim hook ${i + 1}`, body: "Sim caption.",
    hashtags: "#catsofinstagram #picturebooks", asset_ids: artIds[i], link_url: `https://example.com/?utm_source=${channels[i % 4].toLowerCase()}&utm_medium=social&utm_campaign=${BOOK}`,
    notes: "Sim tip", status: "draft", created_at: nowIso(), updated_at: nowIso(), updated_by: "growth",
  })));
  await handIn(batch, "growth", POSTS.map((_, i) => artIds[i]));
  t = await qc(batch, "Sim: a week of posts.");
  must("posts QC pass → Clara's approval card", t.status === "awaiting_mom", t.status);
  t = await clara(batch, "Approve");
  await tick();
  const posts = (await load(["content"])).rows("content").filter((c) => c.task_id === batch);
  check("her Approve → all 7 posts approved, ready on the Social page", posts.length === 7 && posts.every((c) => c.status === "approved"), posts.map((c) => c.status).join(" "));
  // The Orchestrator closes its asks when the work lands.
  core = await load(["requests"]);
  for (const r of [...plansAsked, ...postsAsked]) await core.update("requests", r.request_id, { status: "done" }, "orchestrator");
  await tick();
  check("a full week queued → autopilot doesn't ask again", (await asks("Social idea:")).length === 1);
  await mark("Posted", POSTS[0], "https://www.instagram.com/p/SIMTEST");
  await tick();
  const first = (await load(["content"])).rows("content").find((c) => c.content_id === POSTS[0])!;
  check("Clara's 'posted' mark → post posted with its link", first.status === "posted" && first.posted_url.includes("instagram.com"), `${first.status} ${first.posted_url}`);

  console.log("\n6. The record");
  core = await load();
  const mine = core.rows("tasks").filter(ours);
  check("every SIM task finished", mine.every((x) => x.status === "done"), mine.map((x) => `${x.task_type}:${x.status}`).join(" "));
  const reverted = core.rows("log").filter((l) => ours({ task_id: l.task_id } as Row) && l.message.startsWith("reverted"));
  check("only the one deliberate skip was reverted", reverted.length === 1, reverted.map((l) => l.message).join("; "));
  for (const x of mine) {
    const trail = core.rows("log").filter((l) => l.task_id === x.task_id && l.from_status !== l.to_status).map((l) => l.to_status);
    console.log(`     ${x.task_type.padEnd(16)} ${trail.join(" → ")}`);
  }
  check("no SIM card left open for Clara", !core.rows("mom_queue").some((m) => m.task_id.includes(BOOK) && !m.answer && !m.processed_at));
}

async function cleanup(match: (v?: string) => boolean) {
  console.log("\nCleaning up");
  const core = await load(["config"]);
  let n = 0;
  n += await core.deleteWhere("tasks", (r) => match(r.task_id));
  n += await core.deleteWhere("assets", (r) => match(r.asset_id));
  n += await core.deleteWhere("mom_queue", (r) => match(r.task_id));
  n += await core.deleteWhere("log", (r) => match(r.task_id));
  n += await core.deleteWhere("requests", (r) => match(r.product_id));
  n += await core.deleteWhere("lessons", (r) => match(r.evidence_task_id));
  n += await core.deleteWhere("pages", (r) => match(r.product_id));
  n += await core.deleteWhere("listings", (r) => match(r.listing_id) || match(r.sku));
  n += await core.deleteWhere("plans", (r) => match(r.product_id));
  n += await core.deleteWhere("content", (r) => match(r.product_id));
  n += await core.deleteWhere("skus", (r) => match(r.product_id));
  n += await core.deleteWhere("products", (r) => match(r.product_id));
  console.log(`  removed ${n} SIM rows`);
}

async function keep() {
  const core = await load(["products"]);
  await core.update("products", BOOK, { status: "paused", notes: `npm run sim test copy of Book 2, kept to look at; remove with npm run sim -- --clean` });
  console.log(`\nKept ${BOOK} (paused, so bots and QC skip it). Remove it with: npm run sim -- --clean`);
}

const arg = process.argv[2] ?? "";
if (arg === "--clean") {
  cleanup((v = "") => ANY_SIM.test(v)).then(() => process.exit(0), (e) => { console.error(e?.message ?? e); process.exit(1); });
} else {
  (async () => {
    const dir = await mkdtemp(join(tmpdir(), "mm-sim-"));
    usePdfSource(async (a) => {
      const file = pdfs.get(a.asset_id);
      if (!file) throw new Error("not a sim file");
      return readFile(file);
    });
    try {
      await main(dir);
    } catch (e) {
      if (!(e instanceof Stop)) check("sim crashed", false, String((e as { response?: { data?: { error?: { message?: string } } }; message?: string })?.response?.data?.error?.message ?? (e as Error)?.message ?? e).slice(0, 300));
    } finally {
      usePdfSource();
      await rm(dir, { recursive: true, force: true });
      await (arg === "--keep" ? keep() : cleanup((v = "") => v.includes(BOOK))).catch((e) => console.error(`cleanup failed — run npm run sim -- --clean (${e?.message})`));
      const failed = results.filter(([, p]) => !p).length;
      console.log(`\n${failed ? `\x1b[31m${failed} check(s) failed\x1b[0m` : "\x1b[32mThe whole flow after the script works\x1b[0m"}\n`);
      process.exit(failed ? 1 : 0);
    }
  })();
}
