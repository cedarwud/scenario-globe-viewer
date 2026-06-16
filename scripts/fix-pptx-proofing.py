#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove PowerPoint spell-check red squiggles from a .pptx, in place.

Why this is needed: PowerPoint draws a red wavy "misspelled word" underline
when a text run is either (a) proofed against the wrong dictionary or
(b) carries a cached spelling-ERROR flag. python-pptx-built decks have neither,
but the moment a deck is OPENED + saved in PowerPoint, PP proofs it and stamps
`err="1"` on offending runs -> the squiggle persists even after you fix the
language. This tool clears ALL of it on every run, across every text-bearing
part, without touching the text/shapes/layout:

  - lang   = "zh-TW"   (proof Latin/complex script as zh-TW, not en-US)
  - altLang= "zh-TW"   (PowerPoint proofs EAST-ASIAN text via altLang; en-US
                        here is what red-underlines CJW text)
  - noProof= "1"       (skip proofing this run entirely)
  - dirty  = "0"       (proofing state clean -> do not re-proof)
  - err attribute REMOVED (the cached "this run is a spelling error" flag)

Usage:
  python3 scripts/fix-pptx-proofing.py <file.pptx> [--no-backup]

Idempotent + safe: only sets/removes those run-property attributes.
"""
import re
import shutil
import sys
import zipfile

from lxml import etree

A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
RUN_PROP_TAGS = ("rPr", "endParaRPr", "defRPr")
TEXT_PARTS = re.compile(
    r"ppt/(slides|slideLayouts|slideMasters|notesSlides|notesMasters|theme)/[^/]+\.xml$"
)


def fix(path: str, backup: bool = True) -> None:
    if backup:
        shutil.copyfile(path, path + ".bak")
    tmp = path + ".tmp"
    removed_err = normalized = 0
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if TEXT_PARTS.match(item.filename):
                root = etree.fromstring(data)
                for tag in RUN_PROP_TAGS:
                    for el in root.iter(A + tag):
                        el.set("lang", "zh-TW")
                        el.set("altLang", "zh-TW")
                        el.set("noProof", "1")
                        el.set("dirty", "0")
                        if el.get("err") is not None:
                            del el.attrib["err"]
                            removed_err += 1
                        if el.get("smtClean") is not None:
                            el.set("smtClean", "0")
                        normalized += 1
                data = etree.tostring(
                    root, xml_declaration=True, encoding="UTF-8", standalone=True
                )
            zout.writestr(item, data)
    shutil.move(tmp, path)
    # verify
    err = enus = no_np = rpr = 0
    with zipfile.ZipFile(path) as z:
        for n in z.namelist():
            if n.endswith(".xml"):
                x = z.read(n).decode("utf-8", "ignore")
                err += len(re.findall(r'\berr="1"', x))
                enus += x.count("en-US")
                tags = re.findall(r"<a:rPr[^>]*>", x)
                rpr += len(tags)
                no_np += sum(1 for t in tags if 'noProof="1"' not in t)
    print(
        f"normalized {normalized} run-props, removed {removed_err} err flags.\n"
        f"verify: err1={err}  en-US={enus}  rPr-missing-noProof={no_np}  (rPr={rpr})  "
        f"-> {'CLEAN' if err == enus == no_np == 0 else 'STILL HAS TRIGGERS'}"
    )


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    fix(args[0], backup="--no-backup" not in sys.argv)
