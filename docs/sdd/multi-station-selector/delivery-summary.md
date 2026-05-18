# Multi-Station Selector IA Convergence Delivery Summary

## 1. Mission recap

Wave 1-5 converged the selected-pair IA into one reviewer-facing browser surface.
User goal: "Bucket A 19 reqs visibly satisfied; clean IA (info at right time/right place, not Details-monolith); 60x replay continuous; any 2 valid registry stations sub-1s recompute."
The result is a single-route selector, selected-pair projection panel, replay chrome, and evidence surface that a customer acceptance reviewer can reproduce from the public registry.
Total post-SDD delta from `08fee12..HEAD`: 26 files, 4,664 insertions, 3,478 deletions, net +1,186 LOC.

## 2. Waves shipped

| Wave | Commits (sha range) | Net LOC | Key outcomes |
| --- | --- | ---: | --- |
| Wave 1 | `a3be99d-830b217` | +1,066 | Added `display-state.ts`, info-card open signal, unified selector mount, V4 panel display-state wiring, chrome telemetry chips, and invalid deep-link state. |
| Wave 2 | `172e628-52d1032` | +544 | Retired top-right contention rule, rewrote the V4 projection panel into IA rows, re-anchored V4 endpoint surfaces on selection change, and aligned the G3 selector. |
| Wave 3 | `d69c7e6-e6c5ef8` | -2,707 | Removed dead V4 controller top strip, transition, scene annotation, sequence rail, handover rail, reviewer status, boundary surface, inspector sheet, orphan CSS, and stale manifest rows. |
| Wave 4 | `33d3c8d-1ae09ad` | +1,227 | Added G5 density smoke, replay event pill contract and module, endpoint A/B visual unification, density fixes, walkthrough retargeting, and G4 18-pair budget smoke. |
| Wave 5 | `44a3982` | -79 | Removed dead customer-literal HUD dataset writes from `renderHud`, reducing legacy noise in the visible product UX root. |
| Smoke fixes | `8945346-7b599eb`, `4295a32-808bf4c` | +1,135 | Added G1 19-row coverage smoke and hardened V4.4, V4.5, G1, G3, and acceptance-gate scripts for headless Chromium and replay-clock sampling. |

## 3. Acceptance gates

| Gate | Status | Smoke file | Evidence path |
| --- | --- | --- | --- |
| G1 Bucket A coverage | PASS, 19/19 | `scripts/verify-g1-bucket-a-coverage.mjs` | `/tmp/g1-verify.json` |
| G3 60x replay continuity | PASS | `scripts/verify-60x-replay-continuity.mjs` | `/tmp/g3-v5.json` |
| G4 any-2-station budget | PASS, 18/18, worst 323 ms | `scripts/verify-random-pair-projection-budget.mjs` | `/tmp/g4-verdict-final.json` |
| G5 information density | PASS at 1280x800 and 1920x1080 | `scripts/verify-information-density.mjs` | `/tmp/g5-verdict-final.json` |
| G6 no customer-name literal authored | PASS | acceptance scan in `docs/sdd/multi-station-selector/acceptance-criteria.md` | stdout not retained; cleanup commit `44a3982` |
| G7 build clean | PASS | `npm run build` | stdout not retained |

## 4. SDD trio

- `docs/sdd/multi-station-selector/information-architecture.md` - IA, state machine, surface registry, and five-row panel layering.
- `docs/sdd/multi-station-selector/runtime-data-contract.md` - data layer, composition subscription contract in A.6, and wave-1 reload semantic in A.7.
- `docs/sdd/multi-station-selector/acceptance-criteria.md` - G1-G7 acceptance gates, smoke expectations, and rollback posture.

## 5. New runtime modules

- `src/features/multi-station-selector/display-state.ts` - wave 1. Exports `DisplayState`, `DisplayStateInputs`, `OpenSignal`, `resolveDisplayState(inputs): DisplayState`, and `subscribeDisplayState(...): () => void`. It is DOM-free and lets composition derive `idle`, `selecting`, `projecting`, `replaying`, or `invalid`.
- `src/features/multi-station-selector/replay-event-pill.ts` - wave 4. Exports `ReplayEventPillHandle` with `setDisplayState`, `setRuntimeResult`, and `dispose`, plus `mountReplayEventPill(viewerContainer, replayClock): ReplayEventPillHandle`. It owns the stable bottom-right replay event pill and 4 s fade cycle.

## 6. Visible UI inventory

- `chrome.topLeft`: selection chips, list picker, replay strip, and LEO actor count chip.
- `chrome.topRight`: V4 projection side panel in `projecting` and `replaying`.
- `chrome.bottomLeft`: Cesium credit and TLE telemetry chip.
- `chrome.bottomRight`: transient replay event pill.
- `globe`: registry markers, V4 endpoint A/B markers, and selected-pair display lane.

## 7. Five-row panel layering

Per IA section 5, the side panel is a top-to-bottom triage funnel. Row 1 is the header: pair title, tier badge, ISO window, and copy-link. Row 2 is the rain slider. Row 3 is the flat stats grid for `Comm time` and `Handovers`. Row 4 contains two summary lists: next-three visibility windows and link-selection events, with the V-MO1 cross-orbit event pinned when present. Row 5 contains three independent disclosures: `Rain impact`, `All visibility windows`, and `Sources + non-claims`. Row 6 is the fixed footer: `precisionLabel · sourceTier`.

## 8. Out of scope / deferred

- Wave 6: deeper customer-literal cleanup across `renderProductUx` legacy dataset writes, telemetry keys, `build*State` helpers, and imports. Expected saving is about 200-300 more LOC. This needs user sign-off because it touches the visible product UX root.
- Antenna pattern for K-A3-a Bucket B remains a standalone module at `src/runtime/link-budget/antenna-pattern.ts`; it is not wired into selected-pair compute. IA section 6.1 points reviewers to that file.

## 9. Reproducibility one-liners

- `npm run dev` and open one of the five walkthrough URLs from `docs/*-requirement-walkthrough.md` section 3.
- `node scripts/verify-g1-bucket-a-coverage.mjs --port=9701` runs the Bucket A coverage smoke.
- `node scripts/verify-60x-replay-continuity.mjs --port=9702` runs the 60x continuity smoke; it takes 6 wall-clock minutes.
- `node scripts/verify-random-pair-projection-budget.mjs --port=9703` runs the 18-pair budget smoke.
- `node scripts/verify-information-density.mjs --port=9704` runs the density smoke.
