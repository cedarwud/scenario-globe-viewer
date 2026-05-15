# M8A V4.12 F-09 Implementation Phase 5 Closeout

Date: 2026-05-12

Status: **completed (bounded)**.

## Close-Out Note

- Implementation files:
  - `src/features/communication-rate/communication-rate.ts`
  - `src/features/communication-rate/bootstrap-communication-rate-section.ts`
  - mounted through `src/features/communication-time/bootstrap-communication-time-panel.ts`
- Source seam: read-only `PhysicalInputState.projectedMetrics`, with physical-input bounded proxy provenance.
- Surface placement: `data-communication-panel="bootstrap"` under the existing Communication Time panel.
- Chart shape: compact modeled-class trend line over observed bounded physical-input windows, with LEO/MEO/GEO series, distinct line styles, markers, text labels, and a table fallback.
- Bucket thresholds: N/A; class-only mapping uses Candidate capacity context / Continuity context / Guard context and does not display numeric rate values.
- Smoke command: `npm run test:m8a-v4.12:f09`.
- Screenshot evidence: `output/m8a-v4.12-f09-communication-rate/phase6-acceptance-communication-rate.png`.
- Smoke manifest: `output/m8a-v4.12-f09-communication-rate/smoke-manifest.json`.

F-09 is closed only for the repo-owned bounded communication-rate visualization seam.
External iperf/ping measurement truth remains external.
