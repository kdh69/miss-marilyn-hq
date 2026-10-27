import { describe, expect, it } from "vitest";
import { isLegalTransition } from "../packages/core/src/schema";

describe("status rules (spec §6)", () => {
  it("bots move work up to ready_for_qc", () => {
    expect(isLegalTransition("bot", "todo", "in_progress")).toBe(true);
    expect(isLegalTransition("bot", "in_progress", "ready_for_qc")).toBe(true);
    expect(isLegalTransition("bot", "in_progress", "blocked")).toBe(true);
    expect(isLegalTransition("bot", "qc_fail", "todo")).toBe(true);
  });

  it("bots can never approve, publish or skip QC", () => {
    for (const to of ["in_qc", "awaiting_mom", "approved", "publishing"]) {
      expect(isLegalTransition("bot", "ready_for_qc", to)).toBe(false);
      expect(isLegalTransition("bot", "in_progress", to)).toBe(false);
    }
    expect(isLegalTransition("bot", "awaiting_mom", "approved")).toBe(false);
  });

  it("bots may finish directly only when the task type skips QC", () => {
    expect(isLegalTransition("bot", "in_progress", "done", { needsQc: false })).toBe(true);
    expect(isLegalTransition("bot", "in_progress", "done", { needsQc: true })).toBe(false);
    expect(isLegalTransition("bot", "in_progress", "done")).toBe(false);
  });

  it("backend owns QC and Clara's answers", () => {
    expect(isLegalTransition("backend", "ready_for_qc", "in_qc")).toBe(true);
    expect(isLegalTransition("backend", "in_qc", "awaiting_mom")).toBe(true);
    expect(isLegalTransition("backend", "awaiting_mom", "approved")).toBe(true);
    expect(isLegalTransition("backend", "approved", "done")).toBe(true);
    expect(isLegalTransition("backend", "todo", "done")).toBe(false);
  });

  it("Kyle can override anything; no-ops are always fine", () => {
    expect(isLegalTransition("kyle", "todo", "approved")).toBe(true);
    expect(isLegalTransition("bot", "approved", "approved")).toBe(true);
  });
});
