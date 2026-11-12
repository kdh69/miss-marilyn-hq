import { describe, expect, it } from "vitest";
import type { Row } from "../packages/core/src/sheet";
import { coveredPages, normalizeSubject, planImage, recheckImage, subjectOf, verifyClaim, type ImageRules } from "../apps/backend/src/lib/gates";
import raw from "../formats/picture-book.json" with { type: "json" };
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
  maxAttemptsLifetime: 6,
  perImageCapUsd: { draft: 0.2, page: 0.75 },
  maxPicturesPerTask: 26,
};
const TASK = { task_id: "T-0026", product_id: "MM-B02", task_type: "art_page", title: "Pages 5-6", owner: "illustrator", status: "in_progress", output_asset_ids: "" } as Row;
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
    expect(() => planImage(board({ costs: three }), TASK, "page", "p5", RULES, TODAY)).toThrow(/3 paid attempts this round/);
    expect(planImage(board({ costs: three }), TASK, "page", "p6", RULES, TODAY).attempt).toBe(1); // another page is unaffected
  });

  it("refuses a call that would pass the task's budget or bring the day to its cap", () => {
    // Pages 5-6 is two pictures: $1.50 for pages. Five attempts across p5 and p6 is $1.50 spent.
    const spent = [5, 5, 5, 6, 6].map((p, i) => cost({ note: `image page p${p} · x · attempt ${i + 1}` }));
    expect(() => planImage(board({ costs: spent }), TASK, "page", "p6", RULES, TODAY)).toThrow(/would pass its \$1\.50 budget \(2 picture\(s\)/);
    const elsewhere = [cost({ task_id: "T-0027", amount_usd: "14.80", note: "other" })];
    expect(() => planImage(board({ costs: elsewhere }), TASK, "page", "p5", RULES, TODAY)).toThrow(/\$15 daily cap/);
    expect(planImage(board({ costs: [cost({ task_id: "T-0027", amount_usd: "14.80", date: "2026-11-10", note: "other" })] }), TASK, "page", "p5", RULES, TODAY).usd).toBe(0.3);
  });

  it("stops one picture short of the daily cap, where the spend guard would halt every write (F3)", () => {
    expect(() => planImage(board({ costs: [cost({ task_id: "T-0027", amount_usd: "14.70", note: "other" })] }), TASK, "page", "p5", RULES, TODAY)).toThrow(/daily cap/); // 14.70 + 0.30 = 15.00
    expect(planImage(board({ costs: [cost({ task_id: "T-0027", amount_usd: "14.69", note: "other" })] }), TASK, "page", "p5", RULES, TODAY).usd).toBe(0.3);
  });

  it("needs a known kind and a named image", () => {
    expect(() => planImage(board(), TASK, "poster", "p5", RULES, TODAY)).toThrow(/kind is one of draft, page/);
    expect(() => planImage(board(), TASK, "page", "", RULES, TODAY)).toThrow(/name the image/);
  });
});

describe("one picture, one name (F3)", () => {
  it("normalises page=05, P5 and page5 to p5, and refuses a name that looks like a page", () => {
    expect(subjectOf({ page: "05" })).toBe("p5");
    expect(subjectOf({ page: "12" })).toBe("p12");
    expect(subjectOf({ name: "Miss-Marilyn-Turnaround" })).toBe("miss-marilyn-turnaround");
    expect(() => subjectOf({ name: "page5" })).toThrow(/looks like a page: use page=5/);
    expect(() => subjectOf({ name: "p05" })).toThrow(/looks like a page/);
    expect(() => subjectOf({ page: "five" })).toThrow(/page number/);
    expect(() => subjectOf({})).toThrow(/name the image/);
    expect(() => subjectOf({ page: "5", name: "x" })).toThrow(/not both/);
    expect(["p05", "P5", "page5", "page-05", "p5"].map(normalizeSubject)).toEqual(["p5", "p5", "p5", "p5", "p5"]);
  });

  it("counts attempts at p5 whichever way it was spelled", () => {
    const three = [1, 2, 3].map((n) => cost({ note: `image page p5 · Nano Banana Pro 4K · attempt ${n}` }));
    for (const spelling of ["p05", "P5", "page5"]) expect(() => planImage(board({ costs: three }), TASK, "page", spelling, RULES, TODAY)).toThrow(/3 paid attempts/);
  });
});

describe("attempts count per round, with a lifetime limit (F6)", () => {
  const at = (n: number, over: Partial<Row> = {}) => cost({ note: `image page p5 · Nano Banana Pro 4K · attempt ${n}`, created_at: "2026-11-11T10:00:00Z", ...over });
  const started = (ts: string, from = "todo"): Row => ({ ts, actor: "illustrator", task_id: "T-0026", from_status: from, to_status: "in_progress", message: "" } as Row);

  it("a round that used its attempts can try again after the task goes back into work, up to the lifetime limit", () => {
    const used = [1, 2, 3].map((n) => at(n));
    const log = [started("2026-11-11T09:00:00Z")];
    expect(() => planImage(board({ costs: used, log }), TASK, "page", "p5", RULES, TODAY)).toThrow(/this round/);
    // QC failed it and the Orchestrator sent it back: a new round
    const again = [...log, started("2026-11-11T12:00:00Z")];
    expect(planImage(board({ costs: used, log: again }), TASK, "page", "p5", RULES, TODAY)).toMatchObject({ round: 1, lifetime: 4, attempt: 4 });
    // a start from in_progress to in_progress is not a new round
    expect(() => planImage(board({ costs: used, log: [...log, started("2026-11-11T12:00:00Z", "in_progress")] }), TASK, "page", "p5", RULES, TODAY)).toThrow(/this round/);
  });

  it("six rows at one picture, failures and releases included, end it for good: a loop of failures can't run forever", () => {
    const six = [at(1), at(2), at(3, { note: "image page p5 · x · attempt 3 · failed, not billed", amount_usd: "0" }), at(4, { note: "image page p5 · x · attempt 4 · released", amount_usd: "0" }), at(5, { note: "image page p5 · x · attempt 5 · failed, not billed", amount_usd: "0" }), at(6)];
    const log = [started("2026-11-11T12:00:00Z")]; // a fresh round, no live attempts in it
    expect(() => planImage(board({ costs: six, log }), TASK, "page", "p5", RULES, TODAY)).toThrow(/lifetime limit is 6/);
    expect(() => planImage(board({ costs: six.slice(0, 5), log }), TASK, "page", "p5", RULES, TODAY)).not.toThrow();
  });

  it("released and failed rows are not attempts; unconfirmed ones are", () => {
    const dead = [at(1, { note: "image page p5 · x · attempt 1 · released", amount_usd: "0" }), at(2, { note: "image page p5 · x · attempt 2 · failed, not billed", amount_usd: "0" }), at(3)];
    expect(planImage(board({ costs: dead }), TASK, "page", "p5", RULES, TODAY)).toMatchObject({ round: 2 });
    const unconfirmed = [1, 2, 3].map((n) => at(n, { note: `image page p5 · x · attempt ${n} · unconfirmed (request r${n})` }));
    expect(() => planImage(board({ costs: unconfirmed }), TASK, "page", "p5", RULES, TODAY)).toThrow(/3 paid attempts/);
  });

  it("the budget is per picture the task covers: its title's pages count even before they are drawn", () => {
    expect(coveredPages("Pages 3-4")).toEqual(["p3", "p4"]);
    expect(coveredPages("Page art, pages 5, 6 and 9")).toEqual(["p5", "p6", "p9"]);
    expect(coveredPages("pages 12 to 15")).toEqual(["p12", "p13", "p14", "p15"]);
    expect(coveredPages("The cover")).toEqual([]);
    expect(planImage(board(), TASK, "page", "p5", RULES, TODAY).budget).toEqual({ spent: 0, allowed: 1.5, pictures: 2 });
    // a whole book of pages is 24 x $0.75, not a flat $6
    const whole = { ...TASK, title: "Pages 1-24" } as Row;
    expect(planImage(board({ tasks: [whole] }), whole, "page", "p1", RULES, TODAY).budget).toMatchObject({ pictures: 24, allowed: 18 });
    // but a task can't grow its budget by inventing names
    const many = Array.from({ length: 27 }, (_, i) => cost({ note: `image page n${i} · x · attempt 1`, amount_usd: "0.01" }));
    expect(() => planImage(board({ costs: many }), TASK, "page", "n99", RULES, TODAY)).toThrow(/covers 30 page pictures/);
  });

  it("drafts have their own pool, so cheap drafts don't eat the page budget", () => {
    const pages = [5, 5, 6, 6].map((p, i) => cost({ note: `image page p${p} · x · attempt ${i + 1}` })); // $1.20 of $1.50
    expect(planImage(board({ costs: pages }), TASK, "draft", "p5", RULES, TODAY)).toMatchObject({ usd: 0.08, budget: { allowed: 0.4 } });
  });
});

describe("the real format file, against the evening's real spending (T-0033)", () => {
  const rules = raw.image as unknown as ImageRules;
  // The 11-11 clean-up: p15's final took 4 attempts and 2 drafts; p14 took 3 finals and 2 drafts (from .mm-work recipes).
  const finals = [["p14", 3], ["p15", 4]] as const;

  it("has no flat task cap, and each picture's budget is 3.5 x the kind's price", () => {
    expect(raw.image).not.toHaveProperty("taskCapUsd");
    for (const [kind, spec] of Object.entries(rules.kinds)) {
      expect(rules.perImageCapUsd?.[kind], kind).toBeCloseTo(3.5 * rules.models[spec.model].usd[spec.resolution], 2);
    }
    expect(rules.maxAttemptsPerImage).toBe(4);
    expect(rules.maxAttemptsLifetime).toBe(6);
  });

  /** Plans each call in turn against the snapshot of costs so far, as the bot does. Returns the first refusal. */
  const spend = (task: Row, calls: [string, string][], r: ImageRules) => {
    const costs: Row[] = [];
    for (const [kind, subject] of calls) {
      try {
        const plan = planImage(board({ tasks: [task], costs }), task, kind, subject, r, TODAY);
        costs.push(cost({ task_id: task.task_id, amount_usd: plan.usd.toFixed(2), note: plan.note }));
      } catch (e) {
        return { refused: `${kind} ${subject}: ${(e as Error).message}`, made: costs.length };
      }
    }
    return { refused: "", made: costs.length };
  };
  const t33 = { ...TASK, task_id: "T-0033", title: "Pages 14-15" } as Row;
  const evening: [string, string][] = [...[["page", "p14"], ["page", "p14"], ["page", "p14"], ["page", "p15"], ["page", "p15"], ["page", "p15"], ["page", "p15"]] as [string, string][], ["draft", "p14"], ["draft", "p14"], ["draft", "p15"], ["draft", "p15"]];

  it("at 3.5 x the price ($1.05 a page, the real file) all of the evening's T-0033 goes through; the round's 4 attempts stop a 5th on p15, and the 6th ever stops it for good", () => {
    expect(spend(t33, evening, rules)).toEqual({ refused: "", made: 11 });
    expect(spend(t33, [...evening, ["page", "p15"]], rules).refused).toMatch(/p15 has had 4 paid attempts this round \(the limit is 4\)/);
  });

  it("at 2.5 x the price ($0.75 a page, the first design) the same evening was refused at its 6th final, which is why Kyle chose 3.5 x", () => {
    const tight = { ...rules, perImageCapUsd: { ...rules.perImageCapUsd, page: 0.75 } } as ImageRules;
    const r = spend(t33, evening, tight);
    expect(r.made).toBe(5);
    expect(r.refused).toMatch(/^page p15: T-0033 has spent \$1\.50 on page pictures; this \$0\.30 one would pass its \$1\.50 budget \(2 picture\(s\) at \$0\.75 each\)/);
  });

  it("a two-page task is budgeted $2.10: 4 finals on each page would be $2.40, so the 4th on the second page is refused", () => {
    const task = { ...TASK, task_id: "T-0032", title: "Pages 12-13" } as Row;
    const calls = [["p12", 4], ["p13", 4]].flatMap(([p, n]) => Array.from({ length: Number(n) }, () => ["page", String(p)] as [string, string]));
    expect(spend(task, calls, rules).refused).toMatch(/^page p13: T-0032 has spent \$2\.10 on page pictures; this \$0\.30 one would pass its \$2\.10 budget \(2 picture\(s\) at \$1\.05 each\)/);
  });
});

describe("re-checking after the row is reserved", () => {
  const reserved = (n: number, over: Partial<Row> = {}) => cost({ note: `image page p5 · x · attempt ${n} · reserved`, ...over });

  it("passes when this call's own row is the only one, and refuses when another reserved first", () => {
    expect(recheckImage(board({ costs: [reserved(1)] }), TASK, "page", "p5", RULES, TODAY)).toBe("");
    const crowded = [1, 2, 3, 4].map((n) => reserved(n)); // 4 live rows > 3
    expect(recheckImage(board({ costs: crowded }), TASK, "page", "p5", RULES, TODAY)).toMatch(/4 paid attempts this round/);
    const day = [cost({ task_id: "T-0027", amount_usd: "14.70", note: "x" }), reserved(1)]; // 15.00 with this one
    expect(recheckImage(board({ costs: day }), TASK, "page", "p5", RULES, TODAY)).toMatch(/daily cap/);
    const heavy = [1, 2, 3].flatMap((n) => [reserved(n, { note: `image page p5 · x · attempt ${n}` }), cost({ note: `image page p6 · x · attempt ${n}` })]); // $1.80 > $1.50
    expect(recheckImage(board({ costs: heavy }), TASK, "page", "p5", RULES, TODAY)).toMatch(/budget/);
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

  it("only the closing line is the claim (F10)", () => {
    const healthy = board();
    // an earlier sentence about another task being blocked is not a claim about this one
    expect(verifyClaim(healthy, "illustrator", "T-0027 is blocked on the reference photos, so I did T-0026 first.\nT-0026 handed in")).toMatch(/is in_progress, not handed in/);
    expect(verifyClaim(healthy, "illustrator", "I saw T-0030 blocked and a review fail on T-0031.\nPages 3 and 4 painted.\n\n")).toMatch(/end with one line/);
    const done = board({ tasks: [{ ...TASK, output_asset_ids: "A-T0026-01" }], assets: [asset] });
    expect(verifyClaim(done, "illustrator", "T-0027 is blocked, T-0030 review fail.\nT-0026 ready for review | self-check: all 9 items\n")).toBe("");
  });

  it("a maker that already handed in can close with 'T-#### handed in' (F10)", () => {
    for (const status of ["ready_for_qc", "in_qc", "awaiting_mom", "done"]) {
      expect(verifyClaim(board({ tasks: [{ ...TASK, status }] }), "illustrator", `Handed in.\nT-0026 handed in`)).toBe("");
    }
    expect(verifyClaim(board({ tasks: [{ ...TASK, status: "todo" }] }), "illustrator", "T-0026 handed in")).toMatch(/not handed in/);
    expect(verifyClaim(board({ tasks: [{ ...TASK, status: "ready_for_qc" }] }), "illustrator", "T-0026 ready for review")).toMatch(/is ready_for_qc/);
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
