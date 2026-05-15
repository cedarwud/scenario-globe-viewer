# M8A V4.11 Implementation Phase 2 Inspector Restructure Handoff

## §1 Scope landed

Phase 2 applies spec v2 §4.1, §4.4, §4.4.x, §4.5, and §4.6 on top of the Phase 1 content/hookpoint working tree.

- Inspector tab order is now exactly `Decision` / `Metrics` / `Evidence`.
- The standalone `Boundary` tab was removed from the tablist and from the tabpanel set.
- Boundary ownership moved per spec v2 §4.4:
  - Scale + endpoint: inspector boundary header strip.
  - Simulation + service-layer: existing footer disclosure chips / ambient truth tail.
  - Validation readiness: inspector header badge.
- Evidence is now a two-line summary with an `Archive` disclosure containing the full TLE, ground-station evidence, R2 table, and per-actor/source detail.

## §2 DOM contracts

Verified by `node /tmp/m8a_v411_phase2_capture.mjs`:

- Exactly 3 inspector tabs: `Decision`, `Metrics`, `Evidence`.
- No `Boundary` tab exists.
- Boundary strip selector: `data-m8a-v411-inspector-boundary-strip="true"`.
- Boundary strip chips: `13-actor demo` and `operator-family precision`.
- Validation badge selector: `data-m8a-v411-inspector-validation-badge="true"`.
- Validation badge text: `Validation status: TBD`.
- Evidence summary lines:
  - `TLE: CelesTrak NORAD GP · 13 actors · fetched 2026-04-26`
  - `R2: 5 candidate endpoints (read-only catalog)`
- Evidence Archive default state:
  - W1 collapsed.
  - W2 collapsed.
  - W3 collapsed.
  - W4 collapsed.
  - W5 expanded.

The capture manifest is at:

- `output/m8a-v4.11-impl-phase2/capture-manifest.json`

## §3 Screenshots

Required Phase 2 captures:

- `output/m8a-v4.11-impl-phase2/w1-default-1440x900.png`
- `output/m8a-v4.11-impl-phase2/w3-decision-tab-1440x900.png`
- `output/m8a-v4.11-impl-phase2/w5-evidence-archive-expanded-1440x900.png`
- `output/m8a-v4.11-impl-phase2/inspector-header-detail-1440x900.png`

`inspector-header-detail-1440x900.png` is a close-up crop from the 1440x900 viewport around the inspector sheet header, validation badge, boundary strip, and tab bar.

## §4 Smoke Softening Disclosure

Spec v2 §4.1 / §4.4 supersedes the earlier four-tab inspector contract. Boundary is no longer a standalone tab; its ownership is distributed to the inspector header strip, footer disclosure chips, and validation badge.

Softening entries landed in 6 smokes. The required four are present, and Phase B/C compatibility smokes were updated as additional coverage:

- `tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-b-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-c-runtime.mjs`

Correction A Phase E records a manifest-level softening entry:

```text
Correction A Phase E: spec v2 §4.1 / §4.4 supersedes Boundary tab; footer disclosure keeps Decision selected and boundary ownership moves to strip/footer.
```

## §5 Validation log

Final smoke matrix result: all green.

```text
npm run build
npm run test:m8a-v4.11:slice1
npm run test:m8a-v4.11:slice2
npm run test:m8a-v4.11:slice3
npm run test:m8a-v4.11:slice4
npm run test:m8a-v4.11:slice5
npm run test:m8a-v4.11:slice6
npm run test:m8a-v4.11:conv1
npm run test:m8a-v4.11:conv2
npm run test:m8a-v4.11:conv3
npm run test:m8a-v4.11:conv4
npm run test:m8a-v4.11:correction-a-phase-b
npm run test:m8a-v4.11:correction-a-phase-c
npm run test:m8a-v4.11:correction-a-phase-d
npm run test:m8a-v4.11:correction-a-phase-e
npm run test:m8a-v4.10:slice1
npm run test:m8a-v4.10:slice2
npm run test:m8a-v4.10:slice3
npm run test:m8a-v4.10:slice4
npm run test:m8a-v4.10:slice5
npm run test:m8a-v4.9
npm run test:m8a-v4.8
npm run test:m8a-v4.7.1
node /tmp/m8a_v411_phase2_capture.mjs
```

Notes:

- Vite's existing bundle-size and `protobufjs` direct-eval warnings remained warnings only.
- The Phase 2 capture script needed local static-server/browser permissions and then passed.

## §6 Scope guards

Confirmed unchanged for Phase 2:

- No `--m8a-v411-state-*` token family was added.
- No orbit token migration was performed.
- No reviewer mode runtime or replay pause/state-machine behavior was changed.
- No narrow/tablet CSS redesign was performed; no `@media` hunk was added in `src/styles/m8a-v411-inspector-concurrency.css`.
- Route, endpoint pair, precision boundary, actor set, V4.6D model, R2 provenance, and Slice 6 transcripts were not changed.
- `leo-beam-sim` source was not modified.
- No measured numeric latency, jitter, throughput, packet-loss, or RF metrics were added.

## §7 Visual quality estimate

Self-honest estimate after Phase 2: 7.2/10.

The sheet reads better than Phase 1 because the Boundary content no longer competes as a full tab, the header strip makes the scale/endpoint constraints persistent, and Evidence has a lighter default surface. The remaining visual debt is that the inspector still inherits a dense legacy sheet layout; Phase 4 narrow/tablet work and any later polish should handle the broader layout ergonomics rather than expanding Phase 2 scope.
