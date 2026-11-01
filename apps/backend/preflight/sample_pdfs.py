"""Sample print files for `npm run sim`: a KDP-ready interior and cover, and a broken interior.

Usage:
  python3 -I sample_pdfs.py interior OUT.pdf --pages 24 --title "Book title" [--text-file pages.json]
  python3 -I sample_pdfs.py bad-interior OUT.pdf
  python3 -I sample_pdfs.py cover OUT.pdf --pages 24 --title "Book title"

Good files carry a 300 DPI full-bleed picture per page and text in an embedded font inside the
0.5 in safe zone, so preflight.py passes them; the bad interior is 23 pages at trim size.
"""
import argparse
import json

import pymupdf

PT = 72
TRIM, BLEED = 8.5, 0.125
SPINE_PER_PAGE = 0.002347
FONT = pymupdf.Font("helv")  # MuPDF's built-in Helvetica clone; inserted from its buffer, so embedded


def picture(w_in, h_in, rgb):
    w, h = round(w_in * 300), round(h_in * 300)
    return pymupdf.Pixmap(pymupdf.csRGB, w, h, bytes(rgb) * (w * h), False)


def page_with(doc, w_in, h_in, rgb, lines):
    page = doc.new_page(width=w_in * PT, height=h_in * PT)
    page.insert_image(page.rect, pixmap=picture(w_in, h_in, rgb))
    if lines:
        page.insert_font(fontname="body", fontbuffer=FONT.buffer)
        safe = (BLEED + 0.6) * PT
        box = pymupdf.Rect(safe, safe, page.rect.width - safe, page.rect.height - safe)
        page.insert_textbox(box, "\n".join(lines), fontname="body", fontsize=20, align=pymupdf.TEXT_ALIGN_LEFT)
    return page


def interior(out, pages, title, texts):
    doc = pymupdf.open()
    for i in range(pages):
        text = texts[i] if i < len(texts) else ""
        lines = [title] if i == 0 else [l for l in text.splitlines() if l.strip()][:5]
        page_with(doc, TRIM + BLEED, TRIM + 2 * BLEED, (250, 244 - i % 6 * 6, 232), lines)
    doc.save(out, deflate=True)


def bad_interior(out):
    doc = pymupdf.open()
    for _ in range(23):
        doc.new_page(width=TRIM * PT, height=TRIM * PT)
    doc.save(out)


def cover(out, pages, title):
    w = 2 * TRIM + pages * SPINE_PER_PAGE + 2 * BLEED
    doc = pymupdf.open()
    page = page_with(doc, w, TRIM + 2 * BLEED, (236, 228, 214), [])
    page.insert_font(fontname="body", fontbuffer=FONT.buffer)
    front = pymupdf.Rect((BLEED + TRIM + pages * SPINE_PER_PAGE + 0.6) * PT, 1.5 * PT, (w - BLEED - 0.6) * PT, 4 * PT)
    page.insert_textbox(front, title, fontname="body", fontsize=28, align=pymupdf.TEXT_ALIGN_CENTER)
    doc.save(out, deflate=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["interior", "bad-interior", "cover"])
    ap.add_argument("out")
    ap.add_argument("--pages", type=int, default=24)
    ap.add_argument("--title", default="Sample book")
    ap.add_argument("--text-file", help="JSON list of page texts, page 1 first")
    a = ap.parse_args()
    if a.kind == "interior":
        texts = json.load(open(a.text_file, encoding="utf-8")) if a.text_file else []
        interior(a.out, a.pages, a.title, texts)
    elif a.kind == "bad-interior":
        bad_interior(a.out)
    else:
        cover(a.out, a.pages, a.title)


if __name__ == "__main__":
    main()
