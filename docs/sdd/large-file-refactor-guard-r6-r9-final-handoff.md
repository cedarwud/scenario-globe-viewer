# Large File Refactor Guard R6-R9 Final Handoff

Date: 2026-05-19

## Scope

This handoff records the final large-file budget split from
`docs/sdd/large-file-refactor-guard.md`.

## Extraction

Runtime responsibilities moved out of the ground-station controller into:

```text
src/runtime/m8a-v4-ground-station-orbit-render-layer.ts
src/runtime/m8a-v4-ground-station-product-sync.ts
src/runtime/m8a-v4-ground-station-scene-frame.ts
```

The V4.9 product-comprehension smoke was split into focused helpers under:

```text
tests/smoke/helpers/m8a-v4-product-comprehension-*.mjs
```

## Line Counts

| File | R5 lines | Final lines | Result |
| --- | ---: | ---: | --- |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 4137 | 2487 | under final 2500-line target |
| `src/runtime/m8a-v4-ground-station-orbit-render-layer.ts` | 0 | 736 | helper under 1200 |
| `src/runtime/m8a-v4-ground-station-product-sync.ts` | 0 | 787 | helper under 1200 |
| `src/runtime/m8a-v4-ground-station-scene-frame.ts` | 0 | 286 | helper under 1200 |
| `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | 3114 | 163 | under final 1200-line target |
| Largest new smoke helper | 0 | 1119 | under final 1200-line target |

## Budget Guard

`scripts/verify-large-file-budgets.mjs` now enforces:

- controller final budget: 2500 lines, hard cap 3000 lines;
- runtime helper final budget: 1200 lines each;
- product-comprehension smoke entrypoint final budget: 1200 lines;
- smoke helper final budget: 1200 lines each;
- `src/styles.css` report-only tracking, still not a blocking gate.

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `npm run verify:large-file-budgets` | PASS |
| `npm run verify:large-file-budgets:final` | PASS; controller 2487/2500, all runtime and smoke helpers under 1200 |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | PASS, 5/5 |
| `node scripts/verify-tle-first-data-completeness.mjs --port=9716` | PASS |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=http://127.0.0.1:9717/ --port=9446 --seed=20260517` | PASS, 18/18, worst 416 ms |
| `git diff --check` on changed paths | PASS |
| restricted-literal scan on added lines | PASS |

## Known Follow-Up

The full V4.9 product-comprehension smoke currently still asserts a legacy
`details-toggle` / `inspection-sheet` DOM contract that was removed during the
earlier wave-3 DOM cleanup. The split keeps that existing contract visible
instead of reintroducing deleted DOM into this large-file budget commit.

## Guardrail Notes

- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No external data directories were edited.
- No memory files were edited by Codex.
- No push was performed.
