# Large File Refactor Guard R3 Handoff

Date: 2026-05-18

## Scope

This handoff records Slice R3 from
`docs/sdd/large-file-refactor-guard.md`.

## Extraction

R3 moved Cesium entity styling and entity-option construction into:

```text
src/runtime/m8a-v4-ground-station-cesium-entities.ts
```

The new module owns:

- endpoint entity options;
- endpoint context ribbon entity options;
- fixture actor entity options;
- relation ribbon entity options;
- link-flow segment and pulse entity options;
- GEO guard cue entity options;
- selected actor emphasis helpers;
- actor, relation, segment, and pulse update helpers.

The controller still owns data-source mutation, replay lifecycle, selected-pair
async overlay install, URL and route state, product DOM, and state sync.

## Line Counts

| File | R2 lines | R3 lines | Delta |
| --- | ---: | ---: | ---: |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 6712 | 5997 | -715 |
| `src/runtime/m8a-v4-ground-station-cesium-entities.ts` | 0 | 814 | +814 |
| `src/runtime/m8a-v4-ground-station-selected-pair-layer.ts` | 1083 | 1083 | 0 |
| `src/runtime/m8a-v4-ground-station-overlay-debug.ts` | 52 | 52 | 0 |

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | PASS, 5/5 |
| `node scripts/verify-tle-first-data-completeness.mjs --port=9716` | PASS |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=http://127.0.0.1:9717/ --port=9446 --seed=20260517` | PASS, 18/18, worst 930.1 ms |
| `node scripts/verify-information-density.mjs --url=http://127.0.0.1:9717/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360 --port=9447` | PASS |
| `node scripts/verify-60x-replay-continuity.mjs --url=http://127.0.0.1:9717/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360 --port=9448` | PASS, panel ready, replay advanced, console/page errors 0 |
| `git diff --check` | PASS |
| project restricted-literal scan on R3 additions | PASS |

## Guardrail Notes

- Controller public exports remain in the controller module.
- The new Cesium helper module stays below the 1200-line soft limit.
- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No memory files were edited by Codex.
- No push was performed.
