# customer Demo Route Requirement Closure SDD

Date: 2026-05-11

Canonical route:

`/?scenePreset=regional&m8aV4GroundStationScene=1`

## Status

- Canonical planning SDD for customer requirement closure on the V4
  ground-station demo route.
- Docs-only. This file does not authorize implementation by itself.
- Scope controller: preserve the V4 truth boundary and separate demo polish,
  bounded route representation, bounded repo-owned seams, and external
  validation truth.

## Authority Read

Primary authority and route context:

- `/home/u24/papers/AGENTS.md`
- `/home/u24/papers/itri/README.md`
- `scenario-globe-viewer/docs/decisions/0013-ground-station-multi-orbit-scope-reset.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`
- `scenario-globe-viewer/docs/data-contracts/m8a-v4-ground-station-projection.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.12-f09-communication-rate-visualization-plan.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.12-f16-statistics-report-export-plan.md`

Requirement ID inventory source used for traceability:

- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`

Authority availability note:

- Root `AGENTS.md` still points to `itri/v4-quickstart.md`, `itri/v4.md`,
  and `itri/v3.md`, but those files are absent in this checkout. This SDD
  therefore uses `itri/README.md`, the acceptance-report inventory, and the
  route-specific V4/V4.11/V4.12 SDDs above.

## Route Reality

The route is a ground-station multi-orbit handover review demo, not live
network truth.

Accepted baseline:

- Endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`.
- Precision:
  `operator-family-only`.
- Actor set:
  `13` source-lineaged display-context actors: `6` LEO, `5` MEO, `2` GEO.
- Runtime route:
  `/?scenePreset=regional&m8aV4GroundStationScene=1`.
- Service model:
  `m8a-v4.6d-simulation-handover-model.v1`.
- Recently added link-flow cue:
  `m8a-v4-link-flow-direction-cue-runtime.v1`.
- Link-flow mode:
  `uplink-downlink-arrow-segments-with-moving-packet-trails`.
- Link-flow truth boundary:
  `modeled-direction-cue-not-packet-capture-or-measured-throughput`.

Forbidden route claims:

- no active satellite truth;
- no active gateway truth;
- no pair-specific teleport path truth;
- no measured latency, jitter, throughput, or continuity truth;
- no native RF handover;
- no R2 runtime selector;
- no full `>=500 LEO` scale validation;
- no live `ping`, `iperf`, ESTNeT, INET, NAT, tunnel, bridge, DUT, or traffic
  generator closure unless a later validation authority explicitly wires those
  sources.

## Closure Labels

Use these labels in implementation prompts, UI copy, telemetry, tests, and
handoff notes:

| Label | Meaning |
| --- | --- |
| `true-route-closure` | The route itself can honestly close the requirement without external systems. |
| `bounded-route-representation` | The route visibly represents the requirement with modeled or projected data, but does not close full external truth. |
| `bounded-repo-owned-seam` | The repo has a bounded seam elsewhere, but this route does not fully own or mount it. |
| `external-validation-required` | Closure depends on external validation or measurement surfaces outside this scene. |
| `demo-polish-no-requirement-closure` | Visual or comprehension improvement only; do not claim customer closure. |
| `not-in-this-route` | Keep the requirement visible in traceability, but do not implement it on this route without a new decision. |
| `forbidden-truth` | Any implementation wording or telemetry that claims this truth is a defect. |

## Requirement Matrix

| ID | customer requirement | Current route status | Closure disposition | Route action |
| --- | --- | --- | --- | --- |
| F-01 | 整合 customer 自有衛星軌道模型 | Route uses viewer-owned projected artifacts and source-lineaged actors, not an customer orbit-model integration. | `external-validation-required` | Do not claim closure. Keep source lineage visible. |
| F-02 | 面向 `LEO/MEO/GEO` 多軌道 | Route shows LEO/MEO/GEO display-context actors and operator-family evidence. | `bounded-route-representation` | Preserve 13-actor orbit-class evidence and compact truth labels. |
| F-03 | 輸入 `TLE` 並追蹤衛星運動 | Route uses source-lineaged display actors; it is not a general TLE input workflow. | `bounded-route-representation` | Keep evidence/archive source summary, but do not claim full TLE input closure. |
| F-04 | 建立互動式 3D 圖像化模擬系統 | Cesium route is interactive and visual. | `true-route-closure` for visual route baseline | Regression guard only. |
| F-05 | 有 UI 操作介面 | Route has rail, inspector, footer, truth surfaces, and replay controls. | `true-route-closure` for this route | Regression guard only. |
| F-06 | 有可動態調整參數的 UI | Route has bounded replay and review controls, not a full rule-parameter editor. | `bounded-route-representation` | Do not let this substitute for F-11. |
| F-07 | 顯示可通訊時間 | Existing repo seam is mostly elsewhere; this route has modeled windows/countdown, not measured communication time. | `bounded-repo-owned-seam` | Show only route-local modeled timing; link to gap/status if needed. |
| F-08 | 產生通訊時間統計 | Export-ready bounded report state exists elsewhere; route does not expose a completed communication-time statistics workflow. | `bounded-repo-owned-seam` | Keep as repo seam; the F-16 bounded route export does not close communication-time statistics. |
| F-09 | 顯示通訊速率 | Route exposes a bounded modeled network-speed class/proxy surface. It is not measured throughput. | `bounded-route-representation`; external throughput truth remains `external-validation-required` | Preserve modeled class/proxy copy. Do not export or display measured Mbps/Gbps truth. |
| F-10 | 換手策略可切換 | Phase 5 approves a route-local modeled replay policy preset selector. It is not live policy control. | `bounded-route-representation`; live policy truth remains forbidden/external | Preserve preset-only copy, telemetry, and reversibility. Do not imply operator policy control. |
| F-11 | 換手規則與相關參數可設定/模擬 | Phase 5 approves a route-local bounded replay rule/parameter preset surface. It is not an arbitrary rule editor. | `bounded-route-representation`; live rule-engine truth remains forbidden/external | Preserve preset-only copy, telemetry, and source-truth immutability. Do not alter projection fixtures or timelines. |
| F-12 | 根據 `latency/jitter/network speed` 決策切換 | Route represents modeled metric classes and handover pressure, not measured decision truth. | `bounded-route-representation` | Keep labels as modeled classes. |
| F-13 | 支援至少 `500 LEO` | Route is explicitly a 13-actor demo; current `>=500 LEO` evidence is accepted only through the separate fresh Phase 7.1 artifact `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`. | `external-validation-required` for this route; accepted via separate Phase 7.1 evidence boundary | Do not expand actor count or describe this route as scale validation. Keep the Phase 7.1 citation current. |
| F-14 | 模擬速度可調 | Replay speed controls are already part of the viewer experience. | `true-route-closure` for route control | Regression guard only. |
| F-15 | 可在 `real time` 與預錄 `TLE` 情境間切換 | Route is a bounded replay/demo route, not full multi-source scenario switching. | `bounded-route-representation` | Preserve replay disclosure. |
| F-16 | 統計報表可匯出 | Route exposes a bounded JSON export action for route-owned demo state. It is not an external measurement/report-system export. | `bounded-route-representation`; external report-system truth remains `external-validation-required` | Preserve schema/version/provenance/non-claims and forbid external measurement/report truth claims. |
| F-17 | 可展示雨衰情境所帶來之影響 | Repo seam exists mostly elsewhere; V4 route can show only gap/status or modeled context unless explicitly wired. | `bounded-repo-owned-seam` | Do not claim full physical truth. |
| F-18 | 畫面可穩定運行至少 `24 小時` | Phase 7.0 soak harness is landed; retained full-run artifact has not yet been produced — gate remains open pending a completed 24h run. | `soak-harness-ready; artifact-pending` | Do not claim route stability closed until the full-run artifact is retained. |
| V-01 | Linux 為主要環境 | Current development and validation are Linux/WSL-backed. | `true-route-closure` for dev baseline | Build and smoke on Linux. |
| V-02 | Windows + WSL 為支援情境 | Validation seam names WSL, but real tunnel setup is external. | `external-validation-required` | Plan evidence through `itri-v02-v06-external-validation-evidence-package-plan.md`; status/gap only in this route. |
| V-03 | tunneling / bridging 驗測情境 | Not mounted as route-owned network validation. | `external-validation-required` | Plan evidence through `itri-v02-v06-external-validation-evidence-package-plan.md`; status/gap only in this route. |
| V-04 | NAT routing 與模擬網路對接真實網路 | Not mounted as route-owned NAT validation. | `external-validation-required` | Plan evidence through `itri-v02-v06-external-validation-evidence-package-plan.md`; status/gap only in this route. |
| V-05 | 虛擬待測物情境 | Bounded validation state exists elsewhere; not route-owned DUT runtime. | `external-validation-required` | Plan evidence through `itri-v02-v06-external-validation-evidence-package-plan.md`; status/gap only in this route. |
| V-06 | 實體待測物 / traffic generator 情境 | Not route-owned. | `external-validation-required` | Plan evidence through `itri-v02-v06-external-validation-evidence-package-plan.md`; status/gap only in this route. |
| P-01 | 天線參數 | Bounded physical-input seam exists elsewhere. | `bounded-repo-owned-seam` | Status/gap only unless explicitly wired. |
| P-02 | 雨衰 / 雨天衰減 | Bounded physical-input seam exists elsewhere. | `bounded-repo-owned-seam` | Status/gap only unless explicitly wired. |
| P-03 | `ITU` 相關因素 | Bounded physical-input seam exists elsewhere. | `bounded-repo-owned-seam` | Status/gap only unless explicitly wired. |
| D-01 | 有圖像化 / 展示價值，不是純後台 | Route is a visual 3D handover review scene. | `true-route-closure` | Preserve visual quality and legibility. |
| D-02 | 支援 real-time 或 prerecorded scenario demo | Route supports bounded replay/demo behavior. | `bounded-route-representation` | Preserve replay boundary. |
| D-03 | 畫面能表達通訊、切換、衛星、鏈路狀態 | Link-flow cue improved ground-station/satellite relation expression. | `bounded-route-representation` | Guard link-flow cue telemetry and screenshots. |

## Phase Plan

### Phase 1 - Route Baseline Truth And Chinese Legibility Polish

Goal:

- Lock the current route truth baseline and fix demo-polish text rendering
  issues before requirement-bearing changes.

Why first:

- Requirement close-out screenshots are only useful if the route is legible.
- Chinese tofu/square text is demo polish, not true customer requirement closure,
  but it directly affects acceptance evidence quality.
- This phase gives later F-09/F-16/F-10/F-11 work a stable route regression
  harness.

Scope:

- Fix missing glyph/tofu rendering on the V4 route only.
- Add or update a focused route baseline smoke/capture that records actor
  counts, endpoint pair, precision, link-flow cue telemetry, and forbidden
  claim absence.
- Preserve the existing link-flow cue behavior:
  `uplink-downlink-arrow-segments-with-moving-packet-trails`.

Non-goals:

- no F-09 rate visualization;
- no F-16 export workflow;
- no F-10 policy selector;
- no F-11 rule editor;
- no F-13 scale work;
- no measured network truth;
- no endpoint-pair or actor-set change.

Truth-boundary labels:

- `demo-polish-no-requirement-closure`
- `bounded-route-representation`
- `modeled-direction-cue-not-packet-capture-or-measured-throughput`

Acceptance criteria:

- Route screenshot at `1440x900` shows no obvious Chinese tofu/square fallback
  in the V4 scene chrome, rail, inspector, footer, status chips, and link-flow
  visible labels.
- A route baseline smoke asserts:
  - route is `scenePreset=regional`;
  - actor counts remain `6` LEO, `5` MEO, `2` GEO, `13` total;
  - endpoint pair remains
    `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`;
  - precision remains `operator-family-only`;
  - link-flow cue version is
    `m8a-v4-link-flow-direction-cue-runtime.v1`;
  - link-flow mode is
    `uplink-downlink-arrow-segments-with-moving-packet-trails`;
  - link-flow truth boundary is
    `modeled-direction-cue-not-packet-capture-or-measured-throughput`;
  - forbidden claims are absent from visible route text and telemetry.
- Existing link-flow smoke still passes.

Validation commands:

```bash
npm run build
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
node tests/smoke/verify-itri-demo-route-baseline-legibility-runtime.mjs
```

Browser evidence:

- Capture at least one `1440x900` screenshot for the route.
- Capture a focused inspection JSON artifact with the fields listed in the
  acceptance criteria.

### Phase 2 - Requirement Gap Surface And Route Traceability

Goal:

- Make the route's customer status honest and inspectable without implying closure
  of external or not-mounted requirements.

Scope:

- Add a compact route-local requirement/gap status surface only if it does not
  violate the V4.11 content architecture.
- Distinguish:
  - route-owned visual baseline;
  - bounded route representation;
  - repo-owned seams elsewhere;
  - external validation gaps.
- Keep gap copy terse and machine-checkable.

Non-goals:

- no new network measurement;
- no new rate chart;
- no export workflow;
- no rule editor;
- no scale simulation;
- no long prose panel.

Truth-boundary labels:

- `bounded-route-representation`
- `bounded-repo-owned-seam`
- `external-validation-required`

Acceptance criteria:

- The route exposes a compact status that separates demo polish from true
  closure.
- F-09, F-10, F-11, F-13, F-16, V-02 through V-06 are visibly or
  telemetry-wise open unless separately completed by later phases.
- F-07/F-08/F-12/F-17/P-01/P-02/P-03 are not over-claimed as route-native
  measured truth.
- No forbidden claim appears in visible copy, telemetry, or screenshot
  artifacts.

Validation commands:

```bash
npm run build
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
node tests/smoke/verify-itri-demo-route-requirement-gap-surface-runtime.mjs
```

### Phase 3 - F-09 Route-Compatible Communication Rate Decision

Goal:

- Decide whether the V4 route should show a route-local bounded
  communication-rate class or only link out/status F-09 as not mounted here.

Execution decision, 2026-05-11:

- Planning control approved a route-local bounded F-09 representation for this
  demo route.
- The approved representation is a modeled network-speed class/proxy surface
  only. It does not close external throughput measurement truth.
- F-09 therefore moves from `not-in-this-route` to
  `bounded-route-representation` for the route UI, while external `iperf` /
  `ping` / measured throughput validation remains
  `external-validation-required`.

Scope:

- Reconcile this SDD with
  `m8a-v4.12-f09-communication-rate-visualization-plan.md`, which currently
  targets the Phase 6 Operator HUD route rather than this V4 scene.
- If planning control approves route-local representation, implement only a
  modeled network-speed class surface, not measured throughput.
- If not approved, keep F-09 as `not-in-this-route` and expose only gap/status.

Non-goals:

- no live `iperf` or `ping`;
- no Mbps value presented as measured truth;
- no external throughput validation;
- no policy/rule editing;
- no report export;
- no V4 scene rewrite beyond the approved status/rate surface.

Truth-boundary labels:

- `bounded-route-representation`
- `modeled-bounded-class-not-measured`
- `forbidden-truth` for measured throughput claims.

Acceptance criteria:

- F-09 route disposition is explicit: either route-local bounded class is
  accepted, or the route keeps a clear not-mounted gap.
- If implemented, the surface uses class/bucket labels with visible provenance
  such as modeled/bounded/proxy and a tabular or text fallback.
- No route artifact claims measured throughput or live network-speed truth.
- V4.12 F-09 plan is either left intact with a route note or explicitly
  superseded by a small documented delta.

Validation commands:

```bash
npm run build
node tests/smoke/verify-itri-demo-route-f09-rate-disposition-runtime.mjs
```

### Phase 4 - F-16 Route-Compatible Export Decision

Goal:

- Decide whether the V4 route should expose a bounded export workflow or keep
  F-16 as owned by existing operator/report seams elsewhere.

Scope:

- Reconcile this SDD with
  `m8a-v4.12-f16-statistics-report-export-plan.md`.
- If approved for this route, export only route-owned bounded state:
  route id, endpoint pair, actor counts, modeled service window, link-flow cue
  metadata, and explicit non-claims.
- If not approved, keep F-16 as a not-mounted gap/status on this route.

Execution decision, 2026-05-11:

- Planning control accepted a route-local bounded JSON export for this demo
  route.
- The export is limited to route-owned bounded state: schema/version,
  timestamp, route/scenario identity, endpoint pair, precision, actor counts,
  active modeled window, requirement groups, F-09 bounded class disposition,
  link-flow cue metadata, provenance, and explicit non-claims.
- F-16 therefore moves from `not-in-this-route` to
  `bounded-route-representation` for this route, while external
  measurement/report-system truth remains `external-validation-required`.

Non-goals:

- no PDF/email/backend export;
- no external measurement export;
- no communication-rate feature bundled into export;
- no full acceptance-completion claim.

Truth-boundary labels:

- `bounded-route-representation`
- `bounded-proxy-report-export`
- `external-validation-required`

Acceptance criteria:

- F-16 route disposition is explicit: route-local bounded export or not mounted.
- Any exported artifact includes schema version, timestamp, route id, scenario
  id, endpoint pair, precision, actor counts, provenance, and non-claims.
- JSON is sufficient for route-local closure; CSV is optional unless the
  implementation phase explicitly adopts it.
- Export tests verify fields and forbidden claim absence.

Validation commands:

```bash
npm run build
node tests/smoke/verify-itri-demo-route-f16-export-disposition-runtime.mjs
node tests/smoke/verify-itri-demo-route-f09-rate-disposition-runtime.mjs
node tests/smoke/verify-itri-demo-route-requirement-gap-surface-runtime.mjs
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
```

### Phase 5 - F-10/F-11 Modeled Policy And Rule Controls Decision

Goal:

- Decide whether the V4 route should expose a safe modeled policy selector and
  bounded rule/dynamic-parameter preset surface, or keep them outside this
  route.

Execution decision, 2026-05-12:

- Planning control accepted Phase 5 as a bounded route-local slice.
- F-10 is approved only as a modeled replay policy preset selector.
- F-11 is approved only as a bounded replay rule/parameter preset surface, not
  a full arbitrary rule editor.
- The surface version is
  `itri-demo-route-policy-rule-controls-runtime.v1`.
- F-10 and F-11 move from `not-in-this-route` to
  `bounded-route-representation` for this route, while live policy push,
  backend control, active gateway/satellite control, native RF handover,
  measured decision truth, and external validation remain non-goals or
  forbidden truth.

Scope:

- Add only review-demo controls that switch deterministic modeled replay
  policy presets and bounded rule/parameter presets.
- Use these F-10 policy presets:
  `balanced-continuity-review` as default,
  `candidate-first-review`, and `continuity-guard-review`.
- Use these F-11 rule presets:
  `standard-window-thresholds` as default,
  `early-candidate-review`, and `guard-hold-review`.
- Controls may update only route-local modeled state, telemetry, and visible
  preview copy.
- All controls must be visibly modeled and must not imply live network control,
  native RF handover, active gateway selection, or operator policy truth.
- Do not mutate endpoint pair, precision, actor set, projection fixtures,
  simulation handover timeline, F-09 classes, F-16 export semantics, or
  link-flow cue semantics.

Non-goals:

- no live policy push;
- no full arbitrary rule editor;
- no real policy engine;
- no backend persistence or report-system side effect;
- no external gateway/satellite control;
- no measured decision truth;
- no arbitrary endpoint selector;
- no R2 runtime promotion.

Truth-boundary labels:

- `modeled-policy-demo-not-live-control`
- `bounded-route-representation`
- `forbidden-truth`

Acceptance criteria:

- If implemented, controls are keyboard accessible, reversible, and bounded to
  route-local modeled state.
- The route never implies that user choices affect real networks or external
  operators.
- F-10 and F-11 appear in bounded route IDs and no longer appear in
  not-mounted route IDs.
- The active policy/rule preset is reflected in state and document telemetry.
- Existing F-09 and F-16 bounded dispositions still pass unchanged.
- F-10 and F-11 closure is claimed only as bounded route representation; any
  external validation authority would be a separate later phase.

Validation commands:

```bash
npm run build
node scripts/verify-m8a-v4.3-raw-itri-side-read.mjs
node scripts/verify-m8a-v4.6b-runtime-source-boundary.mjs
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
node tests/smoke/verify-itri-demo-route-requirement-gap-surface-runtime.mjs
node tests/smoke/verify-itri-demo-route-f09-rate-disposition-runtime.mjs
node tests/smoke/verify-itri-demo-route-f16-export-disposition-runtime.mjs
node tests/smoke/verify-itri-demo-route-policy-rule-controls-runtime.mjs
```

### Phase 6 - F-13 Scale And External Validation Gate

Goal:

- Keep `>=500 LEO` and external validation truth out of the 13-actor route
  unless a separate approved scale/validation phase opens.

Gate decision, 2026-05-12:

- Do not expand this V4 route beyond its 13-actor demo scope.
- F-13 is not route-native closure. It may only be closed by a separate
  scale/evidence authority such as the repo-owned Phase 7.1 viewer validation
  evidence boundary.
- Existing Phase 7.1 artifacts and contracts show the intended separate
  evidence path:
  `docs/sdd/phase-6-plus-requirement-centered-plan.md`,
  `docs/data-contracts/phase7.1-validation-evidence.md`, and
  `scripts/run-phase7.1-viewer-validation.mjs`.
- The retained `2026-04-21` Phase 7.1 artifacts are useful historical evidence,
  but their `retentionDays: 14` window is expired as of `2026-05-12`. A fresh
  `--enforce-pass` run is required before citing them as current acceptance
  evidence.
- V-02 through V-06 remain external validation work. The route may name those
  gaps, but it must not claim live Windows/WSL tunnel, ESTNeT/INET bridge,
  NAT routing, virtual/physical DUT, NE-ONE, `ping`, or `iperf` truth.

Fresh evidence reconciliation, 2026-05-12:

- `node scripts/run-phase7.1-viewer-validation.mjs --profile first-slice --enforce-pass`
  passed and produced
  `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`.
- The artifact reports `evidenceBoundaryEstablished=true`,
  `requirementGatePassed=true`, `enforcePass=true`,
  `observedLeoCount=540`, `overlayPointCount=549`,
  `overlayOrbitClassCounts={leo:540,meo:6,geo:3}`, and `knownGaps=[]`.
- This accepts F-13 through the separate Phase 7.1 evidence boundary only. It
  does not change the V4 route's 13-actor scope, route-native actor counts, or
  route truth labels.
- Retention is 14 days from `2026-05-11T16:43:23.879Z`, expiring at
  `2026-05-25T16:43:23.879Z` UTC. After that time, rerun the Phase 7.1 command
  before citing current F-13 acceptance.
- V-02 through V-06 still require a separate external validation evidence
  package; see `itri-v02-v06-external-validation-evidence-package-plan.md`.

Scope:

- This is a gate, not an automatic implementation phase.
- Reconcile this route SDD with the existing Phase 7.1 viewer validation
  evidence boundary before creating any new scale route or synthetic load plan.
- Decide whether current F-13 evidence can be refreshed through the existing
  Phase 7.1 harness, or whether a new scale SDD/amendment is required.
- Decide whether V-02 through V-06 need a separate external validation evidence
  package; do not fold them into the V4 route.

Non-goals:

- no silent expansion of the V4 route actor set;
- no claiming the 13-actor route validates `>=500 LEO`;
- no live ESTNeT/INET/NAT/DUT claims without evidence;
- no treating expired retained artifacts as current acceptance evidence.

Truth-boundary labels:

- `external-validation-required`
- `not-in-this-route`
- `forbidden-truth`

Acceptance criteria:

- F-13 remains open on this route unless a separate scale artifact is accepted.
- Any F-13 close-out cites a current, retained Phase 7.1 evidence artifact or a
  newer approved scale SDD artifact; it does not cite this 13-actor route.
- V-02 through V-06 remain external unless an explicit external validation
  package exists.
- Any future scale work has its own SDD or SDD amendment before code.
- The route's F-09, F-10, F-11, F-16, and link-flow bounded truth boundaries remain
  unchanged.

Validation commands:

```bash
npm run build
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
node tests/smoke/verify-itri-demo-route-requirement-gap-surface-runtime.mjs
# For current F-13 evidence only, outside this route:
node scripts/run-phase7.1-viewer-validation.mjs --profile first-slice --enforce-pass
```

### Final Route Closure Handoff

Final closure checkpoint, 2026-05-12:

- The V4 demo route is ready for route-local closure handoff.
- Retained closure package:
  `output/validation/itri-demo-route-final-closure-2026-05-12.md`.
- Final QA passed `git diff --check`, `npm run build`, raw customer side-read scan,
  runtime source-boundary scan, baseline legibility smoke, link-flow smoke,
  requirement-gap smoke, F-09 smoke, F-16 smoke, and F-10/F-11 policy/rule
  controls smoke.
- Route-local closure remains limited to the 13-actor route. F-13 is accepted
  only through the separate fresh Phase 7.1 evidence artifact, not by this
  route.
- V-02 through V-06 remain external validation work and are tracked by
  `itri-v02-v06-external-validation-evidence-package-plan.md`.
- Stale or partial download artifacts, including F-16 `.crdownload` files, are
  not accepted evidence.

External validation checkpoint, 2026-05-12:

- Retained package:
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json`.
- Covered IDs: V-02, V-03, V-04, V-05, V-06.
- Result: all five IDs fail in the retained package. V-02 has partial
  Windows 11 + WSL2 environment evidence only; V-03 through V-06 lack retained
  tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, physical DUT, NE-ONE, `ping`, or
  `iperf` proof.
- Route boundary remains unchanged: this package does not modify or validate the
  V4 demo route UI/runtime.

## Cross-Phase Validation Rules

Every implementation phase that touches route UI must run:

```bash
npm run build
node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
```

Add the smallest targeted smoke for the touched feature. If visual behavior
matters, capture a browser screenshot or inspection artifact.

Forbidden-claim scan terms must include at least:

- `measured throughput`
- `measured latency`
- `measured jitter`
- `live iperf`
- `live ping`
- `active gateway`
- `active serving satellite`
- `pair-specific teleport`
- `native RF handover`
- `scale validated`
- `full multi-orbit validation`
- `500 LEO validated`

These terms may appear only inside explicit non-claim, forbidden-claim, or
truth-boundary contexts.

## Risks And Open Questions

1. The route and prior V4.12 F-09/F-16 plans disagree on ownership if planning
   control wants F-09/F-16 visible inside the V4 route. Phase 3 and Phase 4 now
   have explicit bounded route dispositions; future edits must preserve those
   truth boundaries.
2. The missing `itri/v4-quickstart.md`, `itri/v4.md`, and `itri/v3.md` files
   mean this SDD relies on the current `itri/README.md`, acceptance report, and
   V4-specific docs.
3. Chinese glyph/tofu artifacts are demo polish, not requirement closure, but
   they can invalidate screenshot evidence if left unresolved.
4. Route-local F-10/F-11 controls risk sounding like live operation. The
   approved selector/preset surface must use modeled replay preset copy and
   telemetry only.
5. F-13 and V-02 through V-06 are not route-sized work. They need external or
   separate-route evidence, not incremental V4 scene copy.
6. Link-flow cue visuals may look like packet capture to reviewers. Keep the
   `modeled-direction-cue-not-packet-capture-or-measured-throughput` boundary
   visible and testable.

## First Execution Phase

First execution phase:

**Phase 1 - Route Baseline Truth And Chinese Legibility Polish**

This phase is intentionally first because it improves demo evidence quality and
locks the route truth baseline without changing requirement ownership.

## First Execution-Agent Prompt

```text
Role: Execution agent for one approved SDD phase.

# Goal
Read the canonical SDD first and implement only the requested phase.

Canonical SDD:
scenario-globe-viewer/docs/sdd/itri-demo-route-requirement-closure-sdd.md

This run should implement only:
Phase 1 - Route Baseline Truth And Chinese Legibility Polish

# Constraints
- Do not rewrite the SDD.
- Do not broaden scope.
- Preserve V4 truth boundary.
- Preserve route `/?scenePreset=regional&m8aV4GroundStationScene=1`.
- Preserve endpoint pair `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`.
- Preserve precision `operator-family-only`.
- Preserve actor set `6` LEO, `5` MEO, `2` GEO, `13` total.
- Preserve link-flow cue version `m8a-v4-link-flow-direction-cue-runtime.v1`.
- Preserve link-flow cue mode `uplink-downlink-arrow-segments-with-moving-packet-trails`.
- Preserve link-flow truth boundary `modeled-direction-cue-not-packet-capture-or-measured-throughput`.
- Fix only V4 route legibility/tofu and baseline smoke/capture coverage.
- Do not implement F-09, F-10, F-11, F-13, or F-16.
- Do not add measured/live/network claims.
- Any measured/live/network claim must have an explicit validation source; otherwise label it modeled/bounded or do not add it.
- If implementation conflicts with the SDD, stop and report the deviation.

# Validation
Run the smallest relevant validation first, then required completion checks.
At minimum:
- npm run build
- node tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs
- node tests/smoke/verify-itri-demo-route-baseline-legibility-runtime.mjs
- browser screenshot or inspection artifact for `/?scenePreset=regional&m8aV4GroundStationScene=1`

# Output
Changed files; implemented behavior; validation results; screenshot/inspection artifacts; SDD deviations; remaining work.
```
