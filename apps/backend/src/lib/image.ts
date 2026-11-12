/**
 * Picture generation for the team, ported from the videograph repo's fal adapters (Nano Banana
 * Pro / 2 via fal.ai, with reference images), plus the checks a picture must pass before upload.
 *
 * Privacy: every request sends X-Fal-Store-IO: 0 (fal keeps no history), and reference images
 * travel inside the request as downscaled JPEG data, so no copy sits on fal's CDN.
 * The key is FAL_KEY, or a network secret for queue.fal.run that the session's proxy adds to the
 * request (then no key is in the session at all). Failed fal jobs aren't billed. Money is gated by `planImage` (lib/team.ts) before any call.
 */
import { fal } from "@fal-ai/client";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import sharp from "sharp";
import raw from "../../../../formats/picture-book.json" with { type: "json" };

export type ImageModel = { name: string; endpoint: string; maxRefs: number; usd: Record<string, number> };
export type ImageKind = { model: string; resolution: string; aspect: string; fitToPage: boolean };
export type BookFormat = {
  id: string;
  pages: number;
  page: { widthPx: number; heightPx: number; dpi: number };
  image: { kinds: Record<string, ImageKind>; models: Record<string, ImageModel>; maxAttemptsPerImage: number; taskCapUsd: number };
};
export const format = raw as unknown as BookFormat;

const POLL_MS = 3000;
const TIMEOUT_MS = 6 * 60_000;

function client() {
  // With no FAL_KEY, a placeholder goes out and the session's proxy swaps in the saved secret.
  fal.config({ credentials: process.env.FAL_KEY?.trim() || "set-by-network-secret" });
  return fal;
}

/** A reference image for the model: a 1536 px JPEG, sent inside the request as a data URI. */
export async function refDataUri(path: string): Promise<string> {
  const jpeg = await sharp(await readFile(path)).rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

const hint = (message: string) =>
  /unauthori[sz]ed|authenticat|401|invalid.*key|no user found/i.test(message) ? `${message}\n  The image model isn't connected: set FAL_KEY in this session, or save a network secret for queue.fal.run (header Authorization, prefix Key) in the cloud environment's settings. docs/TEAM.md, Pictures.`
    : /forbidden/i.test(message) ? `${message}\n  "Forbidden" on a first call usually means the fal account has no credit: stop and tell Kyle, retrying won't help.`
    : /no_media|no image/i.test(message) ? `${message}\n  An empty result can be intermittent or a refusal: one plain retry is worth it before rewording. Failed calls cost $0.`
    : message;

/** One picture from a prompt and up to `maxRefs` reference images (local files). Returns the PNG bytes. */
export async function generateImage(opts: { model: ImageModel; prompt: string; aspect: string; resolution: string; refs: string[] }): Promise<{ png: Buffer; endpoint: string; requestId: string }> {
  const api = client();
  const urls = [];
  for (const ref of opts.refs.slice(0, opts.model.maxRefs)) urls.push(await refDataUri(ref));
  const endpoint = urls.length ? `${opts.model.endpoint}/edit` : opts.model.endpoint;
  const input = { prompt: opts.prompt, num_images: 1, aspect_ratio: opts.aspect, resolution: opts.resolution, output_format: "png", ...(urls.length ? { image_urls: urls } : {}) };
  try {
    const { request_id } = await api.queue.submit(endpoint, { input, headers: { "X-Fal-Store-IO": "0" }, storageSettings: { expiresIn: "1d" } } as never);
    const started = Date.now();
    for (;;) {
      const status = await api.queue.status(endpoint, { requestId: request_id, logs: false });
      if (status.status === "COMPLETED") break;
      if (Date.now() - started > TIMEOUT_MS) throw new Error(`still ${status.status} after ${TIMEOUT_MS / 60_000} minutes (request ${request_id})`);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    const result = await api.queue.result(endpoint, { requestId: request_id });
    const url = (result.data as { images?: { url: string }[] })?.images?.[0]?.url;
    if (!url) throw new Error("no image returned");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`couldn't download the result (${res.status})`);
    return { png: Buffer.from(await res.arrayBuffer()), endpoint, requestId: request_id };
  } catch (e) {
    const err = e as { body?: { detail?: unknown }; message?: string };
    throw new Error(hint(`fal ${endpoint}: ${err.body?.detail ? JSON.stringify(err.body.detail) : err.message ?? String(e)}`.slice(0, 800)));
  }
}

/** Crops and resizes a picture to the page with bleed (2588 x 2625 px, RGB, 300 DPI), or says why it can't. */
export async function fitToPage(png: Buffer): Promise<Buffer> {
  const { widthPx, heightPx, dpi } = format.page;
  const meta = await sharp(png).metadata();
  if ((meta.width ?? 0) < widthPx || (meta.height ?? 0) < heightPx) {
    throw new Error(`the model returned ${meta.width} x ${meta.height} px, below the print size ${widthPx} x ${heightPx}: not enlarged, because that would print soft`);
  }
  return sharp(png).resize(widthPx, heightPx, { fit: "cover", position: "centre" }).flatten({ background: "#ffffff" }).withMetadata({ density: dpi }).png().toBuffer();
}

/** A stand-in picture for practice runs: the right size, labelled, $0, never uploadable. */
export async function practiceImage(label: string, fit: boolean): Promise<Buffer> {
  const { widthPx, heightPx, dpi } = format.page;
  const [w, h] = fit ? [widthPx, heightPx] : [1536, 1024];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f3e9dc"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 14)}" text-anchor="middle" fill="#8a6d57">PRACTICE ${label.replace(/[<&>]/g, "")}</text></svg>`;
  return sharp(Buffer.from(svg)).flatten({ background: "#f3e9dc" }).withMetadata({ density: dpi }).png().toBuffer();
}

/** What print needs from page or cover art, checked on the file itself. Returns what's wrong; empty is good. */
export async function checkArt(file: string): Promise<string[]> {
  const { widthPx, heightPx } = format.page;
  const fails: string[] = [];
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(await readFile(file)).metadata();
  } catch (e) {
    return [`not a readable image (${(e as Error).message})`];
  }
  if (/^PRACTICE_/i.test(basename(file))) fails.push("a practice placeholder, not art");
  if (meta.format !== "png") fails.push(`is ${meta.format}, must be PNG`);
  if (meta.width !== widthPx || meta.height !== heightPx) fails.push(`is ${meta.width} x ${meta.height} px, must be ${widthPx} x ${heightPx} (8.625 x 8.75 in at 300 DPI, bleed included)`);
  if (meta.hasAlpha) fails.push("has a transparent layer; flatten it to RGB");
  if (meta.space && !["srgb", "rgb"].includes(meta.space)) fails.push(`colour space is ${meta.space}, must be RGB`);
  return fails;
}

/** Thumbnails of many pictures on one sheet, in order and labelled, so drift between pages shows at a glance. */
export async function contactSheet(items: { label: string; image: Buffer }[], columns = 6): Promise<Buffer> {
  const cell = 420, pad = 16, caption = 34;
  const rows = Math.ceil(items.length / columns);
  const width = columns * (cell + pad) + pad, height = rows * (cell + caption + pad) + pad;
  const tiles = await Promise.all(items.map(async (item, i) => {
    const thumb = await sharp(item.image).resize(cell, cell, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const left = pad + (i % columns) * (cell + pad), top = pad + Math.floor(i / columns) * (cell + caption + pad);
    const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${caption}"><text x="4" y="24" font-family="sans-serif" font-size="22" fill="#333">${item.label.replace(/[<&>]/g, "")}</text></svg>`);
    return [{ input: thumb, left, top }, { input: text, left, top: top + cell }];
  }));
  return sharp({ create: { width, height, channels: 3, background: "#e9e9e9" } }).composite(tiles.flat()).png().toBuffer();
}

export type EdgeSide = "top" | "bottom" | "left" | "right";
export type EdgeReport = { sides: Record<EdgeSide, { dark: number; cream: number }>; flags: string[]; montage: Buffer };

/**
 * Where to look before a picture moves on: for each of the four outer strips (4% of the width by
 * default), the share of dark pixels (ink, dark fur: luminance under 80) and of paper-cream pixels
 * (a vignette). It flags a side, it does not judge it: a dark tree trunk flags too. The montage
 * stacks the four strips so a person can look at all of them at once.
 */
export async function edgeReport(input: Buffer | string, share = 0.04): Promise<EdgeReport> {
  const buf = typeof input === "string" ? await readFile(input) : input;
  const { width = 0, height = 0 } = await sharp(buf).metadata();
  const band = Math.max(1, Math.round(width * share));
  const regions: Record<EdgeSide, { left: number; top: number; width: number; height: number }> = {
    top: { left: 0, top: 0, width, height: band },
    bottom: { left: 0, top: height - band, width, height: band },
    left: { left: 0, top: 0, width: band, height },
    right: { left: width - band, top: 0, width: band, height },
  };
  const sides = {} as EdgeReport["sides"];
  const flags: string[] = [];
  const strips: Buffer[] = [];
  const pct = Math.round(share * 100);
  for (const side of Object.keys(regions) as EdgeSide[]) {
    // Cut the strip out first, then work on it as its own picture: sharp rotates before it extracts inside one pipeline.
    const strip = sharp(await sharp(buf).extract(regions[side]).removeAlpha().toColourspace("srgb").png().toBuffer());
    const { data, info } = await strip.clone().raw().toBuffer({ resolveWithObject: true });
    let dark = 0, cream = 0;
    const n = info.width * info.height;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (0.299 * r + 0.587 * g + 0.114 * b < 80) dark++;
      if (Math.abs(r - 251) < 12 && Math.abs(g - 244) < 12 && Math.abs(b - 233) < 12) cream++;
    }
    sides[side] = { dark: dark / n, cream: cream / n };
    if (dark / n > 0.005) flags.push(`${side}: ${(100 * dark / n).toFixed(1)}% dark pixels in the outer ${pct}%: look at the strip (a tail, a paw or an ink line; or only a tree)`);
    if (cream / n > 0.3) flags.push(`${side}: ${(100 * cream / n).toFixed(0)}% paper-cream in the outer ${pct}%: a cream border or vignette? The scene should be painted to the edge`);
    const flat = side === "left" || side === "right" ? strip.clone().rotate(90) : strip.clone();
    strips.push(await flat.resize(width, band, { fit: "fill" }).png().toBuffer());
  }
  const gap = 8;
  const montage = await sharp({ create: { width, height: 4 * band + 3 * gap, channels: 3, background: "#ff00ff" } })
    .composite(strips.map((strip, i) => ({ input: strip, left: 0, top: i * (band + gap) })))
    .png().toBuffer();
  return { sides, flags, montage };
}
