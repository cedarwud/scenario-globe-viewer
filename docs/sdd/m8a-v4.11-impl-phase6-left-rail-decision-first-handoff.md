# M8A-V4.11 Implementation Phase 6 Handoff

Date: 2026-05-11

Scope: mini follow-up Phase 6 for spec v2 §5 only. This is not V4.12 and does not add a new spec.

## Contract Implemented

Phase 6 replaces the old five equal-weight left rail prose rows with the spec v2 §5 decision-first rail:

- Layer 1 primary judgment: orbit + role chip, role glyph, orbit swatch, and compact current/candidate/fallback tokens.
- Layer 2 next step: one-line next-state preview.
- Layer 3 evidence / gap: modeled-quality or real-measurement hookpoint line.
- Active rail panel: 3px solid left border using `--m8a-v411-state-active`.
- Channel ownership preserved: orbit color only owns chip/swatch identity; state owns active border, active fill, warning/candidate emphasis.

Per-window rail copy:

- W1: `LEO · focus`; `Next: entering quality-degradation phase`; `modeled quality strong; service time: ~22 min`
- W2: `LEO · pressure`; `Next: MEO continuity hold takes over`; `modeled quality dropping; switch countdown: ~10 min`
- W3: `MEO · continuity-hold`; `Next: new LEO candidate returns`; `modeled continuity hold; LEO ETA: ~14 min`
- W4: `LEO · candidate`; `Next: GEO wraps as guard`; `candidate quality strong; if switching back: ~22 min`
- W5: `GEO · guard`; `Next: restart (back to W1)`; `guard context only; sequence ends: ~5 min`

## Skill Query Grounding

Required skill queries were run from `.codex/skills/ui-ux-pro-max/scripts/search.py`.

- `operator console primary judgment scan card` returned:
  `**Domain:** ux | **Query:** operator console primary judgment scan card`
  `**Source:** ux-guidelines.csv | **Found:** 0 results`
- Active-border direction was grounded by the style result:
  `Indigo→Violet gradient primary CTAs + active tab highlights`
  `Accessibility: ✓ WCAG AA`
- Compact sub-token sizing was informed by the dashboard chip result:
  `percentage change badges`
  `--badge-padding: 4px 8px`
- Color-not-only and hierarchy checks were grounded by:
  `Don't convey information by color alone`
  `Use icons/text in addition to color`
  `Screen readers use headings for navigation`

## Changed Files

- `src/runtime/m8a-v411-inspector-concurrency.ts`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles/m8a-v411-phase-b-layout.css`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-c-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-d-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`
- `public/fonts/noto-sans-tc-m8a-v411-subset.ttf`
- `docs/sdd/m8a-v4.11-impl-phase6-left-rail-decision-first-handoff.md`

The font subset asset was regenerated only to cover new required §5 rail glyphs (CJK codepoints U+6B65, U+964D, U+6027, U+6536, U+5C3E — the additional glyphs used by the new Chinese-language rail copy). No font stack, token values, measured metrics, or unrelated typography behavior changed.

## Captures

Output directory: `output/m8a-v4.11-impl-phase6/`

- Before W1: `rail-before-w1-1440x900.png`
- After W1: `rail-after-w1-1440x900.png`
- After W2: `rail-after-w2-1440x900.png`
- After W3: `rail-after-w3-1440x900.png`
- After W4: `rail-after-w4-1440x900.png`
- After W5: `rail-after-w5-1440x900.png`
- Narrow drawer: `rail-after-narrow-390x844.png`
- Runtime evidence: `capture-manifest.json`

The default before/after pair for control reconciliation is:

- `output/m8a-v4.11-impl-phase6/rail-before-w1-1440x900.png`
- `output/m8a-v4.11-impl-phase6/rail-after-w1-1440x900.png`

## Smoke Matrix

Final rerun after the rail focus adjustment:

`FULL MATRIX PASSED: 24/24`

Commands covered:

- `npm run build`
- `npm run test:m8a-v4.11:slice1` through `slice6`
- `npm run test:m8a-v4.11:conv1` through `conv4`
- `npm run test:m8a-v4.11:correction-a-phase-b` through `correction-a-phase-e`
- `npm run test:m8a-v4.10:slice1` through `slice5`
- `npm run test:m8a-v4.9`
- `npm run test:m8a-v4.8`
- `npm run test:m8a-v4.7.1`
- `node tests/smoke/verify-m8a-v4.11-impl-phase4-reviewer-mode-runtime.mjs`

Historical smoke-generated `output/` artifacts outside Phase 6 were restored after the matrix. The Phase 6 capture directory remains available for review.

## Smoke Softening Disclosure

Phase 6 adds 3 spec v2 §5 softening entries:

- Correction A Phase C: `smoke-softening-v2-5-left-rail-decision-first-correction-a-phase-c`
- Correction A Phase D: `smoke-softening-v2-5-w4-rail-next-evidence-cjk-probe`
- Correction A Phase E: `Correction A Phase E: spec v2 §5 supersedes the previous five-equal-row left rail prose; rail assertions now verify the orbit-role chip, next-state layer, and evidence/gap layer.`

Each disclosure cites spec v2 §5 as the supersede authority for replacing old `Current:` / `Candidate:` / `Fallback:` / `Decision:` / `Time/Quality:` equal-row assertions.

## A11y Check

- Keyboard order: narrow rail drawer keeps `Close` first, then the focusable orbit-role chip; current/candidate/fallback tokens, next, and evidence remain static text.
- Focus ring: the chip has `tabindex="0"` and rail-local focus handling. CSS maps `:focus-visible`, `:focus`, and `data-m8a-v411-rail-focused="true"` to a visible `--m8a-v411-state-active` outline and focus shadow.
- Contrast: capture manifest chip contrast is W1 10.41, W2 10.41, W3 9.81, W4 10.41, W5 11.15, all above 4.5:1 over the globe scene.
- Color-not-only: role label text, role glyphs `F/P/H/C/G`, current/candidate/fallback token text, next/evidence text, and existing sequence position all differentiate the windows without relying on color alone.
- Reduced motion: W4 candidate pulse is `m8a-v411-rail-candidate-pulse` in normal mode and `none` under `prefers-reduced-motion: reduce`; the visible `LEO · candidate` role chip and `C` glyph remain.
- Narrow drawer: `rail-after-narrow-390x844.png` verifies the three-layer rail works in drawer mode without changing narrow CSS.

## Scope Reconciliation

Confirmed unchanged:

- Inspector / Decision / Metrics / Evidence tab content.
- Inspector boundary header strip and validation badge.
- Footer chip strip.
- Top scope strip.
- Sequence rail.
- Countdown chip.
- Reviewer mode runtime and pause behavior.
- Narrow / tablet CSS files.
- V4.6D model id, route, pair, precision, actor set, R2 catalog, and Slice 6 transcripts.
- Orbit token values and state token family members.
- `leo-beam-sim` source.
- V4.12 / F-09 docs.
- Measured numeric metrics.

The only out-of-list support asset is the CJK font subset regeneration noted above, required so the new spec §5 rail copy renders without missing glyphs.

## Visual Quality Estimate

Default desktop 1440x900 with inspector closed is now about 6.7/10, up from the prior roughly 5/10. The rail now reads as a primary judgment surface instead of five equal prose rows. It stays below 7.5 because the unchanged surrounding console density and some pre-existing overlay polish still limit the first-read composition.

Phase 6 ready for commit? YES, with the note that the CJK font subset support asset changed to render the new spec §5 rail copy.
