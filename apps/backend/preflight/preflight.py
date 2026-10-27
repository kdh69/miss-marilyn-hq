"""Job 3 — KDP preflight (spec §9 job 3). Deterministic, no AI.

Checks a KDP interior or cover PDF against the paperback specs for an
8.5 x 8.5 in premium-color book. Prints JSON: {"ok": bool, "failures": [...], "facts": {...}}.

Usage:
  python3 -I preflight.py interior path/to/interior.pdf
  python3 -I preflight.py cover path/to/cover.pdf --pages 32

Wiring into the gatekeeper (download from Drive, write failures to qc_notes,
skip the Claude call on failure) is the next build step.
"""
import argparse
import json

import pymupdf as fitz

PT = 72.0
TRIM = 8.5
BLEED = 0.125
PAGE_W, PAGE_H = TRIM + BLEED, TRIM + 2 * BLEED  # 8.625 x 8.75 (outside edge + top/bottom bleed)
SPINE_PER_PAGE = 0.002347  # premium color (KDP cover help page)
MIN_PAGES = 24
MIN_DPI = 300
TEXT_SAFE = 0.5  # text at least 0.5 in inside trim
TOL = 0.01


def fonts_unembedded(doc):
    bad = set()
    for i in range(doc.page_count):
        for f in doc.get_page_fonts(i, full=True):
            name, ext = f[3], f[1]
            if ext in ("", "n/a"):
                bad.add(name)
    return sorted(bad)


def low_dpi_images(page):
    lows = []
    for info in page.get_image_info(xrefs=True):
        w_in = (info["bbox"][2] - info["bbox"][0]) / PT
        h_in = (info["bbox"][3] - info["bbox"][1]) / PT
        if w_in <= 0 or h_in <= 0:
            continue
        dpi = min(info["width"] / w_in, info["height"] / h_in)
        if dpi < MIN_DPI - 1:
            lows.append(round(dpi))
    return lows


def check_interior(doc):
    fails, n = [], doc.page_count
    if n < MIN_PAGES:
        fails.append(f"page count {n} is under KDP's minimum of {MIN_PAGES}")
    if n % 2:
        fails.append(f"page count {n} is odd; KDP needs an even count")
    for i, page in enumerate(doc, start=1):
        w, h = page.rect.width / PT, page.rect.height / PT
        if abs(w - PAGE_W) > TOL or abs(h - PAGE_H) > TOL:
            fails.append(f"p{i}: {w:.3f} x {h:.3f} in, expected {PAGE_W} x {PAGE_H} (8.5 trim + bleed)")
        lows = low_dpi_images(page)
        if lows:
            fails.append(f"p{i}: image(s) at {min(lows)} DPI, need {MIN_DPI}")
        # Text safe zone: 0.5 in inside trim. Which side carries the bleed alternates
        # left/right, so hold both sides to bleed + 0.5 in (conservative).
        m = (BLEED + TEXT_SAFE) * PT
        safe = fitz.Rect(m, m, page.rect.width - m, page.rect.height - m)
        for b in page.get_text("blocks"):
            r = fitz.Rect(b[:4])
            if b[4].strip() and not safe.contains(r):
                fails.append(f"p{i}: text '{b[4].strip()[:30]}' is within 0.5 in of the trim")
                break
    bad_fonts = fonts_unembedded(doc)
    if bad_fonts:
        fails.append(f"fonts not embedded: {', '.join(bad_fonts)}")
    return fails, {"pages": n}


def check_cover(doc, pages):
    fails = []
    spine = pages * SPINE_PER_PAGE
    exp_w = 2 * TRIM + spine + 2 * BLEED
    exp_h = TRIM + 2 * BLEED
    if doc.page_count != 1:
        fails.append(f"cover PDF has {doc.page_count} pages; must be a single page")
    page = doc[0]
    w, h = page.rect.width / PT, page.rect.height / PT
    if abs(w - exp_w) > TOL or abs(h - exp_h) > TOL:
        fails.append(f"cover is {w:.4f} x {h:.4f} in, expected {exp_w:.4f} x {exp_h:.4f} for {pages} pages")
    lows = low_dpi_images(page)
    if lows:
        fails.append(f"cover image(s) at {min(lows)} DPI, need {MIN_DPI}")
    spine_x0 = (BLEED + TRIM) * PT
    spine_rect = fitz.Rect(spine_x0, 0, spine_x0 + spine * PT, page.rect.height)
    if pages < 79 and any(b[4].strip() and fitz.Rect(b[:4]).intersects(spine_rect) for b in page.get_text("blocks")):
        fails.append("text in the spine area; KDP allows spine text only at 79+ pages")
    bad_fonts = fonts_unembedded(doc)
    if bad_fonts:
        fails.append(f"fonts not embedded: {', '.join(bad_fonts)}")
    return fails, {"spine_in": round(spine, 4), "expected_in": [round(exp_w, 4), round(exp_h, 4)]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["interior", "cover"])
    ap.add_argument("pdf")
    ap.add_argument("--pages", type=int, help="interior page count (cover only)")
    a = ap.parse_args()
    doc = fitz.open(a.pdf)
    if a.kind == "interior":
        fails, facts = check_interior(doc)
    else:
        if not a.pages:
            ap.error("--pages is required for a cover")
        fails, facts = check_cover(doc, a.pages)
    print(json.dumps({"ok": not fails, "failures": fails, "facts": facts}, indent=2))


if __name__ == "__main__":
    main()
