import { describe, expect, it } from "vitest";
import type { Row } from "../packages/core/src/sheet";
import { planRestore } from "../apps/backend/src/backup";
import { exportTeam } from "../apps/backend/src/teamExport";

describe("restoring MM Core from a backup", () => {
  const backup = {
    tasks: [{ task_id: "T-0001", title: "Story", status: "done" }, { task_id: "T-0002", title: "Art", status: "todo" }],
    config: [{ key: "system_status", value: "HALT", note: "n" }, { key: "daily_bot_cap_usd", value: "15", note: "" }],
    log: [{ ts: "2026-11-01T00:00:00Z", actor: "kyle", task_id: "T-0001", from_status: "", to_status: "todo", message: "" }],
    lists: [{ task_status: "todo" }],
  } as unknown as Record<string, Row[]>;
  const tab = (plan: ReturnType<typeof planRestore>, name: string) => plan.find((p) => p.tab === name)!;

  it("fills a fresh Sheet: appends what's missing, updates seeded rows that differ, never touches lists", () => {
    const fresh: Record<string, Row[]> = { config: [{ key: "system_status", value: "RUN", note: "n" }] as Row[] };
    const plan = planRestore(backup, (t) => fresh[t] ?? []);
    expect(tab(plan, "tasks").append.map((r) => r.task_id)).toEqual(["T-0001", "T-0002"]);
    expect(tab(plan, "tasks").append[0]).toHaveProperty("qc_notes", ""); // every header is written, by name
    expect(tab(plan, "config")).toMatchObject({ append: [{ key: "daily_bot_cap_usd" }], update: [{ id: "system_status", patch: { value: "HALT" } }] });
    expect(tab(plan, "log").append).toHaveLength(1);
    expect(plan.some((p) => p.tab === "lists")).toBe(false);
  });

  it("leaves a log that already has rows alone, and writes nothing where the Sheet already matches", () => {
    const live: Record<string, Row[]> = { log: [{ ts: "x" }] as Row[], tasks: [{ task_id: "T-0001", title: "Story", status: "done" }, { task_id: "T-0002", title: "Art", status: "in_progress" }] as Row[] };
    const plan = planRestore(backup, (t) => live[t] ?? []);
    expect(tab(plan, "log")).toMatchObject({ append: [], skipped: expect.stringContaining("left alone") });
    expect(tab(plan, "tasks").append).toEqual([]);
    expect(tab(plan, "tasks").update).toEqual([{ id: "T-0002", patch: { status: "todo" } }]);
  });
});

describe("the team as portable text", () => {
  const team = exportTeam();
  it("has every role, each with the house rules and no Claude-only header", () => {
    expect(Object.keys(team).sort()).toEqual(["builder", "critic", "illustrator", "lister", "marketer", "orchestrator", "producer", "qc", "quality-checker", "scout"]);
    for (const [name, text] of Object.entries(team)) {
      expect(text, name).toContain("## House rules");
      expect(text, name).toContain("MM Core only through `npm run bot`");
      expect(text, name).not.toMatch(/^---$/m);
      expect(text, name).not.toContain("CLAUDE_PROJECT_DIR");
    }
    expect(team.illustrator).toContain("You are the Illustrator");
  });
});
