import { FakeSheets, seeded } from "./helpers/fakeSheets"; // first: it removes live credentials and the call pacing
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { run, type Deps } from "../apps/backend/src/bot";
import { ImageCallError } from "../apps/backend/src/lib/image";

/** `image` on a ledger: reserve the costs row, re-check, call, write the file, settle. No fal is ever called: `generate` is a fake. */
const TASK = "T-9002";
const WORK = new URL(`../.mm-work/${TASK}/`, import.meta.url).pathname;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

let fake: FakeSheets;
let prompt: string;
const out: string[] = [];
vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));

const png = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "#ddd" } }).png().toBuffer();
const good: NonNullable<Deps["generate"]> = async () => ({ png: await png(), endpoint: "fal-ai/nano-banana-pro", requestId: "req-1" });

async function image(generate: NonNullable<Deps["generate"]>, ...args: string[]) {
  out.length = 0;
  return run(await fake.load(), "illustrator", "image", [TASK, prompt, ...args], { generate });
}
const costs = () => fake.rows("costs");
const files = () => (existsSync(WORK) ? readdirSync(WORK).filter((f) => f.endsWith(".png")) : []);

beforeEach(async () => {
  fake = seeded();
  fake.put("tasks", [{ task_id: TASK, product_id: "MM-B02", task_type: "art_page", title: "Pages 3-4", brief: "Paint.", owner: "illustrator", status: "in_progress", priority: "P1" }]);
  prompt = join(await mkdtemp(join(tmpdir(), "mm-image-")), "prompt.txt");
  await writeFile(prompt, "Page 5: Miss Marilyn and Gussie on the hill, afternoon light, full bleed, no border.");
  await rm(WORK, { recursive: true, force: true });
});
afterAll(() => rm(WORK, { recursive: true, force: true }));

describe("a picture is reserved before the call and settled after it", () => {
  it("writes the costs row first, at the estimate, then drops 'reserved' when the call succeeded", async () => {
    let during: Record<string, string>[] = [];
    await image(async (...a) => {
      during = costs(); // what the Sheet says while fal is working
      return good(...a);
    }, "kind=page", "page=5");
    expect(during).toHaveLength(1);
    expect(during[0]).toMatchObject({ amount_usd: "0.30", vendor: "fal.ai", task_id: TASK, role: "illustrator", note: expect.stringMatching(/ · reserved$/) });
    const [row] = costs();
    expect(row.cost_id).toMatch(/^C-\d{14}-[a-z0-9]{4}$/);
    expect(row.note).toBe("image page p5 · Nano Banana Pro 4K · attempt 1");
    expect(row.amount_usd).toBe("0.30");
    // the file carries the costs row's ID, not an attempt number
    expect(files()).toContain(`page_p5_${row.cost_id}.png`);
    expect(out.join("\n")).toContain("attempt 1 of 4 this round (1 of 6 ever)");
  });

  it("a failed job costs nothing: $0 and 'failed, not billed', and the attempt doesn't count", async () => {
    await expect(image(async () => { throw new ImageCallError("fal: no image returned"); }, "kind=page", "page=5")).rejects.toThrow(/not billed/);
    expect(costs()[0]).toMatchObject({ amount_usd: "0", note: expect.stringMatching(/ · failed, not billed$/) });
    await image(good, "kind=page", "page=5");
    expect(out.join("\n")).toContain("attempt 1 of 4 this round (2 of 6 ever)"); // a live attempt is counted, the failed one is not
  });

  it("a timeout or a lost download keeps the full price, 'unconfirmed (request …)', and counts as an attempt", async () => {
    await expect(image(async () => { throw new ImageCallError("still IN_PROGRESS after 6 minutes; cancelled", "req-77", true); }, "kind=page", "page=5")).rejects.toThrow(/unconfirmed \(request req-77\)/);
    expect(costs()[0]).toMatchObject({ amount_usd: "0.30", note: expect.stringMatching(/ · unconfirmed \(request req-77\)$/) });
    await image(good, "kind=page", "page=5");
    expect(out.join("\n")).toContain("attempt 2 of 4 this round");
  });

  it("releases the row and refuses when another process reserved meanwhile and the day is now at its cap", async () => {
    fake.put("costs", [{ cost_id: "C-old", date: today(), category: "ai_credits", amount_usd: "14.40", task_id: "T-0500", note: "other work" }]);
    let called = false;
    // another `image`, in another process, reserves a picture the moment ours lands
    fake.onAppend = (tab, rows) => {
      if (tab !== "costs" || rows[0][0].startsWith("C-other")) return;
      fake.put("costs", [{ cost_id: "C-other", date: today(), category: "ai_credits", amount_usd: "0.30", task_id: "T-0501", note: "image page p9 · x · attempt 1 · reserved" }]);
    };
    await expect(image(async (...a) => { called = true; return good(...a); }, "kind=page", "page=5")).rejects.toThrow(/daily cap[\s\S]*released/);
    expect(called).toBe(false);
    const mine = costs().find((c) => c.task_id === TASK)!;
    expect(mine).toMatchObject({ amount_usd: "0", note: expect.stringMatching(/ · released$/) });
    expect(files()).toEqual([]);
  });

  it("releases when parallel calls at one picture pushed it past its attempts this round", async () => {
    const live = (n: number) => ({ cost_id: `C-${n}`, date: today(), category: "ai_credits", amount_usd: "0.30", task_id: TASK, note: `image page p5 · Nano Banana Pro 4K · attempt ${n}` });
    fake.put("costs", [live(1), live(2), live(3)]); // the 4th is allowed
    fake.onAppend = (tab, rows) => {
      if (tab === "costs" && !rows[0][0].startsWith("C-9")) fake.put("costs", [live(9)]); // a parallel call's reserve
    };
    await expect(image(good, "kind=page", "page=5")).rejects.toThrow(/paid attempts this round/);
    expect(costs().find((c) => c.note.endsWith("released"))).toBeTruthy();
  });

  it("two calls at one picture at once make two files, not one overwritten", async () => {
    await Promise.all([image(good, "kind=page", "page=5"), image(good, "kind=page", "page=5")]);
    expect(new Set(costs().map((c) => c.cost_id)).size).toBe(2);
    expect(files()).toHaveLength(2);
  });

  it("if the settle write fails the picture is still on disk and the row still reads reserved at full price", async () => {
    fake.failOnce = { match: /^update costs/, error: new Error("Quota exceeded for quota metric 'Write requests'") };
    await image(good, "kind=page", "page=5");
    expect(files()).toHaveLength(1);
    expect(costs()[0]).toMatchObject({ amount_usd: "0.30", note: expect.stringMatching(/ · reserved$/) });
    expect(out.join("\n")).toMatch(/couldn't update C-.*reserved/);
  });

  it("counts page=05 and page=5 as the same picture, and refuses name=page5", async () => {
    await image(good, "kind=page", "page=05");
    await expect(image(good, "kind=page", "name=page5")).rejects.toThrow(/looks like a page/);
    await image(good, "kind=page", "page=5");
    expect(costs().map((c) => c.note.slice(0, 13))).toEqual(["image page p5", "image page p5"]);
    expect(costs()[1].note).toContain("attempt 2");
  });
});

describe("a cost is recorded by the task's owner only", () => {
  it("refuses another role and mints the new ID shape", async () => {
    fake.put("tasks", [{ task_id: "T-9003", product_id: "MM-B02", task_type: "art_page", title: "x", brief: "y", owner: "builder", status: "in_progress" }]);
    await expect(run(await fake.load(), "illustrator", "cost", ["T-9003", "1.50", "fal.ai", "an outside call"])).rejects.toThrow(/only its owner/);
    await run(await fake.load(), "builder", "cost", ["T-9003", "1.50", "fal.ai", "an outside call"]);
    expect(costs()[0].cost_id).toMatch(/^C-\d{14}-[a-z0-9]{4}$/);
  });
});
