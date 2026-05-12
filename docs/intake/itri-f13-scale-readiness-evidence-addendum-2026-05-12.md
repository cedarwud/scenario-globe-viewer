# ITRI F-13 Scale Readiness Evidence Addendum

Date: 2026-05-12

Canonical route:

`/?scenePreset=regional&m8aV4GroundStationScene=1`

Status: documentation/evidence status addendum for the F-13 readiness surface.
This addendum records completed readiness/demo evidence only. It does not claim
F-13 external closure, route-native `>=500 LEO` closure/proof, ITRI authority
acceptance, live network truth, active satellite/gateway/path truth, measured
traffic truth, ITRI orbit-model integration, or external report-system closure.

## Completed Readiness Surface

F-13 now has a route-exposed fixture/model-backed scale readiness surface on
the canonical route.

The surface reports readiness/demo input of `549` total fixture/model-backed
actors, including `540` LEO, `6` MEO, and `3` GEO points, against a `500` LEO
readiness target. This is readiness/demo evidence, not closure/proof.

The canonical route remains a route-local bounded reviewer-ready demo. The
handover scene remains the 13-actor route demo; the `549/540` readiness count is
fixture/model-backed demo input, not live route-native constellation proof.

## Evidence Artifacts

F-13 readiness surface evidence:

- `output/itri-demo-route-f13-scale-readiness/desktop-1440x900-f13-scale-readiness.json`
- `output/itri-demo-route-f13-scale-readiness/desktop-1440x900-f13-scale-readiness.png`

Related retained route/status evidence:

- `output/validation/itri-demo-route-final-closure-2026-05-12.md`
- `output/itri-v4-demo-redesign-phase5-reviewer-evidence/2026-05-12T04:21:45.118Z/`
- `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`

Phase 7.1 remains a separate evidence boundary and is valid for citation until
`2026-05-25T16:43:23.879Z` UTC unless rerun. It is not converted by this
addendum into route-native closure/proof.

## Source And Freshness

| Field | Value |
| --- | --- |
| Data/source type | `fixture/model-backed` |
| Source mode | `multi-orbit-scale-points` |
| Source input | repo-local walker-derived multi-orbit scale fixture/model data |
| Source URL | `not-applicable-repo-local-fixture` |
| Public-source retrieval used | No |
| Built at UTC | `2026-05-12T09:53:20Z` |
| Freshness timestamp UTC | `2026-05-12T09:53:20Z` |

The readiness data uses repo-local fixture/model-backed input. It is not an
ITRI authority source and not a public-source authority. No broad public-source
research or public-source retrieval was added for this readiness surface.

## Validation Commands

The implementation results reported for the F-13 readiness surface are:

| Command | Result | Evidence note |
| --- | --- | --- |
| `npm run build` | Pass | Build passed before this documentation addendum. |
| `node tests/smoke/verify-itri-demo-route-f13-scale-readiness-runtime.mjs` | Pass | Produced the F-13 readiness JSON and screenshot artifacts listed above. |
| `node tests/smoke/verify-itri-demo-view-acceptance-layer-runtime.mjs` | Pass | Confirmed the acceptance layer exposes readiness status without closure/proof claims. |
| `node tests/smoke/verify-itri-demo-route-requirement-gap-surface-runtime.mjs` | Pass | Confirmed the route still surfaces requirement gaps and non-closure boundaries. |
| `git diff --check` | Pass | Whitespace check passed for the implementation results before this addendum. |

## Remaining F-13 Gap

F-13 still has no route-native `>=500 LEO` closure/proof and no ITRI authority
acceptance. External closure still requires ITRI/testbed controlled artifacts or
explicit authority acceptance.

Forbidden positive claims remain:

- Route-native `>=500 LEO` closure/proof.
- ITRI authority acceptance or full ITRI external validation closure.
- Live network truth, active satellite/gateway/path, or pair-specific path
  truth.
- Measured throughput, latency, jitter, packet-loss, `ping`, or `iperf` truth.
- ITRI orbit-model integration.
- External report-system closure.
