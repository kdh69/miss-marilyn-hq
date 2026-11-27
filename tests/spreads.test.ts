import { describe, expect, it } from "vitest";
import { bookMoments, partnerOf } from "../apps/web/lib/spreads";

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
