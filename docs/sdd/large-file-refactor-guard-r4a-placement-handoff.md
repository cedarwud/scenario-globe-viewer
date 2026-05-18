# Large File Refactor Guard R4a Placement Handoff

Date: 2026-05-18

## Scope

This handoff records the safe placement-only part of Slice R4 from
`docs/sdd/large-file-refactor-guard.md`.

## Extraction

R4a moved scene annotation placement helpers into:

```text
src/runtime/m8a-v4-ground-station-placement.ts
```

The new module owns:

- scene anchor projection;
- protection rectangle math;
- annotation placement;
- connector start and angle math;
- scene-near render-state derivation.

The controller still owns product DOM rendering, state sync, replay lifecycle,
event listeners, data-source mutation, and selected-pair overlay lifecycle.

## Line Counts

| File | R3 lines | R4a lines | Delta |
| --- | ---: | ---: | ---: |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 5997 | 5608 | -389 |
| `src/runtime/m8a-v4-ground-station-placement.ts` | 0 | 426 | +426 |

## Verification

Completed gates:

| Gate | Result |
| --- | --- |
| `npm run build` | PASS |
| `node scripts/verify-information-density.mjs --url=http://127.0.0.1:9717/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360 --port=9447` | PASS |
| `git diff --check` | PASS |
| project restricted-literal scan on R4a additions | PASS |

## R4 Blocker

Full R4 also asks for product DOM extraction and controller line count below
5000. The product DOM region contains existing legacy dataset and selector
names that include the project-restricted customer-name literal. Moving that
region directly into a new source file would reintroduce the restricted
literal in added lines.

Full product DOM extraction therefore needs explicit scope approval for one of
these approaches:

- rewrite those source-level names with computed string fragments while
  preserving runtime DOM dataset and selector names; or
- defer product DOM extraction until the legacy customer-specific surface is
  renamed in a separate approved slice.

## Guardrail Notes

- No marker modules, `composition.ts`, or `src/styles.css` were edited.
- No memory files were edited by Codex.
- No push was performed.
