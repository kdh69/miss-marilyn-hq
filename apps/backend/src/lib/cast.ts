/**
 * Who is in a picture, and the series canon that comes with them (mythofex's continuity pattern:
 * one canonical description per character, merged word for word into every prompt by the tool,
 * and the same reference images every time, so consistency never depends on what an agent retyped).
 *
 * `cast=CN-01,Gussie` on `npm run bot -- illustrator image` names the characters, props and places.
 * castFor() returns the canon text to append to the prompt, the reference images to pass (the
 * caller's own first, e.g. Clara's approved draft, then each cast member's canon references), and
 * the reasons to refuse: an unknown cast name, a canon character the prompt names but the cast
 * leaves out, or a reference that is the facing page's picture (it copies that page's layout:
 * p15 drawn with p14 as a reference matched p14 on 83.5% of its pixels, 2026-11-27).
 */
import type { Row } from "@mm/core";
import { canonFor } from "./team";

export type Cast = { text: string; refs: string[]; dropped: string[]; members: Row[]; errors: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").trim();
const ids = (s = "") => s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether the prompt names this canon entry (whole words, any case). */
const named = (prompt: string, name: string) => new RegExp(`(^|[^a-z])${escape(norm(name))}([^a-z]|$)`, "i").test(norm(prompt));

/** The page that faces page n in the open book (even pages on the left), or 0 for page 1. */
export const facingPage = (n: number) => (n <= 1 ? 0 : n % 2 === 0 ? n + 1 : n - 1);

export function castFor(opts: {
  canon: Row[]; productId: string; cast?: string; prompt: string; refs: string[]; maxRefs: number;
  page?: number; assets?: Row[]; kind?: string;
}): Cast {
  const rows = canonFor(opts.canon, opts.productId);
  const errors: string[] = [];
  const members: Row[] = [];
  for (const want of ids(opts.cast).length ? (opts.cast ?? "").split(",").map((x) => x.trim()).filter(Boolean) : []) {
    const hit = rows.find((c) => norm(c.canon_id) === norm(want) || norm(c.name) === norm(want));
    if (!hit) errors.push(`cast "${want}" isn't in the series canon for ${opts.productId} (use a canon_id like CN-01 or its exact name)`);
    else if (!members.includes(hit)) members.push(hit);
  }
  // Miss Marilyn never appears without her red string; the look of the books goes on every picture.
  const auto = (pred: (c: Row) => boolean) => rows.filter(pred).forEach((c) => { if (!members.includes(c)) members.push(c); });
  if (members.some((c) => norm(c.name) === "miss marilyn")) auto((c) => norm(c.name) === "red string");
  // The style line (a painted page, edge to edge) would fight a character sheet's plain paper.
  if (opts.kind !== "sheet") auto((c) => c.kind === "style");

  // Every canon character the prompt names must be cast, so its canon text and references come with it.
  for (const c of rows.filter((c) => c.kind === "character" && !members.includes(c))) {
    if (named(opts.prompt, c.name)) errors.push(`the prompt names ${c.name} but cast= leaves out ${c.canon_id}: add it so the canon look and references come with it`);
  }

  // A facing page's picture as a reference copies that page's layout.
  if (opts.page && !/spread/.test(opts.kind ?? "")) {
    const facing = facingPage(opts.page);
    const byId = new Map((opts.assets ?? []).map((a) => [a.asset_id, a]));
    for (const r of opts.refs) {
      const a = byId.get(r);
      if (a && a.product_id === opts.productId && a.asset_type === "page_art" && Number(a.page_number) === facing) {
        errors.push(`ref ${r} is the picture on page ${facing}, which faces page ${opts.page}: it would copy that page's layout. Use the character sheets and a page from a different moment`);
      }
    }
  }

  // References, in order of how much they matter to consistency: the caller's first (Clara's approved
  // draft leads), then each character's own first canon reference (its sheet), then the caller's other
  // refs, then everyone's remaining canon refs, up to what the model takes. A caller who passes five refs
  // can no longer crowd out the characters' sheets (T-0049's line-up passed five and got none, 11-28).
  const lists = members.map((c) => ({ kind: c.kind, refs: ids(c.reference_ids) }));
  const queue = [
    ...opts.refs.slice(0, 1),
    ...lists.filter((l) => l.kind === "character").map((l) => l.refs[0]).filter(Boolean),
    ...opts.refs.slice(1),
  ];
  for (let k = 0; lists.some((l) => l.refs[k]); k++) for (const l of lists) if (l.refs[k]) queue.push(l.refs[k]);
  const refs: string[] = [];
  const dropped: string[] = [];
  for (const r of queue) {
    if (refs.includes(r) || dropped.includes(r)) continue;
    if (refs.length < opts.maxRefs) refs.push(r); else dropped.push(r);
  }

  const text = members.length
    ? `\n\nDraw each of these exactly as described here, the same as on every other page (series canon):\n${members.map((c) => `- ${c.name}: ${c.look.trim()}`).join("\n")}`
    : "";
  return { text, refs, dropped, members, errors };
}
