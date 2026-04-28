# M8A-V4.7 Handover Product UX Plan

Source note: this is a doc-only SDD delta for the `M8A-VNext`
ground-station scene after the `V4.6A/B/D/E` runtime baseline and the
`1f33697` HUD-hide cleanup. It defines product UX, playback, information
architecture, layout, truth-boundary disclosure, and validation policy. It does
not authorize runtime implementation by itself.

Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).
Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related follow-on roadmap:
[./multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md).
Related V4.6D model contract:
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).
Related V4 projection contract:
[../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md).
Related scope reset:
[../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md).

## Status

- accepted planning-control SDD delta
- doc-only
- accepted as product UX authority on 2026-04-28 after review
- no runtime implementation authority by itself
- runtime implementation completed after explicit implementation opening on
  2026-04-28; accepted runtime commit `26781b8`
- intended phase: `M8A-V4.7` product UX / playback / information architecture
- current as of 2026-04-28

Review disposition:

- accepted with non-blocking cleanup edits
- no blocking scope leak found
- runtime implementation was later explicitly opened and completed against this
  SDD

## Accepted Baseline

The `M8A-V4.7` UX plan starts from this fixed baseline:

- `V4.6A`, `V4.6B`, `V4.6D`, and `V4.6E` are runtime baseline
- latest relevant runtime cleanup: `1f33697 Hide M8A V4.6E floating HUD`
- the V4.6E floating HUD is hidden
- the HUD root remains only as a runtime/test seam, not as accepted visible UX
- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- precision: `operator-family-only`
- actor set: `6` LEO, `5` MEO, `2` GEO display-context actors
- model id: `m8a-v4.6d-simulation-handover-model.v1`
- model truth: `simulation-output-not-operator-log`
- state selector: normalized replay ratio over the V4.6A full LEO replay
- `R2` remains read-only evidence/catalog support, not a runtime selector

The replay window already covers the longest current OneWeb LEO period plus a
small margin. `V4.7` does not change the replay truth or actor data. It changes
how product users perceive and control the already accepted replay.

## Non-Goals

`V4.7` is not:

- `V5`
- a runtime endpoint selector
- `R2` runtime promotion
- endpoint expansion
- new endpoint-pair authority work
- new orbit actor source work
- model truth expansion
- measured metric work
- active satellite, gateway, path, or native RF handover work

## Product UX Problem Statement

The source-grounded V4 scene now has enough runtime material to explain a
multi-orbit handover simulation, but the product viewing experience is not yet
controlled.

Observed UX issues:

- `240x` plays the full replay in about `29s`, which is too fast for product
  review and should be treated as dev/debug only
- the replay window is long enough, but the default playback pace does not give
  users enough time to read the five handover states
- a bottom HUD blocks the earth and endpoint corridor
- a top-left HUD can block GEO or satellite context and has insufficient text
  size
- the hidden V4.6E floating HUD should not become the accepted product
  direction by reappearing as another overlay

The product problem is therefore not missing data. The product problem is that
the current scene needs an explicit playback policy, information hierarchy,
layout policy, and visual validation contract.

## Playback Speed Policy

Accepted policy for future implementation:

| Mode | Multiplier | Purpose |
| --- | ---: | --- |
| product default | `60x` | normal product review and homepage demo |
| guided review | `30x` | slower walkthrough while explaining state changes |
| quick scan | `120x` | short review when the user already knows the scene |
| dev/debug | `240x` | implementation and smoke-test acceleration only |

`240x` must not be the product default and must not be the first visible product
choice. Product controls should not expose `240x` in the normal review path;
it may appear only through an explicit dev/debug mode or a test harness
override.

With an approximate `115` minute simulated replay window, expected review
durations are:

| Multiplier | Approximate wall-clock duration |
| ---: | ---: |
| `30x` | about `3m50s` |
| `60x` | about `1m55s` |
| `120x` | about `58s` |
| `240x` | about `29s` |

Future validation should derive the exact durations from the actual replay
start/stop range rather than hardcoding these estimates.

## Loop, Hold, Pause, And Restart Behavior

Future runtime behavior should follow these semantics:

- route entry starts in autoplay at `60x` unless the user or test harness
  explicitly overrides playback
- replay ratio advances from `0` to `1` using the shared replay authority
- the final `geo-continuity-guard` state must be visible at replay end
- after reaching replay end, the scene holds the final state for `3-5s`
- during the hold, replay ratio remains `1`, progress remains at the replay
  end, and the visible state label remains `GEO guard`
- the hold must not create a sixth state or alter the V4.6D window sequence
- after the hold, the replay restarts from ratio `0`
- pause freezes replay ratio, current state window, relation cues, actor
  positions, and time display
- restart returns to ratio `0`
- restart while playing returns to the start and continues playing
- restart while paused returns to the start and remains paused
- speed changes apply to subsequent replay-clock advancement without changing
  the accepted state-window boundaries

The hold at the end is a product readability affordance. It must not be
presented as an extra handover state.

## Time Display Semantics

The UI may show replay time, but it must make the time boundary explicit.

Required semantics:

- label displayed time as simulated replay time
- if an absolute timestamp is shown, label it as replay UTC or simulated UTC
- show current speed as a playback multiplier
- show progress as replay progress over the accepted window
- do not imply live operations, real operator logs, or observed service events

Allowed display examples:

- `Sim replay 00:42 / 01:55`
- `Replay UTC 2026-04-28T...Z`
- `60x`
- `LEO pressure`

Disallowed display implications:

- live network time
- operator event time
- active service session time
- measured handover duration
- measured metric units such as `ms`, `Mbps`, `Gbps`, or measured percentage
  labels

## Information Hierarchy

The scene must remain the product focus. Future implementation should order
information as follows:

1. Scene first: globe, endpoint pair, orbit actors, and relation cues.
2. Current simulation state: one of the five accepted V4.6D windows.
3. Playback and time: play/pause, restart, speed, progress, simulated time.
4. Truth-boundary badges: `simulation output`, `operator-family precision`,
   and `display-context actors`.
5. Optional detail: role legend, bounded metric classes, and expanded
   non-claim detail.

The UI should keep state names human-readable while preserving the accepted
model semantics:

| Model window | Product label |
| --- | --- |
| `leo-acquisition-context` | `LEO acquire` |
| `leo-aging-pressure` | `LEO pressure` |
| `meo-continuity-hold` | `MEO hold` |
| `leo-reentry-candidate` | `LEO re-entry` |
| `geo-continuity-guard` | `GEO guard` |

Role language must remain display-context language:

- `display representative`
- `candidate context`
- `fallback context`

The UI must not introduce active-service role names such as serving satellite,
active gateway, gateway assignment, teleport path, or RF handover.

Future validation should prove that each product label maps to the accepted
V4.6D window id listed in this table.

## Layout And Non-Obstruction Policy

The accepted V4.7 direction is not "add another floating HUD." It is a layout
and camera-composition policy.

Rejected primary layouts:

- bottom HUD as the accepted primary information surface
- top-left HUD as the accepted primary information surface
- a new floating HUD that covers the scene without reserving space or passing
  visual validation

Candidate desktop layout:

- a right-side review rail or reserved control column may be used
- the rail must be part of the layout or explicitly accounted for by camera
  composition
- the rail must not cover the earth, endpoint corridor, active relation cues,
  GEO continuity area, required labels, or native Cesium timeline/credits

Required non-obstruction zones:

- visible earth body
- Taiwan/Singapore endpoint corridor
- active representative relation cue
- active candidate context relation cue
- GEO continuity guard area
- MEO and LEO context markers needed by the current state
- required actor and endpoint labels
- Cesium timeline, animation affordances, and credits

If a right-side review rail cannot pass non-obstruction validation, the future
implementation must use an alternative layout such as:

- compact top status/control strip plus user-triggered right sheet
- compact status/control strip plus inspector drawer
- scene-reserved split layout where the camera and canvas bounds are adjusted
  together

## Desktop Behavior

Desktop product review should:

- default to the accepted route and `60x` product playback
- keep the scene visually dominant
- keep state, timeline, controls, and truth badges in one predictable control
  area
- avoid scattering controls across corners
- keep typography large enough for review screenshots
- preserve native Cesium controls and credits
- keep the hidden V4.6E floating HUD hidden unless a future explicit correction
  reopens it

The desktop layout is accepted only if screenshots prove that the information
surface does not obscure the primary visual evidence.

## Narrow Viewport Behavior

Narrow viewport product review should:

- default to a minimal status/control strip
- show current state, play/pause, speed, and replay progress in the default
  strip
- move detail into a user-triggered drawer or sheet
- treat the drawer as inspection mode, not default viewing mode
- keep text and controls readable and touchable
- avoid permanently covering the globe, endpoint pair, or GEO/MEO context

The narrow viewport must not be a scaled-down copy of a desktop HUD.

## Truth-Boundary Disclosure Strategy

Persistent badges should remain compact and always available:

- `simulation output`
- `operator-family precision`
- `display-context actors`

Expanded disclosure may be user-triggered and should explain:

- the model is simulated display-context state, not an operator handover log
- actors are source-lineaged display-context actors, not active serving
  satellites
- endpoint precision is operator-family only
- no active gateway assignment is claimed
- no pair-specific teleport path is claimed
- no measured latency, jitter, throughput, or continuity is claimed
- no native RF handover is claimed

Disclosure must be visible or inspectable without reintroducing a large
blocking panel as the default view.

## Validation Criteria

Future runtime implementation must include validation for both behavior and
visual acceptance.

Viewport matrix:

| Viewport class | Required validation size |
| --- | --- |
| desktop review | `1440x900` |
| desktop compact | `1280x720` |
| narrow/mobile | `390x844` |

If the repo already has a stricter smoke-test viewport matrix when
implementation begins, use the stricter matrix while preserving these minimum
coverage classes.

Playback validation:

- default product speed is `60x`
- `30x`, `60x`, and `120x` are product/review speeds
- `240x` is dev/debug only
- `240x` is not visible in normal product controls, first product choices, or
  the normal user review path
- final-state hold lasts `3-5s`
- during final-state hold, replay ratio stays `1`, progress stays at replay
  end, and state remains `geo-continuity-guard`
- final-state hold does not create a sixth model state
- pause freezes replay ratio, state, cues, and time display
- restart semantics match this SDD

Model and truth-boundary validation:

- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains unchanged
- precision remains `operator-family-only`
- actor set remains `6` LEO, `5` MEO, `2` GEO
- V4.6D state windows remain the source of current-state labels
- forbidden-claim scan remains clean
- UI copy does not contain live/operator implication for handover events
- UI copy does not contain numeric measured metric units such as `ms`, `Mbps`,
  `Gbps`, or measured percentages
- raw `itri` side-read scan remains clean
- measured metric truth remains disallowed
- product labels map exactly to the accepted V4.6D window ids
- the three persistent truth badges are visible or inspectable on both desktop
  and narrow viewports: `simulation output`, `operator-family precision`, and
  `display-context actors`

Visual validation:

- desktop screenshot proves the scene remains the primary visual subject
- narrow screenshot proves the default view is not blocked by detail surfaces
- primary UI bounding boxes must not intersect the protected bounding boxes for
  the endpoint corridor, GEO guard area, and required labels in accepted
  screenshots
- no accepted primary layout covers the earth body
- no accepted primary layout covers the endpoint corridor
- no accepted primary layout covers the GEO continuity area
- no accepted primary layout covers required MEO/LEO state cues
- no accepted primary layout covers required labels
- Cesium timeline, controls, and credits remain usable or visible as required
- text in controls and badges is legible at desktop and narrow viewport sizes

If any proposed desktop or narrow layout fails these checks, the implementation
must revise layout before acceptance rather than treating the failure as a
known cosmetic issue.

## Implementation Phase Breakdown

The original SDD authoring phase was doc-only. Runtime implementation was later
opened explicitly and completed against this accepted SDD.

Future implementation should be split into small phases:

1. Playback policy and deterministic behavior
   - set product default speed
   - expose accepted speed choices
   - implement hold, pause, restart, and loop semantics
   - validate behavior without changing endpoint/model truth
2. Information architecture and layout shell
   - replace hidden floating HUD assumptions with accepted information
     hierarchy
   - implement desktop review rail only if non-obstruction checks pass
   - implement narrow status strip and drawer/sheet behavior
3. Truth-boundary disclosure
   - keep persistent badges compact
   - add inspectable detail without default scene obstruction
   - preserve forbidden-claim policy
4. Visual and smoke validation
   - add desktop and narrow viewport screenshot checks
   - add playback-policy smoke checks
   - keep raw source-boundary and forbidden-claim scans clean

Each implementation phase must preserve the accepted endpoint pair, precision,
actor set, route, and V4.6D model truth.

## Runtime Implementation Result

Runtime status:

- completed after explicit V4.7 runtime implementation opening
- no runtime endpoint, actor, source, or model-truth expansion
- accepted runtime commit: `26781b8`

Changed runtime and validation files:

- `package.json`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs`
- `tests/smoke/verify-m8a-v4.6a-full-leo-orbit-replay-runtime.mjs`
- `tests/smoke/verify-m8a-v4.6b-source-lineaged-orbit-actors-runtime.mjs`
- `tests/smoke/verify-m8a-v4.5-visual-acceptance-regression-runtime.mjs`

Implemented:

- `60x` autoplay product default
- `30x` guided review and `120x` quick scan controls
- `240x` debug/test-only seam, not normal product controls
- final `GEO guard` hold at replay end
- replay ratio and progress fixed at `1` during final hold
- hold loop back to replay start
- pause, play, restart, and speed control semantics
- simulated replay time and replay UTC display
- V4.6D window id to product label mapping
- desktop right review rail
- narrow minimal strip plus inspection sheet
- persistent truth badges and inspectable disclosure
- hidden V4.6E floating HUD seam retained

Validation result:

- `npm run test:m8a-v4.7` passed
- `npm run test:m8a-v4.6e` passed
- `npm run test:m8a-v4.6a` passed
- `npm run test:m8a-v4.6b` passed
- final hold observed at `4375-4518ms` across validation runs
- desktop screenshots generated at `1440x900` and `1280x720`
- narrow screenshot generated at `390x844`
- raw `itri` side-read scan passed
- runtime source-boundary scan passed
- forbidden-claim scan passed
- UI bounding-box non-obstruction checks passed
- narrow disclosure sheet truth-badge probe passed at `390x844`

Validated screenshots:

- `output/m8a-v4.7-desktop-1440x900-product-ux.png`
- `output/m8a-v4.7-desktop-1280x720-product-ux.png`
- `output/m8a-v4.7-narrow-390x844-product-ux.png`

Deviations:

- none

Runtime cleanup reported by the implementation thread:

- no dev server kept
- temporary static servers and headless Chrome stopped
- no Playwright, Chrome, or MCP process intentionally retained

## Blocked And Not Allowed

Still blocked or not allowed in `V4.7`:

- new endpoint selector
- new endpoint pair
- new data source
- raw `itri` runtime reads
- runtime promotion of `R2`
- model truth expansion
- actor set expansion
- active serving satellite claim
- active gateway assignment claim
- pair-specific teleport path claim
- measured latency, jitter, throughput, or continuity
- native RF handover claim
- bottom HUD as accepted primary layout
- top-left HUD as accepted primary layout
- visible V4.6E floating HUD as accepted default UX
- another floating panel as the default product solution
- `240x` as product default

## Runtime Opening Gate

The original runtime opening gate has been consumed for the completed V4.7
implementation. Future corrections, regressions, or follow-on implementation
must still pass this gate.

A future runtime prompt is unblocked only when all are true:

- this SDD is accepted as the V4.7 product UX authority
- the user explicitly opens runtime implementation
- the implementation scope is limited to playback policy, information
  architecture, layout, disclosure, and validation
- endpoint pair, precision, actor set, route, source boundary, and model truth
  remain unchanged
- the prompt includes validation for playback behavior, visual
  non-obstruction, forbidden claims, and raw-source side-read boundaries

No additional V4.7 runtime prompt is open after the completed implementation.
