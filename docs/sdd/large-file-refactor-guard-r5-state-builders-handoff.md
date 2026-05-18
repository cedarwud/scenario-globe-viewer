# Large File Refactor Guard R5 State Builders Handoff

Date: 2026-05-19

## Scope

This handoff records Slice R5 from
`docs/sdd/large-file-refactor-guard.md`.

## Extraction

R5 moved pure runtime state construction and state cloning into:

```text
src/runtime/m8a-v4-ground-station-state-builders.ts
```

The new module owns:

- endpoint state projection;
- replay-window timing state;
- service-state and simulation-handover window resolution;
- product UX state construction;
- state cloning for listener notifications;
- the full LEO orbit replay profile derived from local TLE actor lineage.

The controller still owns route setup, Cesium data-source mutation, event
listener wiring, replay lifecycle side effects, and the remaining export and
policy helper surfaces reserved for later controller diet work.

## Boundary Notes

- The state-builder module has no DOM writes and no Cesium entity mutation.
- Existing product UX and reviewer-mode runtime contracts are imported from
  their source modules instead of being redefined.
- Static policy and rule preset references remain shared to preserve exact
  readonly tuple types.

## Line Counts

| File | R4b lines | R5 lines | Delta |
| --- | ---: | ---: | ---: |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 4936 | 4137 | -799 |
| `src/runtime/m8a-v4-ground-station-state-builders.ts` | 0 | 850 | +850 |

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `npm run verify:large-file-budgets` | PASS, interim profile; controller 4137/5000 lines, target 4200 |
| `git diff --check` on R5 paths | PASS |
| restricted-literal scan on R5 additions | PASS |

The interim budget gate still reports the product-comprehension smoke file as
a warning because Slice R6 is not complete in this commit.

## Guardrail Notes

- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No external data directories were edited.
- No memory files were edited by Codex.
- No push was performed.
