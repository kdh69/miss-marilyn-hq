import { describe, expect, it } from "vitest";
import type { Row } from "../packages/core/src/sheet";
import { isPagePicture, latestReview, mintAssetId, planMove, planOps, planReview, type Board } from "../apps/backend/src/lib/team";

const NOW = "2026-11-11T15:00:00Z";
const task = (over: Partial<Row>): Row => ({
  task_id: "T-0026", product_id: "MM-B02", sku: "", task_type: "art_page", title: "Pages 3-4", brief: "Paint pages 3-4.", owner: "illustrator",
  status: "todo", priority: "P1", output_asset_ids: "", qc_attempts: "", qc_notes: "", mom_note: "", blocked_reason: "", ...over,
} as Row);

function board(over: Partial<Record<string, Row[]>> = {}, config: Record<string, string> = {}): Board {
  const tabs: Record<string, Row[]> = {
    products: [
      { product_id: "MM-B02", line: "MM", series_no: "1", title: "Makes a Friend", status: "in_production" },
      { product_id: "MM-B01", line: "MM", series_no: "2", title: "Flies", status: "paused" },
    ],
    skus: [{ sku: "MM-B02-PB", product_id: "MM-B02" }],
    task_types: [
      { task_type: "art_page", default_owner: "illustrator", needs_qc: "TRUE" },
      { task_type: "book_plan", default_owner: "orchestrator", needs_qc: "FALSE" },
      { task_type: "marketing_plan", default_owner: "growth", needs_qc: "TRUE" },
    ],
    tasks: [task({})],
    assets: [{ asset_id: "A-T0026-01", task_id: "T-0026", file_url: "https://drive.google.com/file/d/x/view", created_by: "illustrator" }],
    pages: [{ page_id: "MM-B02-p03", product_id: "MM-B02", page_number: "3", text_draft: "Hello.", text_final: "" }],
    requests: [{ request_id: "Q-1", from: "mom", to: "orchestrator", status: "new", body: "New book idea: …" }, { request_id: "R-0004", from: "orchestrator", to: "mom", status: "new" }],
    lessons: [{ lesson_id: "L-0020", status: "active" }],
    log: [], plans: [], content: [], listings: [], research: [], costs: [],
    ...over,
  } as Record<string, Row[]>;
  return { rows: (tab) => tabs[tab] ?? [], config: (key) => config[key] ?? (key === "system_status" ? "RUN" : "") };
}
const log = (actor: string, from: string, to: string, message = ""): Row => ({ ts: NOW, actor, task_id: "T-0026", from_status: from, to_status: to, message });
const working = [log("orchestrator", "", "todo"), log("illustrator", "todo", "in_progress")];

describe("row writes by role", () => {
  it("the Producer writes draft text and never Clara's", () => {
    const [op] = planOps(board(), "story_producer", [{ tab: "pages", id: "MM-B02-p03", set: { text_draft: "Hi there." } }], NOW);
    expect(op).toMatchObject({ kind: "update", id: "MM-B02-p03", row: { text_draft: "Hi there.", updated_by: "story_producer" } });
    expect(() => planOps(board(), "story_producer", [{ tab: "pages", id: "MM-B02-p03", set: { text_final: "Mine now." } }], NOW)).toThrow(/text_final isn't story_producer's/);
  });

  it("the Illustrator sets only a page's art, and only to a real asset", () => {
    expect(planOps(board(), "illustrator", [{ tab: "pages", id: "MM-B02-p03", set: { art_asset_id: "A-T0026-01" } }], NOW)).toHaveLength(1);
    expect(() => planOps(board(), "illustrator", [{ tab: "pages", id: "MM-B02-p03", set: { art_asset_id: "A-nope" } }], NOW)).toThrow(/no asset/);
    expect(() => planOps(board(), "illustrator", [{ tab: "pages", id: "MM-B02-p03", set: { text_draft: "x" } }], NOW)).toThrow(/isn't illustrator's/);
  });

  it("only the Orchestrator creates tasks, always as todo with the next ID and the default owner", () => {
    const ops = [{ tab: "tasks", set: { product_id: "MM-B02", task_type: "art_page", title: "Pages 5-6", brief: "Paint 5-6." } }];
    const [a, b] = planOps(board(), "orchestrator", [...ops, ...ops], NOW);
    expect(a).toMatchObject({ kind: "append", id: "T-0027", row: { status: "todo", owner: "illustrator", created_by: "orchestrator", priority: "P2" } });
    expect(b.id).toBe("T-0028");
    expect(() => planOps(board(), "builder", ops, NOW)).toThrow(/builder can't write tasks/);
    expect(() => planOps(board(), "orchestrator", [{ tab: "tasks", id: "T-0026", set: { status: "done" } }], NOW)).toThrow(/status isn't orchestrator's/);
    expect(() => planOps(board(), "orchestrator", [{ tab: "tasks", id: "T-0026", set: { qc_result: "pass" } }], NOW)).toThrow(/qc_result/);
  });

  it("no work on a paused or retired product", () => {
    const op = { tab: "tasks", set: { product_id: "MM-B01", task_type: "art_page", title: "x", brief: "y" } };
    expect(() => planOps(board(), "orchestrator", [op], NOW)).toThrow(/MM-B01 is paused or retired/);
    expect(() => planOps(board(), "orchestrator", [{ tab: "products", id: "MM-B02", set: { status: "retired" } }], NOW)).toThrow(/only Kyle/);
  });

  it("someone else's request changes only in status and task_id", () => {
    expect(planOps(board(), "orchestrator", [{ tab: "requests", id: "Q-1", set: { status: "in_progress", task_id: "T-0026" } }], NOW)).toHaveLength(1);
    expect(() => planOps(board(), "orchestrator", [{ tab: "requests", id: "Q-1", set: { body: "rewritten" } }], NOW)).toThrow(/only status and task_id/);
    const [q] = planOps(board(), "orchestrator", [{ tab: "requests", set: { to: "mom", product_id: "MM-B02", body: "Pen name or real name?" } }], NOW);
    expect(q).toMatchObject({ id: "R-0005", row: { from: "orchestrator", kind: "question", status: "new" } });
  });

  it("dropdown values and backend columns are checked, and one bad op stops the whole batch", () => {
    expect(() => planOps(board(), "growth", [{ tab: "content", set: { product_id: "MM-B02", task_id: "T-0026", channel: "MYSPACE", content_type: "post", scheduled_for: "2026-11-20" } }], NOW)).toThrow(/isn't in channel/);
    expect(() => planOps(board(), "growth", [{ tab: "content", set: { product_id: "MM-B02", task_id: "T-0026", channel: "INSTAGRAM", content_type: "post", scheduled_for: "Friday" } }], NOW)).toThrow(/YYYY-MM-DD/);
    expect(() => planOps(board(), "publisher", [{ tab: "listings", set: { sku: "MM-B02-PB", channel: "KDP", status: "live" } }], NOW)).toThrow(/isn't publisher's to set/);
    expect(() => planOps(board(), "publisher", [{ tab: "listings", set: { sku: "MM-B02-PB", channel: "KDP", live_url: "https://x" } }], NOW)).toThrow(/live_url/);
    const [l] = planOps(board(), "publisher", [{ tab: "listings", set: { sku: "MM-B02-PB", channel: "KDP", status: "packet_ready", title: "Makes a Friend" } }], NOW);
    expect(l.id).toBe("MM-B02-PB-KDP");
    expect(() => planOps(board(), "quality_checker", [{ tab: "pages", id: "MM-B02-p03", set: { text_draft: "x" } }], NOW)).toThrow(/can't write/);
    expect(() => planOps(board(), "scout", [{ tab: "tasks", id: "T-0026", set: { brief: "x" } }], NOW)).toThrow(/can't write/);
  });

  it("mints asset IDs per task", () => {
    expect(mintAssetId(["A-T0026-01", "A-T0026-07", "A-T0039-51"], "T-0026")).toBe("A-T0026-08");
    expect(mintAssetId([], "T-0040")).toBe("A-T0040-01");
  });
});

describe("status moves by role", () => {
  it("the owner starts a task; nobody else does, and not past three at once", () => {
    expect(planMove(board(), "illustrator", "T-0026", "start", "")).toMatchObject({ from: "todo", to: "in_progress" });
    expect(() => planMove(board(), "builder", "T-0026", "start", "")).toThrow(/illustrator's task/);
    const busy = [1, 2, 3].map((n) => task({ task_id: `T-010${n}`, status: "in_progress" }));
    expect(() => planMove(board({ tasks: [task({}), ...busy] }), "illustrator", "T-0026", "start", "")).toThrow(/already has 3/);
  });

  it("nothing moves on HALT or on a paused book", () => {
    expect(() => planMove(board({}, { system_status: "HALT" }), "illustrator", "T-0026", "start", "")).toThrow(/HALT/);
    expect(() => planMove(board({ tasks: [task({ product_id: "MM-B01" })] }), "illustrator", "T-0026", "start", "")).toThrow(/paused or retired/);
  });

  it("a hand-in needs files, a self-check and a Quality Checker pass from this round", () => {
    const inProgress = task({ status: "in_progress", output_asset_ids: "A-T0026-01" });
    const go = (logRows: Row[], t = inProgress, note = "self-check: 12 of 12 blocking items checked") => planMove(board({ tasks: [t], log: logRows }), "illustrator", "T-0026", "handin", note);

    expect(() => go(working, task({ status: "in_progress" }))).toThrow(/output_asset_ids is empty/);
    expect(() => go(working)).toThrow(/no Quality Checker review/);
    expect(() => go([...working, log("quality_checker", "in_progress", "in_progress", "review fail: 1. p3 has six toes")])).toThrow(/latest verdict is a fail/);
    const passed = [...working, log("quality_checker", "in_progress", "in_progress", "review fail: 1. p3 has six toes"), log("quality_checker", "in_progress", "in_progress", "review pass: checked all 12")];
    expect(() => go(passed, inProgress, "done")).toThrow(/self-check/);
    expect(go(passed)).toMatchObject({ from: "in_progress", to: "ready_for_qc" });

    // A pass from before a QC fail doesn't carry over to the next round.
    const nextRound = [...passed, log("illustrator", "in_progress", "ready_for_qc"), log("backend", "in_qc", "qc_fail"), log("orchestrator", "qc_fail", "todo"), log("illustrator", "todo", "in_progress")];
    expect(() => go(nextRound)).toThrow(/no Quality Checker review/);
  });

  it("a week of posts hands in the pictures its posts use", () => {
    const batch = task({ task_type: "social_batch", owner: "growth", status: "in_progress" });
    const b = board({
      tasks: [batch], task_types: [{ task_type: "social_batch", default_owner: "growth", needs_qc: "TRUE" }],
      content: [{ content_id: "C-0001", task_id: "T-0026", asset_ids: "A-T0026-01" }, { content_id: "C-0002", task_id: "T-0026", asset_ids: "A-T0026-01" }],
      log: [log("growth", "todo", "in_progress"), log("quality_checker", "in_progress", "in_progress", "review pass: 7 posts")],
    });
    expect(planMove(b, "growth", "T-0026", "handin", "self-check: 7 posts, links carry UTMs").patch).toMatchObject({ status: "ready_for_qc", output_asset_ids: "A-T0026-01" });
  });

  it("tasks that skip QC go straight to done, and never ones that need it", () => {
    const plan = task({ task_type: "book_plan", owner: "orchestrator", status: "in_progress" });
    expect(planMove(board({ tasks: [plan] }), "orchestrator", "T-0026", "handin", "plan written")).toMatchObject({ to: "done" });
  });

  it("only the Orchestrator sends work back, and the reason goes into the brief once", () => {
    const failed = task({ status: "qc_fail", qc_attempts: "1", qc_notes: "BLOCKING: p3 has six toes" });
    expect(() => planMove(board({ tasks: [failed] }), "illustrator", "T-0026", "todo", "again")).toThrow(/only the Orchestrator/);
    const move = planMove(board({ tasks: [failed] }), "orchestrator", "T-0026", "todo", "QC fail 1");
    expect(move.patch.brief).toMatch(/^QC FAIL \(attempt 1\): BLOCKING: p3 has six toes\n\nPaint pages 3-4\.$/);
    const again = planMove(board({ tasks: [{ ...failed, brief: move.patch.brief! }] }), "orchestrator", "T-0026", "todo", "QC fail 1");
    expect(again.patch.brief).toBeUndefined();
    expect(() => planMove(board({ tasks: [task({ status: "awaiting_mom" })] }), "orchestrator", "T-0026", "todo", "x")).toThrow(/isn't a move the team can make/);
  });

  it("no role can reach a backend status", () => {
    for (const status of ["ready_for_qc", "in_qc", "awaiting_mom", "approved"]) {
      expect(() => planMove(board({ tasks: [task({ status })] }), "illustrator", "T-0026", "handin", "self-check: x")).toThrow();
    }
  });
});

describe("Quality Checker reviews", () => {
  it("are log rows on in_progress work and count the fails in this round", () => {
    const b = board({ tasks: [task({ status: "in_progress" })], log: [...working, log("quality_checker", "in_progress", "in_progress", "review fail: 1. tail")] });
    expect(planReview(b, "T-0026", "fail", "1. tail again")).toMatchObject({ status: "in_progress", message: "review fail: 1. tail again", fails: 2 });
    expect(latestReview(b, "T-0026")).toMatchObject({ pass: false, fails: 1 });
    expect(() => planReview(board(), "T-0026", "pass", "fine")).toThrow(/todo; reviews happen while it's in_progress/);
    expect(() => planReview(b, "T-0026", "maybe", "hm")).toThrow(/pass or fail/);
  });
});

describe("isPagePicture", () => {
  it("only the colour page art becomes the page's picture, never its ink layer", () => {
    expect(isPagePicture("illustrator", "page_art", { page: "3" }, "page_p3_a1.png")).toBe(true);
    expect(isPagePicture("illustrator", "page_art", { page: "3", version: "ink" }, "x.png")).toBe(false);
    expect(isPagePicture("illustrator", "page_art", { page: "3" }, "page_p3_a1_ink.png")).toBe(false);
    expect(isPagePicture("illustrator", "page_art", {}, "x.png")).toBe(false);
    expect(isPagePicture("builder", "page_art", { page: "3" }, "x.png")).toBe(false);
  });
});
