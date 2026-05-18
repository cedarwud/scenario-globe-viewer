# Spike S1 — cap × cadence performance

Status: closed
Author: Codex CLI (GPT-5), git identity Ben <cedarwud@gmail.com>
Reviewed-by: (pending — controller assigns reviewer)
Spike ref: SDD §12.1 row S1 at commit 7c44d60
Measurement date: 2026-05-19
Hardware: Chromium 1217 + 4-core baseline + swiftshader (WSL2)

## Measurement grid

| Config | LEO cap | LEO cadence | MEO cap | MEO cadence | GEO cap | GEO cadence |
| ------ | ------- | ----------- | ------- | ----------- | ------- | ----------- |
| BASE | 60 | 30 s | 60 | 60 s | 60 | 120 s |
| C1 | 60 | 10 s | 60 | 60 s | 60 | 120 s |
| C2 | 120 | 30 s | 60 | 60 s | 60 | 120 s |
| C3 | 120 | 10 s | 60 | 60 s | 60 | 120 s |
| C4 | 200 | 30 s | 60 | 60 s | 60 | 120 s |
| C5 | 200 | 10 s | 60 | 60 s | 60 | 120 s |
| C6 | 60 | 30 s | 100 | 60 s | 60 | 120 s |

Measurement command shape, run once per seed per config:

```bash
node scripts/verify-random-pair-projection-budget.mjs \
  --base-url=http://127.0.0.1:<port>/ \
  --port=<port + 100> \
  --seed=<seed>
```

Seeds: `20260517`, `20260518`, `20260519`. Each seed covers 18 pairs, for 54 measurements per config. The smoke at commit `7c44d60` has no `--runs` flag; it always runs the 18-pair set.

## Worker baseline (acknowledged per SDD §12.1 S1 notes)

Existing single-worker runtime via `src/features/multi-station-selector/runtime-projection-worker.ts` (≈ lines 30-45) + `runtime-projection-worker-client.ts` (≈ lines 39-83) is already in production. All measurements below use that single worker; "worker pool" optimisation is only proposed if the single-worker baseline fails the 1 s G4 gate.

## Per-config measured envelope

| Config | LEO cap | LEO cadence | p50 (ms) | p95 (ms) | worst (ms) | G4 p95 |
| ------ | ------- | ----------- | -------- | -------- | ---------- | ------ |
| BASE | 60 | 30 s | 176.5 | 268.1 | 290.3 | PASS |
| C1 | 60 | 10 s | 482.1 | 795.3 | 997.0 | PASS |
| C2 | 120 | 30 s | 228.5 | 320.2 | 407.8 | PASS |
| C3 | 120 | 10 s | 611.9 | 828.0 | 926.5 | PASS |
| C4 | 200 | 30 s | 303.2 | 391.2 | 469.2 | PASS |
| C5 | 200 | 10 s | 827.0 | 1027.3 | 1081.7 | FAIL |
| C6 | 60 | 30 s + MEO 100 | 175.2 | 253.6 | 259.1 | PASS |

C5 is the only measured p95 failure. The existing smoke exits nonzero when any pair exceeds 1 s; C5 still produced complete timing JSON for all 54 pairs. No config approached the 30 s pathological stop threshold.

## Per-orbit-cadence projection

S1 measurement uses a single global `DEFAULT_SAMPLE_STEP_SECONDS` constant. F1 introduces per-orbit cadence via `visibility-cadence-multi.ts` (LEO cadence controlled independently, MEO 60 s, GEO 120 s). Under per-orbit cadence, MEO+GEO contribution drops because their cadence is coarser than LEO's.

The expected per-orbit-cadence envelope is approximately:

```text
envelope_per_orbit = envelope_global × LEO_share
                   + envelope_global × (MEO_share × LEO_cadence / 60)
                   + envelope_global × (GEO_share × LEO_cadence / 120)
```

Using the raw fixture inventory noted in SDD S1 (LEO 600, MEO 33, GEO 30), the multiplier is ≈ 0.917 for a 10 s LEO cadence and ≈ 0.941 for a 30 s LEO cadence. For the table below, I used active cap-weighted counts because `DEFAULT_TLE_CAPS` is applied before visibility sampling.

| Config | Active count basis | Multiplier | projected p50 (ms) | projected p95 (ms) | projected worst (ms) |
| ------ | ------------------ | ---------- | ------------------ | ------------------ | -------------------- |
| BASE | 60/33/30 | 0.683 | 120.5 | 183.1 | 198.3 |
| C1 | 60/33/30 | 0.553 | 266.5 | 439.7 | 551.2 |
| C2 | 120/33/30 | 0.787 | 179.8 | 252.0 | 320.9 |
| C3 | 120/33/30 | 0.699 | 428.0 | 579.1 | 648.0 |
| C4 | 200/33/30 | 0.852 | 258.2 | 333.2 | 399.6 |
| C5 | 200/33/30 | 0.791 | 654.1 | 812.5 | 855.5 |
| C6 | 60/33/30 | 0.683 | 119.6 | 173.2 | 176.9 |

Interpretation: the measured all-orbit-10 s C5 p95 is 1027.3 ms, but the cap-weighted per-orbit projection for LEO 200 + LEO 10 s / MEO 60 s / GEO 120 s is ≈ 812.5 ms p95. Treat that as a planning estimate, not acceptance evidence, until the actual F1 per-orbit wrapper is measured.

## Flame graph (C5 worst case)

Dominant cost: `computeVisibilityWindowsForStation`.

- `computeRuntimeProjection`: 97.7% inclusive over 28,302 worker samples.
- `computeVisibilityWindowsForStation`: 86.2% inclusive.
- `satellite.js` `propagate`: 62.7% inclusive.
- `satellite.js` `sgp4`: 53.5% inclusive; top self-cost function at 38.1%.
- Deep-space propagation helpers (`dspace`, `dpper`, `gstime`, `jday`) account for most remaining self-cost inside propagation.

Profile artifact: `docs/spike/multi-station-selector/spike-S1-flamegraph-C5.json`. It is a Chromium CPU profile captured from the runtime projection worker while replaying the same 54-pair C5 workload.

## Recommendation

### Configuration that stays under 1 s G4 gate

Measured p95 under 1 s: BASE, C1, C2, C3, C4, C6. C5 fails measured p95 by 27.3 ms.

### F1 LEO cadence decision

F1 is SAFE to upgrade LEO cadence to 10 s within the existing LEO 60 cap. Evidence: C1 p95 = 795.3 ms and worst = 997.0 ms across 54 measurements.

### F8 cap raise decision

F8 is SAFE to ship LEO 200 cap with LEO cadence held at 30 s. Evidence: C4 p95 = 391.2 ms and worst = 469.2 ms.

Do not declare the combined LEO 200 + global 10 s cadence measured-safe from S1. Evidence: C5 p95 = 1027.3 ms. If F1 lands per-orbit cadence first, the cap-weighted C5 projection is ≈ 812.5 ms p95, so the combined path is plausible, but it needs one follow-up smoke against the actual per-orbit implementation before F8 acceptance says "LEO 200 + LEO 10 s simultaneous".

### Compute-path-optimisation proposal

Not triggered. Multiple measured configurations pass the 1 s p95 gate. If a future true per-orbit implementation still fails at LEO 200 + 10 s, the flame graph points first to sample-time memoisation across station A/B because both stations propagate the same satellite at the same UTC sample; that should reduce duplicate `sgp4` work before adding a worker pool.

## SDD v3 patch (per §12.1.1 closure step 4)

After this report is reviewed, the following SDD edits should land in a separate patch PR:

- §11 risks: remove "PERF-SPIKE-PENDING (S1)" row, add NEW row only if S1 surfaced a follow-up risk.
- §12 Resolved Decisions: add new entry "S1 closed: C1 is safe for LEO 60 + 10 s; C4 is safe for LEO 200 + 30 s; C5 all-orbit 10 s is not measured-safe, while per-orbit C5 projects under 1 s and needs implementation-level confirmation."
- §7 F1 + F8 acceptance: replace "BLOCKED on S1" wording with the chosen configuration.

## Spike artefacts

- Per-pair measurement raw output: `docs/spike/multi-station-selector/spike-S1-measurements.json`
- Flame graph (C5): `docs/spike/multi-station-selector/spike-S1-flamegraph-C5.json`
- Smoke run logs: `/tmp/sgv-s1-logs/BASE-seed-*.log` through `/tmp/sgv-s1-logs/C6-seed-*.log` retained locally during this run; aggregate committed in the raw output JSON above.
