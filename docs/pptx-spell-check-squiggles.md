# Fixing PowerPoint spell-check red squiggles in the generated decks

## Symptom

Open a generated `.pptx` (e.g. `deliverable/requirement-presentation-2026-06-14-ntpu-template.pptx`)
in PowerPoint, click on text, and a red wavy underline appears under the text —
the warning PowerPoint normally shows for a misspelled English word. It appears
across many slides on correct Traditional-Chinese (and English-term) text.
Copy-pasting the run in place used to be the only way to clear it.

This is PowerPoint's spell-checker (proofing), not a real spelling problem.

## Root cause — there are THREE independent layers, all must be handled

A python-pptx run is `<a:r><a:rPr .../><a:t>text</a:t></a:r>`. PowerPoint decides
whether to red-underline a run from attributes on `<a:rPr>`. We hit all three in
turn (each "fix" only partially worked until the next was found):

1. **`lang` missing / `lang="en-US"`** — the proofing language for Latin/complex
   script. With no/`en-US` lang, PowerPoint spell-checks the run with the en-US
   dictionary. Fix: `lang="zh-TW"`.

2. **`altLang="en-US"`** — *this is the one that surprises people.* PowerPoint
   proofs **East-Asian (CJK) text via the `altLang` attribute**, not `lang`. The
   NTPU template / python-pptx leave `altLang="en-US"`, so Chinese text is
   English-spell-checked and squiggled even after `lang` + `noProof` are set.
   Fix: `altLang="zh-TW"`.

3. **`err="1"` (the real killer for an already-edited deck)** — once PowerPoint
   has OPENED and proofed a file, it stamps `err="1"` on every run it considers
   misspelled and saves that into the file. **That cached error flag draws the
   squiggle regardless of `lang`/`altLang`/`noProof`.** Freshly python-pptx-built
   decks have no `err` (it is a PowerPoint runtime flag), but any deck that has
   been edited+saved in PowerPoint accumulates them — `0615_v2.pptx` had 266.
   Fix: **delete the `err` attribute** (and set `dirty="0"` so it is not
   re-proofed).

`noProof="1"` (skip proofing this run) is also set as a belt-and-suspenders, but
do NOT rely on it alone — PowerPoint does not always honour it for DrawingML text.

`lang`, `altLang`, `noProof`, `dirty`, `err` are all valid attributes of
`a:rPr` / `CT_TextCharacterProperties` in DrawingML.

## The fix

### A) Builders produce clean decks automatically

The deck builders set `lang="zh-TW" altLang="zh-TW" noProof="1"` on every run:

- per-run font helper `setfont`/`_setfont` in
  `scripts/build_requirement_presentation.py`,
  `scripts/build_requirement_presentation_v2.py`,
  `scripts/viz_native.py`;
- plus a save-time sweep in `build_requirement_presentation_v2.py` over
  `a:rPr` / `a:endParaRPr` / `a:defRPr` (covers tables, groups, native figures).

A freshly built deck therefore has no squiggles. `err` only ever comes back if
you open the deck in PowerPoint, edit, and save.

### B) Fix an existing / PowerPoint-edited deck in place

```sh
python3 scripts/fix-pptx-proofing.py <file.pptx>
```

It clears `err`, sets `lang`/`altLang`/`noProof`/`dirty`, across every
text-bearing part (`slides`, `slideLayouts`, `slideMasters`, `notesSlides`,
`notesMasters`, `theme`), in place (keeps a `.bak`), and prints a verification
line. It is idempotent — run it again any time PowerPoint re-introduces squiggles
after editing. Text, shapes and layout are never touched (only run-property
attributes change).

### Verify

Clean means **zero** of these across all `.xml` parts:
`err="1"`, `en-US`, and `<a:rPr>` without `noProof="1"`.

## Last-resort, user side

If a squiggle somehow survives (it should not after the above), it is a
PowerPoint *application* setting, not the file: File → Options → Proofing →
uncheck "Check spelling as you type".
