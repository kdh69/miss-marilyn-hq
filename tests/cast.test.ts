import { describe, expect, it } from "vitest";
import { castFor, facingPage } from "../apps/backend/src/lib/cast";

const canon = [
  { canon_id: "CN-01", kind: "character", name: "Miss Marilyn", look: "Small fluffy white cat, nose smudge on the viewer's left.", reference_ids: "A-25-40, A-25-46", status: "active", applies_to: "series" },
  { canon_id: "CN-02", kind: "prop", name: "Red string", look: "One thin wavy red cord.", reference_ids: "A-25-40", status: "active", applies_to: "series" },
  { canon_id: "CN-03", kind: "character", name: "Mama", look: "Soft cream cat with pale ginger patches.", reference_ids: "A-25-05, A-25-46", status: "active", applies_to: "series" },
  { canon_id: "CN-05", kind: "character", name: "Gussie", look: "Young lean black-and-tan pup.", reference_ids: "A-25-15", status: "active", applies_to: "MM-B02" },
  { canon_id: "CN-14", kind: "style", name: "The look of the books", look: "Watercolour and ink.", reference_ids: "A-STYLE", status: "active", applies_to: "series" },
  { canon_id: "CN-99", kind: "character", name: "Old friend", look: "Retired.", reference_ids: "", status: "retired", applies_to: "series" },
];
const base = { canon, productId: "MM-B02", maxRefs: 5, refs: [] as string[] };

describe("castFor", () => {
  it("adds each member's canon look word for word, with the red string and the style", () => {
    const c = castFor({ ...base, cast: "CN-01,Gussie", prompt: "Miss Marilyn points at the seesaw; Gussie looks up." });
    expect(c.errors).toEqual([]);
    expect(c.members.map((m) => m.canon_id)).toEqual(["CN-01", "CN-05", "CN-02", "CN-14"]);
    expect(c.text).toContain("- Miss Marilyn: Small fluffy white cat, nose smudge on the viewer's left.");
    expect(c.text).toContain("- Gussie: Young lean black-and-tan pup.");
    expect(c.text).toContain("- The look of the books: Watercolour and ink.");
  });

  it("keeps the caller's references first, then each member's first reference before any second, up to the model's limit", () => {
    const c = castFor({ ...base, cast: "Miss Marilyn, Mama", prompt: "Miss Marilyn and Mama", refs: ["APPROVED-DRAFT"], maxRefs: 4 });
    expect(c.refs).toEqual(["APPROVED-DRAFT", "A-25-40", "A-25-05", "A-STYLE"]);
    expect(c.dropped).toEqual(["A-25-46"]);
  });

  it("never lets the caller's extra refs crowd out a character's own sheet", () => {
    const c = castFor({ ...base, cast: "Miss Marilyn, Mama", prompt: "Miss Marilyn and Mama", refs: ["DRAFT", "X1", "X2", "X3", "X4"], maxRefs: 5 });
    expect(c.refs).toEqual(["DRAFT", "A-25-40", "A-25-05", "X1", "X2"]);
    expect(c.dropped).toEqual(["X3", "X4", "A-STYLE", "A-25-46"]);
  });

  it("leaves the page style off a character sheet", () => {
    const c = castFor({ ...base, cast: "Miss Marilyn", prompt: "Miss Marilyn, front and back", kind: "sheet" });
    expect(c.members.map((m) => m.canon_id)).toEqual(["CN-01", "CN-02"]);
  });

  it("refuses a prompt that names a canon character the cast leaves out", () => {
    const c = castFor({ ...base, cast: "CN-01", prompt: "Miss Marilyn waves at Mama by the gate." });
    expect(c.errors.join()).toMatch(/names Mama but cast= leaves out CN-03/);
  });

  it("refuses an unknown or retired cast name, and a character from another book", () => {
    expect(castFor({ ...base, cast: "Zoey", prompt: "x" }).errors.join()).toMatch(/Zoey/);
    expect(castFor({ ...base, cast: "CN-99", prompt: "x" }).errors.join()).toMatch(/CN-99/);
    expect(castFor({ ...base, productId: "MM-B01", cast: "Gussie", prompt: "x" }).errors.join()).toMatch(/Gussie/);
  });

  it("refuses the facing page's picture as a reference, but allows the same page's approved draft", () => {
    const assets = [
      { asset_id: "P14", product_id: "MM-B02", asset_type: "page_art", page_number: "14" },
      { asset_id: "P15-DRAFT", product_id: "MM-B02", asset_type: "page_art", page_number: "15" },
    ];
    const bad = castFor({ ...base, cast: "CN-01", prompt: "Miss Marilyn", refs: ["P14"], page: 15, assets });
    expect(bad.errors.join()).toMatch(/P14 is the picture on page 14, which faces page 15/);
    const ok = castFor({ ...base, cast: "CN-01", prompt: "Miss Marilyn", refs: ["P15-DRAFT"], page: 15, assets });
    expect(ok.errors).toEqual([]);
  });

  it("knows which page faces which", () => {
    expect([facingPage(1), facingPage(4), facingPage(5), facingPage(14), facingPage(15)]).toEqual([0, 5, 4, 15, 14]);
  });
});
