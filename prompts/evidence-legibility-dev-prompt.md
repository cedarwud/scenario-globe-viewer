# Worker prompt — Evidence Legibility build (paste into a fresh Claude Code / Codex session)

> Routing: implementation + docs + tests, **non-heavy → run locally** (no Ubuntu server needed).
> Open this in the `scenario-globe-viewer` repo. Caveman mode optional.

---

ultracode (optional)

Goal: make the viewer's real authenticity work LEGIBLE — prove live compute to a viewer and prove
auditability/reproducibility to a procurement acceptance reviewer — WITHOUT any over-claim.

## Read first (in order)
1. `.agent-memory/MEMORY.md`, then `.agent-memory/project_full_health_check_2026_06_14`
   (the audit this work is built on), `project_data_source_audit_2026_06_13`,
   `project_route_overlay_governance_2026_05_30`, `project_multi_station_selector_scope`.
2. `docs/sdd/evidence-legibility/evidence-legibility.md` — THIS is the spec. Follow its workstreams.
3. `docs/sdd/multi-station-selector/selected-pair-overlay-governance.md` — overlay/HUD governance
   (you will touch side-panel code; respect it).
4. `CLAUDE.md` §4/§5 (project rules R1–R10), especially R6 (concurrent-session collision: never
   `git add -A`/`-am`; specific `git add <path>` only).

## Honesty iron rule (the whole point — do not violate)
- Modeled / standard-derived / publicly-derived values are NEVER labelled measured / operator-validated
  / field-tested / active-serving. Transparency is the deliverable.
- The external gaps stay "disclosed, pending": packet-test latency/jitter/throughput/loss; native RF
  handover / active-serving route; real station RF hardware (EIRP/dish/polarization/beam);
  measured-for-link weather + long-term R0.01; surveyed RF horizon / full DEM; external acceptance thresholds.
- The over-claim CI gate (`scripts/helpers/over-claim-scan.mjs` + `over-claim-allowlist.json`, run by
  `verify-phase0.mjs`) will block new hard provenance terms in rendered strings. Keep `npm test` green.

## Protected zones — PROPOSE-FIRST, get sign-off before applying
- Any edit to `src/` app code (side panel, report generator, inspector, runtime) — especially
  `v4-projection-side-panel*.ts`, `runtime-projection-evidence-report.ts`,
  `m8a-v411-inspector-concurrency.ts`, `runtime-projection.ts` — must be shown as a diff and approved
  before applying. State exactly which lines and why.
- Free to edit without sign-off (but adversarially self-review): the python pptx builders in
  `scripts/build_*.py`, docs, and tests under `tests/`.

## Scope intent (user 2026-06-14): FIX EVERYTHING honestly fixable, completely, no simplification.
Three fix-modes (see SDD §5 banner): fill fully (coverage/over-claim/doc-drift); improve-where-
gap-free + relabel-where-gap-bound (WS-F hybrid); disclose-only for external gaps (filling =
fabrication — do NOT invent packet-test/RF-hardware/measured-weather/acceptance numbers).

## Task order (each lands as its own verified slice)
1. **WS-E coverage hardening FIRST** (SDD §5 WS-E, pure tests, no app-src, no sign-off): numeric unit
   tests for `src/runtime/link-budget/*` + `runtime-projection` physics using the in-file sanity
   values + the health-check reproductions as golden; wire the 3 orphan ITU verifier scripts
   (`verify-itu-r-p618/p838/f699-*.mjs`) into `package.json`. **Include E3: SGP4 reference-vector test
   (satellite.js vs independent python-sgp4 expected ECI)** — its expected vectors are reused by WS-G.
   Do this first so WS-F lands on a numeric safety net and WS-G has its proof artifact.
2. **WS-G provenance trace inspector** (SDD §5 WS-G) — THE actual authenticity proof — diff + sign-off:
   "how this trajectory was computed" popup showing the full raw-TLE→ECI→ECEF→geodetic→trajectory chain
   with every intermediate, plus the escape-the-app hooks (copyable raw TLE → CelesTrak/python-sgp4;
   reference-vector side-by-side from E3; links to open source + ITU PDF sha256). Honest limit (G3):
   proves the geometry chain only; link-budget magnitudes stay modeled, gaps stay disclosed.
3. **WS-F model fidelity (HYBRID)** (SDD §5 WS-F) — diff + sign-off: F1 SGP4 altitude into slant
   range, F2 instantaneous per-sample elevation, F3 per-station rain latitude, F4 relabel
   throughput/RSRP as illustrative proxy (do NOT hard-compute — would need EIRP/noise gap inputs).
   Then REGENERATE the retained evidence package + re-baseline verify:tle golden anchors + wave1
   baselines + re-run all gates + re-sync every sha256/metadata (project_tle_refresh memory has the
   procedure). Confirm the unit tests from step 1 still pass (update goldens only with justification).
4. **WS-B over-claim string fixes** (5 strings, SDD §5 WS-B) — diff + sign-off. Verify over-claim gate
   + affected smokes pass.
5. **WS-C report HTML** (SDD §5 WS-C): grading matrix, model-boundary disclosure (post-WS-F state),
   standards conformance table (+ retained PDF sha256 + sample I/O), sensitivity mini-table,
   reproducibility imprint, verification status strip + the WS-G provenance trace / reference vectors.
   Diff + sign-off. Regenerate report + re-sync hashes.
6. **WS-A live reactivity** (SDD §5 WS-A): recompute cue in the side panel + a reaction step in the
   operator guide/walkthrough. Diff + sign-off for the app part.
7. **WS-D slides** (SDD §5 WS-D, python, NOT yet finalized — build but do not commit until user signs
   off the deck): D1 before/after reaction, D2 pipeline diagram, D3 honesty matrix, D4 verification
   evidence (incl. the WS-G reference-vector reproducibility proof). Self-review for honesty wording.
8. **Doc drift**: fix `CLAUDE.md §4` stale INDEPENDENT-AUDIT-* pointers (files are gone); update memory
   R8 (antenna-pattern.ts IS now wired into receivedPowerProxyDbm).

## Verification each slice
- `npm test` green (route-governance + build + verify-phase0 incl. over-claim gate).
- Affected smoke(s) green (e.g. `test:m8a-v4.12:f16`, `test:m8a-v4.11:slice5`, `verify:g1` run standalone).
- For any artifact regen: re-sync all sha256/metadata (deliverable README + evidence-manifest.json).
- Adversarial self-review on every test/doc change: confirm you did not weaken a real assertion or
  green-wash an over-claim. For app diffs, get human sign-off.

## Done when
SDD §8 acceptance criteria met: reactivity provable, report carries the evidence sections, every
displayed number traceable or marked assumed/gap, S1–S3 disclosed, no over-claim, slides present.
