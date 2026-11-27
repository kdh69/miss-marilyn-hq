import { describe, expect, it } from "vitest";
import { bookMoments, partnerOf, teamSuggestion } from "../apps/web/lib/spreads";

describe("teamSuggestion", () => {
  const since = "2026-11-27T19:38:00Z";
  const p = { page_number: "14", text_final: "Her old words.", text_final_at: "2026-11-12T22:33:14Z", text_draft: "The new words.", updated_at: "2026-11-27T19:49:50Z", updated_by: "story_producer" };
  it("offers the Producer's rewrite from the open story task", () => expect(teamSuggestion(p, since)).toBe("The new words."));
  it("never offers a draft when no rewrite is open", () => expect(teamSuggestion(p, "")).toBe(""));
  it("ignores a row changed by someone else (a new picture)", () => expect(teamSuggestion({ ...p, updated_by: "illustrator" }, since)).toBe(""));
  it("ignores drafts older than the rewrite or than her words", () => {
    expect(teamSuggestion({ ...p, updated_at: "2026-11-12T23:42:05Z" }, since)).toBe("");
    expect(teamSuggestion({ ...p, text_final_at: "2026-11-27T20:00:00Z" }, since)).toBe("");
  });
  it("offers nothing when her words already match or the page isn't hers", () => {
    expect(teamSuggestion({ ...p, text_draft: "Her old words." }, since)).toBe("");
    expect(teamSuggestion({ ...p, text_final: "" }, since)).toBe("");
  });
});

const page = (n: number, extra: Record<string, string> = {}) => ({ page_id: `P${n}`, page_number: String(n), art_brief: "", art_file: "", ...extra });

describe("bookMoments", () => {
  it("joins a pair named by the art file into one spread", () => {
    const pages = [page(7), page(8, { art_file: "spread_draft_spread-08-09_C-1_p8.png" }), page(9, { art_file: "spread_draft_spread-08-09_C-1_p9.png" }), page(10)];
    const m = bookMoments(pages);
    expect(m.map((x) => x.label)).toEqual(["Page 7", "Pages 8–9", "Page 10"]);
    expect(m[1].spread).toBe(true);
    expect(m[1].pages.map((p) => p.page_number)).toEqual(["8", "9"]);
  });

  it("joins a pair named by the picture plan, from either page", () => {
    const pages = [page(10, { art_brief: "Two-page picture with p11 (pp. 10-11): Miss Marilyn notices Gussie" }), page(11), page(12), page(13, { art_brief: "NO TEXT on this page. It is the right half of the two-page picture with p12 (pp. 12-13)." })];
    expect(bookMoments(pages).map((x) => x.label)).toEqual(["Pages 10–11", "Pages 12–13"]);
  });

  it("keeps pages with their own pictures apart, and never pairs from an odd page", () => {
    const pages = [page(1), page(2), page(3), page(5, { art_brief: "Two-page picture with p6" }), page(6)];
    expect(bookMoments(pages).map((x) => x.label)).toEqual(["Page 1", "Page 2", "Page 3", "Page 5", "Page 6"]);
  });

  it("lets the picture plan win over an old spread file name", () => {
    const pages = [page(18, { art_file: "spread_draft_spread-18-19_p18.png", art_brief: "Single page: all afternoon they play on the slide." }), page(19, { art_file: "spread_draft_spread-18-19_p19.png", art_brief: "Single page: swings at sunset, no parents." })];
    expect(bookMoments(pages).map((x) => x.label)).toEqual(["Page 18", "Page 19"]);
  });

  it("reads partners from file names in either order", () => {
    expect(partnerOf(page(9, { art_file: "spread-08-09_p9.png" }))).toBe(8);
    expect(partnerOf(page(4))).toBeNull();
  });
});
