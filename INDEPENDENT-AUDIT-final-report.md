# Independent Audit Final Report

Audit date: 2026-05-15

Project audited: `/home/u24/papers/scenario-globe-viewer`

Requirement authority: original ITRI materials under `/home/u24/papers/itri/`

## Executive Summary

This final report consolidates the two independent audit phases:

- Phase 1 extracted ITRI requirements from original ITRI materials only.
- Phase 2 independently checked each extracted requirement against allowed project evidence only: source code, tests, scripts, package metadata, retained `output/` artifacts, and actual command results.

Overall result: the project has substantial implemented viewer functionality, including 3D visualization, multi-orbit rendering, replay controls, report export, bounded physical-input projections, and several retained smoke/validation artifacts. Post-audit fixes (2026-05-15/16) resolved phase6.4, v4.3 source-boundary scanner, conv3 layout gate, and the 24-hour soak (F-17 verified-complete). It does not yet meet full ITRI acceptance as a complete package because several customer-critical areas remain partial, missing, or locally unverifiable: real ESTNeT/INET/NAT/NE-ONE traffic evidence, ITRI-owned orbit-model retained integration evidence, and virtual/physical DUT proof.

## Evidence Rules Applied

I followed these evidence boundaries:

- ITRI requirement source truth was limited to original files and converted outputs under `/home/u24/papers/itri/`.
- I did not use `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/`.
- I did not read or rely on project closeout, handoff, plan, delivery, or completion-status documents.
- Completion was judged only from implementation, tests actually run, and retained non-empty artifacts under `output/`.
- Project self-claims were not accepted as proof.
- The audit was performed read-only with respect to project implementation; no code changes, commits, or pushes were made.

## Phase 1 Result

Phase 1 output file:

- `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-requirements.md`

Extracted requirement count: 62

Requirement families:

| Family | Count | Meaning |
| --- | ---: | --- |
| F | 18 | Procurement/WP1 functional and delivery requirements |
| V | 8 | Viewer/demo/physical-layer requirements |
| S | 6 | System, ESTNeT/INET, DUT, and traffic-generator requirements |
| D | 2 | Claim-uncertain visual requirements inferred from ITRI images |
| M | 28 | Multi-orbit scenario, data-contract, and truth-boundary requirements |

Phase 1 included original-source citations and short source quotations for each requirement. Uncertain image-derived requirements were retained and marked `[CLAIM-UNCERTAIN]` rather than discarded.

## Phase 2 Result

Phase 2 output file:

- `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-results.md`

Per-requirement disposition count:

| 判定 | Count | Meaning |
| --- | ---: | --- |
| verified-complete | 32 | Code, test, retained artifact, and passing executed command evidence all exist |
| code-only | 9 | Implementation exists, but test and/or retained artifact evidence is incomplete |
| partial | 15 | Some required subparts are implemented, but one or more acceptance conditions are missing |
| missing | 2 | No corresponding local implementation/artifact was found |
| cannot-verify | 4 | Requires external data, hardware, environment, or owner-provided evidence |

Note: original audit (2026-05-15) showed verified-complete=28, partial=18, cannot-verify=5. Post-audit fixes raised to 32/15/4 (F-07 and F-17 promoted; M-21, M-25 promoted by commit 41f5664).

The 62 Phase 1 requirements were all evaluated in Phase 2; no requirement was dropped.

## Key Commands Run

Representative executed commands and outcomes:

| Command | Exit | Audit meaning |
| --- | ---: | --- |
| `npm run build` | 0 | Project builds successfully |
| `npm test` | 0 | Baseline verification passed |
| `npm run test:itri-f01r1` | 0 | Orbit-model intake reviewer passed, but retained ITRI orbit-model artifact was not found |
| `npm run test:phase6.2` | 0 | Replay mode and speed controls passed |
| `npm run test:phase6.3` | 0 | Communication-time proxy passed |
| `npm run test:phase6.4` | 0 | Fixed 2026-05-15 (commit 7d7a924): itu-r-physics temp modules added to verify script; was exit 1 |
| `npm run test:phase6.5` | 0 | Physical-input projection passed |
| `npm run test:phase6.6` | 0 | Validation-state UI/proxy passed |
| `npm run test:phase7.1` | 0 | First-intake active-case narrative passed, but without retained output artifact |
| `node scripts/run-phase7.1-viewer-validation.mjs --profile=multi-orbit-scale-1000 --skip-build` | 0 | Retained multi-orbit validation artifact produced; observed 600 LEO |
| `timeout 300 npm run test:phase7.0:full` | 124 | 24h soak did not complete within audit stop rule (timeout); full 24h run completed 2026-05-16 on server: `passed: true`, `failureCount: 0`, `durationMs: 86400000`, retained `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json` |
| `npm run test:m8a-v4.3` | 0 | Fixed 2026-05-15 (commit 41f5664): negative lookahead added for `./m8a-v4-*` intra-V4 siblings; was exit 1 |
| `npm run test:m8a-v4.11:slice6` | 0 | Reviewer transcripts verified |
| `npm run test:m8a-v4.11:conv4` | 0 | Sources demotion smoke passed |
| `npm run test:m8a-v4.11:conv3` | 0 | Fixed 2026-05-15 (commits 7d7a924 + 41f5664): 13px→12px chip fix + V4 redesign desktop layout branch; was exit 1 |
| `npm run test:m8a-v4.12:f09` | 0 | Communication-rate smoke passed with retained screenshot/manifest |
| `node scripts/verify-m8a-v4.12-f10-handover-policy-selector.mjs` | 0 | Handover policy selector verifier passed |
| `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs` | 0 | Handover policy runtime smoke passed with retained artifacts |
| `npm run test:m8a-v4.12:f11` | 0 | Rule config contract/runtime smoke passed |
| `npm run test:m8a-v4.12:f16` | 0 | Report export smoke passed with retained CSV/JSON exports |
| `npm run test:itri-v02r1`, `npm run test:itri-f07r1`, `npm run test:itri-s4r1`, `npm run test:itri-f12r1` | 0 | Package-shape/reviewer tests passed, but retained packages state reference-fixture or schema-ready limits |

## Most Serious Gaps

1. ~~24-hour stability is not verified.~~ **RESOLVED 2026-05-16.** Full 24h soak completed on server: `passed: true`, `failureCount: 0`, `durationMs: 86400000`, `sampleCount: 1289`, memory peak 18.8 MB. Retained artifact: `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json`. F-17 promoted to verified-complete.

2. Real traffic and external network/hardware validation are not complete.

Requirements `S-02`, `S-03`, `S-04`, `S-06`, and part of `F-11` depend on ESTNeT/INET/NAT, real ping/iperf-like traffic, DUT behavior, and NE-ONE hardware. The retained packages are useful as schema/reference evidence, but they explicitly do not close real measured ESTNeT/INET/NAT/NE-ONE acceptance. `S-05` is missing a runnable virtual DUT testbench.

3. ITRI-owned orbit-model integration evidence is incomplete.

Requirements `F-01`, `F-02`, and `F-14` have working TLE/orbit ingestion and multi-orbit viewer evidence, but no retained `output/validation/external-f01-orbit-model/` package was found. That prevents acceptance as a verified ITRI-owned orbit-model import/integration closure.

4. ~~Handover/source-boundary gates are not fully clean.~~ **RESOLVED 2026-05-15.** `npm run test:phase6.4` now exit 0 (commit 7d7a924: itu-r-physics temp modules wired). `npm run test:m8a-v4.3` now exit 0 (commit 41f5664: negative lookahead for `./m8a-v4-*` intra-V4 siblings). F-07, M-21, M-25 promoted to verified-complete. V-02 and M-01 remain partial (modeled not RF/network truth — not gate failures).

5. First-intake and corridor artifacts are not fully retained.

Several first-intake requirements are implemented in code and have passing runtime smoke output, but no retained output artifact was written for that smoke. `M-17` is missing a project-retained formal aircraft corridor package under allowed project `output/`, so the corridor package shape could not be accepted locally.

## Acceptance Position

From an independent ITRI acceptance perspective, the project should not be marked fully accepted yet.

Recommended classification: conditionally useful engineering prototype, not full acceptance closure.

The strongest completed areas are:

- Interactive 3D viewer and UI controls.
- Multi-orbit visualization at or above the 500 LEO target.
- Replay speed and real-time/prerecorded scenario modes.
- Communication-rate visualization.
- Report export.
- Bounded physical-input, rain, antenna, and ITU-style projection.
- Non-claim/truth-boundary labeling for modeled metrics.

The blocking acceptance areas are:

- ~~Full 24-hour stability proof.~~ **RESOLVED** — soak passed 2026-05-16.
- ~~Clean handover and raw-side-read/source-boundary gates.~~ **RESOLVED** — phase6.4 and v4.3 fixed 2026-05-15.
- Real ESTNeT/INET/NAT/ping/iperf/NE-ONE evidence.
- Runnable virtual DUT testbench evidence.
- Retained ITRI-owned orbit-model import/integration package.
- Retained first-intake/corridor package artifacts.

## Detailed Disposition Index

The detailed per-requirement evidence table is in:

- `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-results.md`

Critical non-complete requirements to review first:

| ID | 判定 | Primary gap |
| --- | --- | --- |
| F-01 | partial | No retained external F-01 ITRI orbit-model artifact |
| F-02 | partial | LEO/MEO/GEO supported, but missing retained ITRI-owned orbit model |
| F-07 | verified-complete | Fixed 2026-05-15 (commit 7d7a924): phase6.4 now exit 0 |
| F-11 | partial | Communication-time UI/proxy exists, but retained evidence says not measured ping/iperf |
| F-14 | partial | Orbit import exists, but no retained ITRI orbit-model import package/date proof |
| F-17 | verified-complete | Resolved 2026-05-16: soak passed, `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json` retained |
| F-18 | partial | Report export exists, but no WP1 technical evaluation analysis report verified |
| V-02 | partial | LEO/MEO/GEO switching modeled; V4.3 gate fixed (commit 41f5664); remaining: not RF/signal truth |
| V-05 | partial | Repo-owned proxy exists, but no external V-group simulator integration verified |
| S-01 | partial | Linux passes, WSL not proven with retained execution transcript |
| S-02 | cannot-verify | ESTNeT real-traffic bridge requires external testbed evidence |
| S-03 | cannot-verify | INET NAT/veth bridge not proven by retained real network evidence |
| S-04 | cannot-verify | ESTNeT-through-INET external connectivity not locally verified |
| S-05 | missing | Runnable virtual DUT testbench not found |
| S-06 | cannot-verify | NE-ONE hardware run not available |
| D-01 | partial | No direct retained visual comparison to `sat.png` |
| D-02 | partial | No retained beam/SNIR/HO-count equivalence to `demo.png` |
| M-01 | partial | Real-world service handover is modeled, but measured/network truth closure missing |
| M-03 | partial | Semantics exist, but first-intake retained artifact missing and V4.3 failed |
| M-07 | partial | Invariants exist, but first-intake retained artifact missing |
| M-13 | partial | Coordinate-free/provider-managed logic exists, but first-intake artifact missing |
| M-17 | missing | Formal aircraft corridor package not retained under project `output/` |
| M-21 | verified-complete | Fixed 2026-05-15 (commit 41f5664): scanner whitelist updated |
| M-25 | verified-complete | Fixed 2026-05-15 (commit 41f5664): v4.3 gate now exit 0 |
| M-27 | partial | Conv3 style gate fixed; remaining: captured metadata still contains long prose panels |

## Final Output Files

- Requirements inventory: `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-requirements.md`
- Phase 2 result matrix: `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-results.md`
- This final report: `/home/u24/papers/scenario-globe-viewer/INDEPENDENT-AUDIT-final-report.md`
