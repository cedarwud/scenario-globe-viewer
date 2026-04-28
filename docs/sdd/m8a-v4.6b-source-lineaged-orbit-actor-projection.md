# M8A-V4.6B Source-Lineaged Orbit Actor Projection

Source note: this is a source/projection execution record for `M8A-VNext`
`V4.6B`. It accepts additional repo-owned display-context orbit actor records,
but it does not change runtime rendering and does not cause runtime to consume
the new actors.

## Status

- source/projection execution record
- accepted repo-owned projection artifact
- this source/projection phase itself did not implement runtime rendering
- later runtime consumption baseline exists at commit `ddbd21c`
- current as of 2026-04-28

Accepted projection artifact:

- `public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json`

Baseline runtime artifact/module remained unchanged in this source/projection
phase:

- `public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json`
- `src/runtime/m8a-v4-ground-station-projection.ts`

Later baseline:

- commit `ddbd21c` implements runtime consumption of the V4.6B `6 LEO` /
  `5 MEO` / `2 GEO` display-context actor set through repo-owned projection
  data/module surfaces

## Source Families Reviewed

### Eutelsat OneWeb LEO

Accepted for display-context actor enrichment.

Basis:

- the accepted endpoint package already carries OneWeb operator-family LEO
  evidence for Taiwan/CHT and Speedcast contexts
- CelesTrak NORAD GP TLE records provide source-lineaged actor inputs
- records remain display-context only and are not active serving satellites

Accepted records:

| Actor id | Source record | NORAD CATNR | Result |
| --- | --- | --- | --- |
| `oneweb-0386-leo-display-context` | `ONEWEB-0386` | `49312` | refreshed in V4.6B projection |
| `oneweb-0537-leo-display-context` | `ONEWEB-0537` | `56046` | refreshed in V4.6B projection |
| `oneweb-0701-leo-display-context` | `ONEWEB-0701` | `61607` | refreshed in V4.6B projection |
| `oneweb-0012-leo-display-context` | `ONEWEB-0012` | `44057` | added |
| `oneweb-0249-leo-display-context` | `ONEWEB-0249` | `48967` | added |
| `oneweb-0702-leo-display-context` | `ONEWEB-0702` | `61608` | added |

### SES O3b mPOWER MEO

Accepted for display-context actor enrichment.

Basis:

- the accepted endpoint package already carries CHT + SES O3b mPOWER MEO
  evidence and Speedcast O3b/MEO operator-family evidence
- CelesTrak `other-comm` NORAD GP TLE records provide source-lineaged MEO
  projection inputs
- records remain display-context only and are not active serving satellites

Accepted records:

| Actor id | Source record | NORAD CATNR | Result |
| --- | --- | --- | --- |
| `o3b-mpower-f6-meo-display-context` | `O3B MPOWER F6` | `58347` | refreshed in V4.6B projection |
| `o3b-mpower-f1-meo-display-context` | `O3B MPOWER F1` | `54755` | added |
| `o3b-mpower-f2-meo-display-context` | `O3B MPOWER F2` | `54756` | added |
| `o3b-mpower-f4-meo-display-context` | `O3B MPOWER F4` | `56367` | added |
| `o3b-mpower-f3-meo-display-context` | `O3B MPOWER F3` | `56368` | added |

### GEO Display Context

Accepted narrowly for one refreshed CHT/Singtel continuity anchor and one SES
GEO context actor.

Basis:

- `ST-2` remains the accepted GEO continuity anchor from the current V4 scene
- `SES-9` is accepted only as a source-lineaged SES GEO display-context actor
  because SES is already present in the accepted MEO operator context
- neither GEO record claims active serving satellite truth, active gateway
  assignment, pair-specific teleport path, measured metrics, or native RF
  handover

Accepted records:

| Actor id | Source record | NORAD CATNR | Result |
| --- | --- | --- | --- |
| `st-2-geo-continuity-anchor` | `ST-2` | `37606` | refreshed in V4.6B projection |
| `ses-9-geo-display-context` | `SES-9` | `41380` | added as SES GEO display context only |

## Rejected Candidates

The following were not projected:

- synthetic Walker/scale fixture actors: rejected because V4.6B requires real
  source-lineaged actors, not density actors
- generic Starlink or unrelated LEO records: rejected because the accepted
  V4 endpoint authority only gives operator-family LEO support for the
  current OneWeb context
- generic Intelsat, Eutelsat, AsiaSat, JCSAT, and other GEO fleet records:
  rejected for this pass because a CelesTrak TLE alone does not create an
  accepted V4 operator-context actor
- legacy O3b FM records: deferred in favor of O3b mPOWER records that align
  more directly with the current CHT/SES mPOWER evidence

## Blocked Candidates

The following remain blocked until a stronger source/projection gate exists:

- any actor claimed as the active serving satellite for the Taiwan/CHT +
  Speedcast endpoint pair
- any actor claimed as an active gateway, same-site `LEO/MEO/GEO` proof, or
  pair-specific teleport path
- any actor tied to measured latency, jitter, throughput, or continuity
- any native RF handover event or real operator handover log
- any site-specific CHT or Speedcast satellite assignment not present in the
  accepted endpoint-pair authority package

## Projection Boundary

The V4.6B artifact keeps the V4.2 contract boundary:

- endpoint pair unchanged
- endpoint precision unchanged at `operator-family-only`
- raw endpoint source coordinates remain null
- every actor has CelesTrak source lineage, source epoch, projection epoch,
  source position, render position, orbit class, operator context, freshness
  class, truth boundary, and machine-readable non-claims
- render positions are viewer-owned projected display positions and not active
  service truth
- runtime still must not side-read raw `itri` packages or live external feeds

## Validation

Projection validation:

- command: `npm run test:m8a-v4.6b:projection`
- verifies actor counts: `6 LEO`, `5 MEO`, `2 GEO`
- verifies CelesTrak source lineage and TLE checksums
- verifies source/render position boundary
- verifies required non-claim keys
- verifies forbidden phrases are absent from `doesClaim`
- verifies runtime raw `itri` side-read remains disallowed in the artifact

Runtime rendering validation was intentionally not run in this source/projection
phase because the phase did not update the runtime generated module or
renderer. Later runtime validation belongs to the `ddbd21c` implementation
baseline.

## Runtime Follow-On Gate

The original V4.6B runtime-consumption gate is closed by commit `ddbd21c`.
Future phases, including V4.6D, may reference the accepted V4.6B actor set only
through repo-owned projection/module surfaces and must still preserve the V4.6B
truth boundary.
