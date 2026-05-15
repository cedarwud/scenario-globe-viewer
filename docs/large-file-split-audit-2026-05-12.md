# Large File Split Audit - 2026-05-12

## Scope

This pass reviewed program-file size in `scenario-globe-viewer` and performed
low-risk, behavior-preserving splits where the boundary was clear.

The highest-risk source remains
`src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`, but several
pure data, renderer, telemetry, and stylesheet seams have now been extracted.

## Splits Completed

- `src/runtime/m8a-v4-itri-demo-surfaces.ts`: customer demo constants, requirement
  status data, policy/rule presets, acceptance-layer records, and route export
  surface types.
- `src/runtime/m8a-v4-ground-station-telemetry-keys.ts`: document telemetry key
  registry.
- `src/runtime/m8a-v4-product-ux-model.ts`: V4.7-V4.10 product UX constants,
  view-model types, timeline labels, playback helpers, sequence-rail builders,
  boundary-affordance builders, and transition-event builders.
- `src/runtime/m8a-v4-itri-demo-renderers.ts`: customer requirement-gap,
  acceptance-layer, F-09 table, F-10/F-11 preset, and F-16 non-claim HTML
  fragment renderers.
- `src/runtime/m8a-v4-ground-station-telemetry-sync.ts`: scene-state to document
  telemetry projection.
- `src/styles/m8a-v47-product-ux.css`: V4.7/V4.10 product UX styles, including
  the base product UX block formerly embedded in `src/styles.css`.

## Current Large Files

| File | Current lines | Assessment |
| --- | ---: | --- |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 7780 | Still critical. Remaining size is mostly Cesium entity graph wiring, DOM structure, placement, render updates, state cloning/building, event handling, and controller lifecycle. |
| `src/styles.css` | 1963 | Improved from 3152. Still high, but now mainly app shell, HUD, first-intake panels, Cesium control overrides, homepage CTA, and older scene styles. |
| `src/runtime/m8a-v4-ground-station-projection.ts` | 1611 | Watch. Large accepted projection/contract surface; do not split unless actively editing this data contract. |
| `src/runtime/first-intake-orbit-context-actor-controller.ts` | 1382 | Watch. Separate older controller; split only if this path reopens. |
| `src/runtime/m8a-v4-product-ux-model.ts` | 1126 | New focused module. Large but cohesive; acceptable as a product UX model boundary unless it keeps growing. |
| `src/styles/m8a-v47-product-ux.css` | 1188 | New focused stylesheet. Large but selector-cohesive; future split can separate V4.7 base from V4.10 sequence/boundary styles if active work resumes here. |

## Remaining Split Candidates

Recommended next source split order:

1. `m8a-v4-ground-station-product-ux-dom.ts`: `createProductUxRoot`,
   `ensureProductUxStructure`, `getProductUxElement`, and static DOM skeleton.
2. `m8a-v4-ground-station-product-ux-placement.ts`: protection rects, scene
   annotation placement, transition-event placement, and inspector sheet
   placement.
3. `m8a-v4-ground-station-product-ux-render.ts`: `renderProductUx` and direct
   DOM update helpers.
4. `m8a-v4-ground-station-cesium-entities.ts`: endpoint, actor, relation,
   link-flow style/update helpers.
5. `m8a-v4-ground-station-state-builders.ts`: endpoint, replay, simulation,
   requirement, export, policy, and product UX state builders.

Those remaining splits are meaningful, but they touch render lifecycle and
Cesium/DOM interaction more deeply than the pure-data splits completed in this
pass. They should be paired with browser smoke coverage, not just `tsc`.

## Test And Script Files

Large smoke tests remain above 1000 lines. They are expensive for agents to
read, but they should be split through shared harness extraction rather than by
mechanically slicing individual tests. The main candidates are still the M8A
V4.7-V4.10 product-comprehension and boundary-affordance smoke tests plus
`tests/smoke/bootstrap-loads-assets-and-workers.mjs`.

## Verification

`npm run build` passes after the implemented splits. The remaining warnings are
existing Vite output: large bundle chunks and the `protobufjs` direct `eval`
warning from `node_modules`.
