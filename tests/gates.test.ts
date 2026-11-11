import { describe, expect, it } from "vitest";
import type { Row } from "../packages/core/src/sheet";
import { planImage, verifyClaim, type ImageRules } from "../apps/backend/src/lib/gates";
import type { Board } from "../apps/backend/src/lib/team";
import { checkKnowledge } from "../apps/backend/src/knowledge";

const TODAY = "2026-11-11";
const RULES: ImageRules = {
  kinds: { draft: { model: "fast", resolution: "1K", aspect: "1:1", fitToPage: false }, page: { model: "pro", resolution: "4K", aspect: "1:1", fitToPage: true } },
  models: {
    pro: { name: "Nano Banana Pro", endpoint: "fal-ai/nano-banana-pro", maxRefs: 5, usd: { "4K": 0.3 } },
    fast: { name: "Nano Banana 2", endpoint: "fal-ai/nano-banana-2", maxRefs: 14, usd: { "1K": 0.08 } },
  },
  maxAttemptsPerImage: 3,
  taskCapUsd: 6,
};
const TASK = { task_id: "T-0026", product_id: "MM-B02", task_type: "art_page", owner: "illustrator", status: "in_progress", output_asset_ids: "" } as Row;
const cost = (over: Partial<Row>): Row => ({ category: "ai_credits", date: TODAY, task_id: "T-0026", amount_usd: "0.30", note: "image page p5 · Nano Banana Pro 4K · attempt 1", ...over } as Row);

function board(tabs: Partial<Record<string, Row[]>> = {}, cap = "15"): Board {
  const all: Record<string, Row[]> = { tasks: [TASK], costs: [], assets: [], log: [], content: [], plans: [], ...tabs } as Record<string, Row[]>;
  return { rows: (tab) => all[tab] ?? [], config: (key) => (key === "daily_bot_cap_usd" ? cap : "") };
}

describe("the budget gate in front of a paid picture", () => {
  it("prices the call from the format and numbers the attempt", () => {
    const plan = planImage(board({ costs: [cost({})] }), TASK, "page", "p5", RULES, TODAY);
    expect(plan).toMatchObject({ usd: 0.3, attempt: 2, fitToPage: true, resolution: "4K", note: "image page p5 · Nano Banana Pro 4K · attempt 2" });
    expect(planImage(board(), TASK, "draft", "p5", RULES, TODAY)).toMatchObject({ usd: 0.08, attempt: 1 });
  });

  it("stops an image after three paid attempts, so a person decides", () => {
    const three = [1, 2, 3].map((n) => cost({ note: `image page p5 · Nano Banana Pro 4K · attempt ${n}` }));
    expect(() => planImage(board({ costs: three }), TASK, "page", "p5", RULES, TODAY)).toThrow(/3 paid attempts/);
    expect(planImage(board({ costs: three }), TASK, "page", "p6", RULES, TODAY).attempt).toBe(1); // another page is unaffected
  });

  it("refuses a call that would pass the task's cap or the day's cap", () => {
    const heavy = Array.from({ length: 20 }, (_, i) => cost({ note: `image page p${i + 1} · x` })); // $6.00 spent
    expect(() => planImage(board({ costs: heavy }), TASK, "page", "p24", RULES, TODAY)).toThrow(/pass its \$6 cap/);
    const elsewhere = [cost({ task_id: "T-0027", amount_usd: "14.80", note: "other" })];
    expect(() => planImage(board({ costs: elsewhere }), TASK, "page", "p5", RULES, TODAY)).toThrow(/\$15 daily cap/);
    expect(planImage(board({ costs: [cost({ task_id: "T-0027", amount_usd: "14.80", date: "2026-11-10", note: "other" })] }), TASK, "page", "p5", RULES, TODAY).usd).toBe(0.3);
  });

  it("needs a known kind and a named image", () => {
    expect(() => planImage(board(), TASK, "poster", "p5", RULES, TODAY)).toThrow(/kind is one of draft, page/);
    expect(() => planImage(board(), TASK, "page", "", RULES, TODAY)).toThrow(/name the image/);
  });
});

describe("an agent's report is checked against the board", () => {
  const asset = { asset_id: "A-T0026-01", file_url: "https://drive.google.com/file/d/x/view" } as Row;
  const log = (actor: string, from: string, to: string, message = ""): Row => ({ actor, task_id: "T-0026", from_status: from, to_status: to, message } as Row);

  it("ready for review needs uploaded files on an in_progress task", () => {
    expect(verifyClaim(board(), "illustrator", "T-0026 ready for review | self-check: all 9 items")).toMatch(/output_asset_ids is empty/);
    const done = board({ tasks: [{ ...TASK, output_asset_ids: "A-T0026-01" }], assets: [asset] });
    expect(verifyClaim(done, "illustrator", "Pages 3 and 4 are painted.\nT-0026 ready for review | self-check: all 9 items")).toBe("");
    expect(verifyClaim(board({ tasks: [{ ...TASK, status: "todo" }] }), "illustrator", "T-0026 ready for review")).toMatch(/is todo/);
  });

  it("blocked means the board says blocked", () => {
    expect(verifyClaim(board(), "illustrator", "T-0026 blocked | no image model")).toMatch(/is in_progress, not blocked/);
    expect(verifyClaim(board({ tasks: [{ ...TASK, status: "blocked" }] }), "illustrator", "T-0026 blocked | no image model")).toBe("");
  });

  it("a review verdict has to be the one in the log", () => {
    expect(verifyClaim(board(), "quality_checker", "T-0026 review pass")).toMatch(/no review in the log/);
    const failed = board({ log: [log("illustrator", "todo", "in_progress"), log("quality_checker", "in_progress", "in_progress", "review fail: 1. tail")] });
    expect(verifyClaim(failed, "quality_checker", "T-0026 review pass")).toMatch(/latest verdict on T-0026 is a fail/);
    expect(verifyClaim(failed, "quality_checker", "T-0026 review fail | 1 fix, see log")).toBe("");
  });

  it("a report without the closing line is sent back", () => {
    expect(verifyClaim(board(), "illustrator", "All done, the pages look great!")).toMatch(/end with one line/);
    expect(verifyClaim(board(), "illustrator", "T-9000 ready for review")).toMatch(/isn't on the board/);
  });
});

describe("the knowledge library", () => {
  it("follows its own format: a title, a review date, 5 to 12 rules, a dated label on every claim", () => {
    const k = checkKnowledge();
    expect(k.errors).toEqual([]);
    expect(k.claims).toBeGreaterThan(60);
  });
});
