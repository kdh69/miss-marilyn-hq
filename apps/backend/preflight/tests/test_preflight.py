"""Preflight against generated PDFs: good files pass, each KDP mistake is caught."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pymupdf

SCRIPT = Path(__file__).resolve().parent.parent / "preflight.py"
PT = 72


def run(*args):
    out = subprocess.run([sys.executable, "-I", str(SCRIPT), *args], capture_output=True, text=True, check=False)
    return json.loads(out.stdout)


def make_pdf(path, pages, w, h, text_at=None, font_file=None):
    doc = pymupdf.open()
    for _ in range(pages):
        page = doc.new_page(width=w * PT, height=h * PT)
        if text_at:
            if font_file:
                page.insert_font(fontname="emb", fontfile=font_file)
                page.insert_text(text_at, "Hello", fontname="emb")
            else:
                page.insert_text(text_at, "Hello")
    doc.save(path)


class Preflight(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.dir = Path(cls.tmp.name)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_good_cover_passes(self):
        f = self.dir / "cover.pdf"
        make_pdf(f, 1, 17.25 + 32 * 0.002347, 8.75)
        r = run("cover", str(f), "--pages", "32")
        self.assertTrue(r["ok"], r["failures"])
        self.assertAlmostEqual(r["facts"]["spine_in"], 0.0751, places=4)

    def test_cover_for_wrong_page_count_fails(self):
        f = self.dir / "cover40.pdf"
        make_pdf(f, 1, 17.25 + 40 * 0.002347, 8.75)
        self.assertFalse(run("cover", str(f), "--pages", "32")["ok"])

    def test_good_interior_without_text_passes(self):
        f = self.dir / "interior.pdf"
        make_pdf(f, 32, 8.625, 8.75)
        r = run("interior", str(f))
        self.assertTrue(r["ok"], r["failures"])

    def test_odd_short_wrong_size_interior_fails(self):
        f = self.dir / "bad.pdf"
        make_pdf(f, 23, 8.5, 8.5)
        fails = " ".join(run("interior", str(f))["failures"])
        for needle in ("minimum of 24", "odd", "expected 8.625"):
            self.assertIn(needle, fails)

    def test_text_near_trim_and_unembedded_font_fail(self):
        f = self.dir / "edge.pdf"
        make_pdf(f, 24, 8.625, 8.75, text_at=(10, 30))
        fails = " ".join(run("interior", str(f))["failures"])
        self.assertIn("within 0.5 in", fails)
        self.assertIn("not embedded", fails)


if __name__ == "__main__":
    unittest.main()
