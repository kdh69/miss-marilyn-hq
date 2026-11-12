import { FakeSheets, seeded } from "./helpers/fakeSheets"; // first: it removes live credentials and the call pacing
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { run, tabsFor } from "../apps/backend/src/bot";

/**
 * The walk-through of one art task, through the real Core and the real run() from bot.ts, over an in-memory Sheets API:
 * create a task, start it, a practice picture, check, contact sheet, verify, and a hand-in that is refused without a review.
 * Each command is a new Core, as each `npm run bot` is a new process with its own snapshot.
 */
let fake: FakeSheets;
let dir: string;
const TASK = "T-0001";
const WORK = new URL("../.mm-work/", import.meta.url).pathname;

const out: string[] = [];
const err: string[] = [];
vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
vi.spyOn(console, "error").mockImplementation((...a) => void err.push(a.join(" ")));

/** One `npm run bot -- <role> <command> …`: a fresh snapshot of just the tabs that command reads. */
async function bot(role: string, command: string, ...args: string[]) {
  out.length = 0;
  err.length = 0;
  const tabs = tabsFor(command, args);
  await run(tabs && !tabs.length ? (await import("../packages/core/src/index")).Core.empty() : await fake.load(tabs), role, command, args);
  return out.join("\n");
}

beforeEach(async () => {
  fake = seeded();
  dir = await mkdtemp(join(tmpdir(), "mm-flow-"));
  process.exitCode = undefined;
  await rm(`${WORK}${TASK}`, { recursive: true, force: true });
});
afterAll(async () => {
  await rm(`${WORK}${TASK}`, { recursive: true, force: true });
  await rm(`${WORK}${TASK}_contact.png`, { force: true });
});

async function createTask() {
  const ops = join(dir, "ops.json");
  await writeFile(ops, JSON.stringify([{ tab: "tasks", set: { product_id: "MM-B02", task_type: "art_page", title: "Pages 3-4", brief: "Paint pages 3 and 4 in the book's style, full bleed." } }]));
  return bot("orchestrator", "apply", ops);
}

describe("one art task, command by command, over an in-memory Sheet", () => {
  it("creates the task as todo with its log row, in one append per tab", async () => {
    expect(await createTask()).toContain(`+ tasks ${TASK}`);
    expect(fake.rows("tasks")[0]).toMatchObject({ task_id: TASK, status: "todo", owner: "illustrator", created_by: "orchestrator" });
    expect(fake.rows("log")[0]).toMatchObject({ task_id: TASK, from_status: "", to_status: "todo", actor: "orchestrator" });
    expect(fake.calls.filter((c) => c === "append tasks")).toHaveLength(1);
  });

  it("starts it, draws a practice picture, checks, makes a contact sheet and verifies a claim", async () => {
    await createTask();
    expect(await bot("illustrator", "start", TASK)).toContain("todo → in_progress");
    expect(fake.rows("tasks")[0].status).toBe("in_progress");
    expect(fake.rows("log").at(-1)).toMatchObject({ actor: "illustrator", from_status: "todo", to_status: "in_progress" });

    const prompt = join(dir, "prompt.txt");
    await writeFile(prompt, "Page 5: Miss Marilyn and Gussie on the hill, afternoon light, full bleed, no border.");
    const said = await bot("illustrator", "image", TASK, prompt, "kind=page", "page=05", "dry=1");
    expect(said).toContain("practice (no model called, $0)");
    const practice = `${WORK}${TASK}/PRACTICE_page_p5.png`; // page=05 is p5
    expect(existsSync(practice)).toBe(true);
    expect(fake.rows("costs")).toHaveLength(0); // $0, nothing written

    // check: a practice placeholder isn't print-ready; a picture of the print size is
    await bot("illustrator", "check", practice);
    expect(out.join("\n")).toContain("NOT print-ready");
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
    const real = join(dir, "page_p5.png");
    await sharp({ create: { width: 2588, height: 2625, channels: 3, background: "#cccccc" } }).png().toFile(real);
    expect(await bot("illustrator", "check", real)).toContain("print-ready");
    expect(process.exitCode).toBeUndefined();

    expect(await bot("illustrator", "contact", TASK, practice, real)).toContain("2 pictures");
    expect(existsSync(`${WORK}${TASK}_contact.png`)).toBe(true);

    // verify: the board doesn't back "ready for review" yet (no files), and does back "blocked" only once blocked
    await bot("illustrator", "verify", `Painted pages 3 and 4.\n${TASK} ready for review | self-check: all items`);
    expect(err.join("\n")).toMatch(/output_asset_ids is empty/);
    expect(process.exitCode).toBe(2);
    process.exitCode = undefined;
  });

  it("refuses a hand-in with no files, then with no review, and takes it after a Quality Checker pass", async () => {
    await createTask();
    await bot("illustrator", "start", TASK);
    await expect(bot("illustrator", "handin", TASK, "self-check: 12 of 12")).rejects.toThrow(/output_asset_ids is empty/);

    // a file registered on the task (as `upload` would) makes the hand-in possible, but not without a review
    fake.put("assets", [{ asset_id: "A-T0001-01", task_id: TASK, product_id: "MM-B02", file_url: "https://drive.google.com/file/d/abc/view", created_by: "illustrator" }]);
    const rowNo = fake.tabs.tasks.findIndex((r) => r[0] === TASK);
    fake.tabs.tasks[rowNo][fake.tabs.tasks[0].indexOf("output_asset_ids")] = "A-T0001-01";
    await expect(bot("illustrator", "handin", TASK, "self-check: 12 of 12")).rejects.toThrow(/no Quality Checker review/);

    await bot("quality_checker", "review", TASK, "pass", "checked all 12 items against the rubric");
    // the verdict is a log row with no statuses, so it can't carry a stale one into the integrity check
    expect(fake.rows("log").at(-1)).toMatchObject({ actor: "quality_checker", from_status: "", to_status: "", message: expect.stringMatching(/^review pass/) });
    await bot("illustrator", "note", TASK, "p4 reference chosen");
    expect(fake.rows("log").at(-1)).toMatchObject({ actor: "illustrator", from_status: "", to_status: "", message: "p4 reference chosen" });

    expect(await bot("illustrator", "handin", TASK, "self-check: 12 of 12")).toContain("in_progress → ready_for_qc");
    expect(fake.rows("tasks")[0].status).toBe("ready_for_qc");
    // and the closing line "handed in" now matches the board
    await bot("illustrator", "verify", `Done.\n${TASK} handed in`);
    expect(process.exitCode).toBeUndefined();
  });

  it("loads only the tabs a command reads, and none for check and edges", async () => {
    await createTask();
    fake.calls.length = 0;
    await bot("illustrator", "verify", `${TASK} blocked | x`).catch(() => {});
    expect(fake.calls.filter((c) => c.startsWith("batchGet"))[0]).not.toMatch(/costs|lessons|skus/);
    fake.calls.length = 0;
    await bot("illustrator", "check", join(dir, "nothing.png")).catch(() => {});
    expect(fake.calls).toEqual([]);
    expect(tabsFor("check")).toEqual([]);
    expect(tabsFor("rows", ["nonsense"])).toBeUndefined();
  });

  it("the sweep lock: a second sweep is refused while the first is running, and a lock past 90 minutes is ignored", async () => {
    expect(await bot("orchestrator", "sweep", "start")).toContain("sweep started");
    expect(fake.rows("config").find((r) => r.key === "sweep_started_at")?.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await expect(bot("orchestrator", "sweep", "start")).rejects.toThrow(/hasn't ended/);
    expect(await bot("kyle", "board")).toContain("SWEEP IN PROGRESS");
    await bot("orchestrator", "sweep", "end");
    expect(fake.rows("config").find((r) => r.key === "sweep_started_at")?.value).toBe("");
    // a lock left by a crashed sweep
    const row = fake.tabs.config.findIndex((r) => r[0] === "sweep_started_at");
    fake.tabs.config[row][1] = new Date(Date.now() - 91 * 60_000).toISOString();
    expect(await bot("orchestrator", "sweep", "start")).toContain("sweep started");
    await expect(bot("illustrator", "sweep", "start")).rejects.toThrow(/only the Orchestrator/);
  });
});
