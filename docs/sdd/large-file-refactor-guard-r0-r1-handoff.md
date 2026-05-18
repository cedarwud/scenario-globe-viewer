# Large File Refactor Guard R0-R1 Handoff

Date: 2026-05-18

## Scope

This handoff records the first two slices of
`docs/sdd/large-file-refactor-guard.md`.

## R0 Baseline

Pre-refactor status:

```text
## main...origin/main [ahead 8]
?? docs/sdd/multi-station-selector/tle-first-fidelity-uplift.md
```

`docs/sdd/multi-station-selector/tle-first-fidelity-uplift.md` was
pre-existing untracked work and was not touched.

R1 working set:

```text
docs/sdd/large-file-refactor-guard-r0-r1-handoff.md
scripts/verify-tle-first-scene-view-model-runtime.mjs
src/runtime/m8a-v4-ground-station-handover-scene-controller.ts
src/runtime/m8a-v4-ground-station-selected-pair-layer.ts
```

Line-count baseline:

| File | Baseline lines | R1 lines | Delta |
| --- | ---: | ---: | ---: |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 7570 | 6713 | -857 |
| `src/runtime/m8a-v4-ground-station-selected-pair-layer.ts` | 0 | 1126 | +1126 |
| `src/features/multi-station-selector/v4-projection-side-panel.ts` | 1586 | 1586 | 0 |
| `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | 2908 | 2908 | 0 |

## R1 Extraction

R1 moved the selected-pair runtime scene layer into:

```text
src/runtime/m8a-v4-ground-station-selected-pair-layer.ts
```

The extracted module owns selected-pair TLE-first source loading, projection
view-model creation, runtime data-completeness overlay state, actor entity
styles, active-link cue rendering, handover cue rendering, and selected-pair
camera hint callback wiring.

The controller keeps route decisions, replay lifecycle, endpoint context, data
source lifecycle, debug-state retention, and the public controller exports.

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | PASS, 5/5 |
| `node scripts/verify-tle-first-scene-view-model-runtime.mjs --port=9718` | PASS |
| `node scripts/verify-tle-first-data-completeness.mjs --port=9716` | PASS |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=http://127.0.0.1:9717/ --port=9446 --seed=20260517` | PASS, 18/18, worst 686.3 ms |
| `node scripts/verify-information-density.mjs --url=http://127.0.0.1:9717/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360 --port=9447` | PASS |
| `git diff --check` | PASS |
| project restricted-literal scan on R1 additions | PASS |

The 60x replay continuity smoke was not required for R1 by the SDD matrix; it
is reserved for R3-R5 unless a later slice changes replay lifecycle behavior.

## Guardrail Notes

- Public controller exports remain in
  `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`.
- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No external data directories were edited.
- No memory files were edited by Codex.
- No push was performed.
