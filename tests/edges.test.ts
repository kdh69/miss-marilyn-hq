import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { edgeReport } from "../apps/backend/src/lib/image";

const W = 1000;
const solid = (rgb: [number, number, number], size = W) =>
  sharp({ create: { width: size, height: size, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } });

describe("edgeReport", () => {
  it("flags nothing on a clean scene and gives a montage of four strips", async () => {
    const png = await solid([170, 200, 150]).png().toBuffer();
    const r = await edgeReport(png);
    expect(r.flags).toEqual([]);
    const meta = await sharp(r.montage).metadata();
    expect(meta.width).toBe(W);
    expect(meta.height).toBe(4 * 40 + 3 * 8);
  });

  it("works on a page that is not square (2588 x 2625 like the real ones)", async () => {
    const png = await sharp({ create: { width: 1000, height: 1015, channels: 3, background: { r: 170, g: 200, b: 150 } } }).png().toBuffer();
    const r = await edgeReport(png);
    expect(r.flags).toEqual([]);
    expect((await sharp(r.montage).metadata()).width).toBe(1000);
  });

  it("flags dark content in the left strip only (a tail on the edge)", async () => {
    const tail = await sharp({ create: { width: 30, height: 300, channels: 3, background: { r: 40, g: 40, b: 40 } } }).png().toBuffer();
    const png = await solid([170, 200, 150]).composite([{ input: tail, left: 0, top: 400 }]).png().toBuffer();
    const r = await edgeReport(png);
    expect(r.flags.some((f) => f.startsWith("left:") && /dark/.test(f))).toBe(true);
    expect(r.flags.some((f) => f.startsWith("right:"))).toBe(false);
  });

  it("flags a paper-cream border, the vignette of p14", async () => {
    const inner = await solid([120, 160, 110], W - 120).png().toBuffer();
    const png = await solid([251, 244, 233]).composite([{ input: inner, left: 60, top: 60 }]).png().toBuffer();
    const r = await edgeReport(png);
    expect(r.flags.filter((f) => /cream/.test(f)).length).toBe(4);
  });
});
