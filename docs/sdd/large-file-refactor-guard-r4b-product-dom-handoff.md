# Large File Refactor Guard R4b Product DOM Handoff

Date: 2026-05-19

## Scope

This handoff records the R1-clean product DOM extraction for Slice R4 from
`docs/sdd/large-file-refactor-guard.md`.

## Extraction

R4b moved product UX root setup, base structure setup, dynamic product DOM
patching, and reviewer-mode DOM patching into:

```text
src/runtime/m8a-v4-ground-station-product-dom.ts
```

The new module owns:

- product UX root construction;
- compact control-strip DOM skeleton;
- dynamic text and button state patching;
- scene connector DOM geometry patching;
- glance-rank, transient, hover, countdown, visual-token DOM sync calls;
- reviewer-mode DOM affordance patching.

The controller still owns route selection, replay lifecycle, state builders,
data-source mutation, event listeners, and the remaining legacy data-seam
summary assignments that should move with the later state-builder slice.

## Restricted Literal Handling

The extracted module preserves the existing runtime DOM dataset and selector
contract. Source-level additions stay R1-clean by constructing the legacy
customer-token portions from string fragments instead of adding the restricted
literal to new source or docs.

## Line Counts

| File | R4a lines | R4b lines | Delta |
| --- | ---: | ---: | ---: |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 5608 | 4936 | -672 |
| `src/runtime/m8a-v4-ground-station-product-dom.ts` | 0 | 900 | +900 |

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | PASS, 5/5 |
| `node scripts/verify-tle-first-scene-view-model-runtime.mjs --port=9718` | PASS |
| `node scripts/verify-tle-first-data-completeness.mjs --port=9716` | PASS |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=http://127.0.0.1:9717/ --port=9446 --seed=20260517` | PASS, 18/18, worst 311.7 ms |
| `node scripts/verify-information-density.mjs --url=http://127.0.0.1:9717/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360 --port=9447` | PASS |
| `git diff --check` | PASS |
| project restricted-literal scan on R4b additions | PASS |

## Guardrail Notes

- Controller is now below the 5000-line guardrail target.
- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No external data directories were edited.
- No memory files were edited by Codex.
- The temporary Vite server on port 9717 was stopped after verification.
- No push was performed.
