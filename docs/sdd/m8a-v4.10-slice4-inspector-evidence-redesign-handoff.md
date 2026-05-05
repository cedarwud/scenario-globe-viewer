# M8A-V4.10 Slice 4 Inspector Evidence Redesign Handoff

## Changed Files

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `package.json`
- `tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice4-inspector-evidence-redesign-handoff.md`
- `output/m8a-v4.10-slice4/capture-manifest.json`
- `output/m8a-v4.10-slice4/v4.10-slice4-default-1440x900.png`
- `output/m8a-v4.10-slice4/v4.10-slice4-default-1440x900.metadata.json`
- `output/m8a-v4.10-slice4/v4.10-slice4-default-390x844.png`
- `output/m8a-v4.10-slice4/v4.10-slice4-default-390x844.metadata.json`
- `output/m8a-v4.10-slice4/v4.10-slice4-details-open-1440x900.png`
- `output/m8a-v4.10-slice4/v4.10-slice4-details-open-1440x900.metadata.json`
- `output/m8a-v4.10-slice4/v4.10-slice4-boundary-open-1440x900.png`
- `output/m8a-v4.10-slice4/v4.10-slice4-boundary-open-1440x900.metadata.json`

## Implementation Summary

Slice 4 keeps Details default-closed and redesigns the Details sheet as a secondary evidence inspector. The inspector now exposes four explicit evidence groups:

- current replay/event evidence
- sequence / selected window context
- source and boundary notes
- what is not being claimed

The runtime records the Slice 4 inspector evidence version, evidence structure, denied first-read roles, not-claimed content, and Details-vs-Truth surface separation in state and DOM datasets. The visible inspector copy avoids first-read narrative roles and avoids raw id / selected-cue metadata wording in the primary inspector path.

The existing route, endpoint pair, precision, actor set, source boundary, V4.6D model truth, replay controls, timeline, and five-state sequence behavior remain unchanged.

## Inspector Behavior Before/After

Before this slice, Details carried the existing product-comprehension hierarchy and could read too much like the primary product explanation.

After this slice, Details opens an evidence-oriented inspector only on user request. It preserves the V4.9 primary section contracts for regression compatibility, but the visible grouping and copy make it a secondary evidence/source/boundary surface rather than an operator log, claim panel, mission narrative, or primary product narrative.

## Details vs Truth State Separation Findings

- Default Details state: closed.
- Default Truth boundary state: closed.
- Details click opens only the evidence inspector and keeps the focused Truth boundary surface closed.
- Truth click opens only the focused boundary surface and keeps Details closed.
- The Truth boundary full disclosure remains inspectable inside the focused boundary surface without merging back into Details.
- A small pointer fallback was added so coordinate-based smoke clicks activate controls while transition events are visible; DOM click activation remains guarded against double toggles.

## Screenshot / Evidence Inventory

Evidence root: `output/m8a-v4.10-slice4/`

- `capture-manifest.json`
- `v4.10-slice4-default-1440x900.png`
- `v4.10-slice4-default-390x844.png`
- `v4.10-slice4-details-open-1440x900.png`
- `v4.10-slice4-boundary-open-1440x900.png`
- metadata JSON beside each screenshot

The manifest records `status: "cleanup-complete"` and includes native Cesium surface rectangles used for overlap checks.

## Tests Run

- `node --check tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` - passed
- `npm run test:m8a-v4.10:slice4` - passed
- `npm run test:m8a-v4.10:slice3` - passed
- `npm run test:m8a-v4.10:slice2` - passed
- `npm run test:m8a-v4.10:slice1` - passed
- `npm run test:m8a-v4.9` - passed
- `npm run build` - passed

Build output still reports the existing large chunk and `protobufjs` direct `eval` warnings.

## Deviations

No product-scope deviations. No endpoint, route, precision, actor-set, source-boundary, R2 selector, or V4.6D model-truth expansion was introduced.

The implementation includes a compatibility fix for coordinate-based control activation during transition overlays, because the required V4.9 regression uses CDP mouse coordinates to verify controls are not intercepted.

## Risks / Blockers

- The inspector keeps V4.9 section labels and data seams for regression compatibility while adding Slice 4 evidence grouping. Future copy changes should keep the primary inspector free of raw id / selected-cue metadata phrases.
- The Cesium default token notice remains present as a native Cesium surface; Slice 4 tests assert the narrow sequence rail does not incoherently overlap it.

## Remaining Work

Slice 5 remains unimplemented. This handoff does not add a Slice 5 validation matrix or expand acceptance criteria beyond Slice 4 plus required regressions.

## Runtime Cleanup

The smoke scripts started temporary Python static servers and headless browser processes and reported cleanup-complete manifests / runtime process facts. No dev server is intentionally retained by this slice. Existing unrelated Codex, VSCode, and MCP background processes were not stopped.
