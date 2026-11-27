/**
 * How a book's pages fall into what a reader sees: one page with its own picture, or two pages
 * that share one big picture (a two-page spread). The team stores a spread as two page rows,
 * each with its half of the picture; Clara should see it as one picture and one set of words.
 *
 * A pair (n, n+1) with n even is a spread when either page says so: its art file is named
 * `…spread-08-09…`, or its picture plan says "two-page picture with p9" / "half of the two-page
 * picture with p8". Pure (no Sheet access) so the panel and the tests share it.
 */
type Page = Record<string, string>;

export type Moment = {
  key: string;
  /** "Page 6" or "Pages 8–9". */
  label: string;
  /** One page, or [left, right] of a spread. */
  pages: Page[];
  spread: boolean;
};

const num = (p: Page) => Number(p.page_number);

/**
 * The page this one shares its picture with. The picture plan is the current intent, so it wins:
 * a plan that names a two-page picture pairs the pages; a plan that doesn't keeps the page single
 * even if its old picture file was half of a spread (pages split apart again keep their files
 * until they're redrawn). The file name only counts when there's no plan.
 */
export function partnerOf(p: Page): number | null {
  const n = num(p);
  const brief = (p.art_brief ?? "").trim();
  if (brief) {
    const m = brief.match(/two-page (?:picture|spread|image)[^.]*?\bwith\s+p(?:age|p?\.)?\s*(\d+)/i);
    return m ? Number(m[1]) : null;
  }
  const file = (p.art_file ?? "").match(/spread[-_]0*(\d+)[-_]0*(\d+)/i);
  if (file) {
    const [a, b] = [Number(file[1]), Number(file[2])];
    if (a === n) return b;
    if (b === n) return a;
  }
  return null;
}

/**
 * The team's new words for a page that is already Clara's, if there are any to offer: only drafts
 * the Producer wrote during the story rewrite that is open now (`rewriteSince` = when it started),
 * and after her own words. Any other change to the row (a new picture) never brings an old draft back.
 */
export function teamSuggestion(p: Page, rewriteSince: string): string {
  const draft = (p.text_draft ?? "").trim();
  const final = (p.text_final ?? "").trim();
  const at = p.updated_at ?? "";
  if (!rewriteSince || !final || !draft || draft === final) return "";
  if (p.updated_by !== "story_producer" || at <= rewriteSince || at <= (p.text_final_at ?? "")) return "";
  return draft;
}

/** Group pages (sorted by number) into moments: spreads where a pair names each other, else single pages. */
export function bookMoments(pages: Page[]): Moment[] {
  const sorted = [...pages].sort((a, b) => num(a) - num(b));
  const byNum = new Map(sorted.map((p) => [num(p), p]));
  const out: Moment[] = [];
  const used = new Set<number>();
  for (const p of sorted) {
    const n = num(p);
    if (used.has(n)) continue;
    used.add(n);
    // Spreads open on an even (left) page: n and n+1.
    const right = n % 2 === 0 ? byNum.get(n + 1) : undefined;
    const paired = right && !used.has(n + 1) && (partnerOf(p) === n + 1 || partnerOf(right) === n);
    if (paired && right) {
      used.add(n + 1);
      out.push({ key: `${n}-${n + 1}`, label: `Pages ${n}–${n + 1}`, pages: [p, right], spread: true });
    } else {
      out.push({ key: String(n), label: `Page ${n}`, pages: [p], spread: false });
    }
  }
  return out;
}
