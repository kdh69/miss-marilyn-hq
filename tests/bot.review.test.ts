import { FakeSheets, seeded } from "./helpers/fakeSheets"; // first: it removes live credentials and the call pacing
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { register, run } from "../apps/backend/src/bot";
import { integrityCheck, spendGuard } from "../apps/backend/src/jobs/gatekeeper";

/** Findings of the 2026-11-11 review (S1-review-findings.md) that need a Sheet to show: F7, F8, F9, F12, and the spend guard. */
let fake: FakeSheets;
let dir: string;
const out: string[] = [];
vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));

const task = (over: Record<string, string> = {}) => ({ task_id: "T-0001", product_id: "MM-B02", task_type: "art_page", title: "Pages 3-4", brief: "Paint.", owner: "illustrator", status: "in_progress", priority: "P1", updated_at: "2026-11-12T01:00:00Z", ...over });
const bot = async (role: string, command: string, ...args: string[]) => run(await fake.load(), role, command, args);

beforeEach(async () => {
  fake = seeded();
  dir = await mkdtemp(join(tmpdir(), "mm-review-"));
  process.exitCode = undefined;
  out.length = 0;
});

describe("F7: note and review rows carry no status the integrity check could act on", () => {
  it("a note written from a stale snapshot doesn't make the next tick revert QC's move", async () => {
    fake.put("tasks", [task()]);
    fake.put("log", [
      { ts: "2026-11-12T01:00:00Z", actor: "orchestrator", task_id: "T-0001", to_status: "todo" },
      { ts: "2026-11-12T01:01:00Z", actor: "illustrator", task_id: "T-0001", from_status: "todo", to_status: "in_progress" },
    ]);
    const stale = await fake.load(); // a maker's `note` loads the board here, with the task in_progress
    // meanwhile the task is handed in, QC'd and sent to Clara
    const row = fake.tabs.tasks.findIndex((r) => r[0] === "T-0001");
    fake.tabs.tasks[row][fake.tabs.tasks[0].indexOf("status")] = "awaiting_mom";
    fake.tabs.tasks[row][fake.tabs.tasks[0].indexOf("updated_by")] = "backend";
    fake.put("log", [
      { ts: "2026-11-12T01:05:00Z", actor: "illustrator", task_id: "T-0001", from_status: "in_progress", to_status: "ready_for_qc" },
      { ts: "2026-11-12T01:06:00Z", actor: "backend", task_id: "T-0001", from_status: "ready_for_qc", to_status: "in_qc" },
      { ts: "2026-11-12T01:07:00Z", actor: "backend", task_id: "T-0001", from_status: "in_qc", to_status: "awaiting_mom" },
    ]);
    await run(stale, "illustrator", "note", ["T-0001", "p4 uses the second reference"]);
    await integrityCheck(await fake.load());
    expect(fake.rows("tasks")[0].status).toBe("awaiting_mom"); // not reverted to in_progress
    expect(fake.rows("log").some((l) => /reverted/.test(l.message))).toBe(false);
  });
});

describe("F8: apply writes one append per tab and says exactly what landed", () => {
  const ops = (n: number) => Array.from({ length: n }, (_, i) => ({ tab: "tasks", set: { product_id: "MM-B02", task_type: "art_page", title: `Pages ${i}`, brief: "Paint it." } }));

  it("twelve new tasks are one append to tasks and one to log", async () => {
    const file = join(dir, "ops.json");
    await writeFile(file, JSON.stringify(ops(12)));
    await bot("orchestrator", "apply", file);
    expect(fake.calls.filter((c) => c === "append tasks")).toHaveLength(1);
    expect(fake.calls.filter((c) => c === "append log")).toHaveLength(1);
    expect(fake.rows("tasks").map((t) => t.task_id)).toEqual(Array.from({ length: 12 }, (_, i) => `T-${String(i + 1).padStart(4, "0")}`));
    expect(fake.rows("log")).toHaveLength(12);
  });

  it("a failed append writes none of its rows, says so, and a rerun doesn't duplicate anything", async () => {
    const file = join(dir, "ops.json");
    await writeFile(file, JSON.stringify(ops(3)));
    fake.failOnce = { match: /^append tasks/, error: new Error("Quota exceeded") };
    await expect(bot("orchestrator", "apply", file)).rejects.toThrow(/none of its 3 rows landed[\s\S]*Written: nothing[\s\S]*NOT written: tasks T-0001, tasks T-0002, tasks T-0003/);
    expect(fake.rows("tasks")).toHaveLength(0);
    await bot("orchestrator", "apply", file);
    expect(fake.rows("tasks").map((t) => t.task_id)).toEqual(["T-0001", "T-0002", "T-0003"]);
  });
});

describe("F9: upload checks everything before Drive, and a file is registered once", () => {
  it("refuses a bad asset_type or a missing made_with before touching Drive (no orphan file)", async () => {
    fake.put("tasks", [task()]);
    const file = join(dir, "page.png");
    await writeFile(file, "x");
    await expect(bot("illustrator", "upload", "T-0001", file, "page_art", "page=3")).rejects.toThrow(/made_with is required/);
    await expect(bot("illustrator", "upload", "T-0001", file, "painting", 'made_with="x"')).rejects.toThrow(/asset_type "painting"/);
    await expect(bot("illustrator", "upload", "T-0001", file, "page_art", 'made_with="x"', "rights_source=found")).rejects.toThrow(/rights_source is/);
    expect(fake.rows("assets")).toHaveLength(0);
  });

  it("registering the same Drive file twice reuses its row: one assets row, linked once", async () => {
    fake.put("tasks", [task()]);
    const url = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view";
    const again = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=drivesdk";
    const opts = { made_with: "Claude Code" };
    await register(await fake.load(), "illustrator", fake.rows("tasks")[0], "page_plan", { url, name: "a.json" }, opts);
    const first = fake.rows("assets")[0].asset_id;
    await register(await fake.load(), "illustrator", fake.rows("tasks")[0], "page_plan", { url: again, name: "a.json" }, opts);
    expect(fake.rows("assets")).toHaveLength(1);
    expect(fake.rows("tasks")[0].output_asset_ids).toBe(first);
    expect(out.join("\n")).toContain("already registered");
  });
});

describe("F12: usage messages, not raw errors", () => {
  it("check, edges and apply with nothing to work on say how they are used", async () => {
    await expect(bot("illustrator", "check")).rejects.toThrow(/usage: check/);
    await expect(bot("illustrator", "edges")).rejects.toThrow(/usage: edges/);
    await expect(bot("orchestrator", "apply")).rejects.toThrow(/usage: apply/);
    const file = join(dir, "null.json");
    await writeFile(file, "[null]");
    await expect(bot("orchestrator", "apply", file)).rejects.toThrow(/each entry is/);
    await writeFile(file, "{ not json");
    await expect(bot("orchestrator", "apply", file)).rejects.toThrow(/usage: apply/);
  });
});

describe("the backend's spend guard sees reserved rows and ignores released ones", () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  it("halts when reserved rows reach the cap, and not for a released one", async () => {
    const row = (id: string, usd: string, note: string) => ({ cost_id: id, date: today, category: "ai_credits", amount_usd: usd, note });
    fake.put("costs", [row("C-1", "14.00", "image page p1 · x · attempt 1 · reserved"), row("C-2", "0", "image page p2 · x · attempt 1 · released")]);
    expect((await spendGuard(await fake.load())).halted).toBe(false);
    fake.put("costs", [row("C-3", "1.00", "image page p3 · x · attempt 1 · reserved")]);
    expect((await spendGuard(await fake.load())).halted).toBe(true);
    expect(fake.rows("config").find((c) => c.key === "system_status")?.value).toBe("HALT");
  });
});
