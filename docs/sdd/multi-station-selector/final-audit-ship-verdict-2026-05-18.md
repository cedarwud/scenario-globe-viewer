# Selected-Pair IA Final Audit Verdict — 2026-05-18

Verdict: SHIP.

## Scope

This report covers the selected-pair IA convergence delivery after the URL #2
bootstrap-preservation fix and the final low-risk polish pass. Wave 6 deep
cleanup remains deferred.

## Gate Evidence

| Gate | Command / probe | Result |
| --- | --- | --- |
| Build | `npm run build` | PASS |
| G1 Bucket A coverage | `node scripts/verify-g1-bucket-a-coverage.mjs --port=9701` | PASS 19/19 |
| G3 60x continuity | `node scripts/verify-60x-replay-continuity.mjs --port=9702` | PASS; no console/page errors, panel stayed ready, replay clock advanced |
| G4 projection budget | `node scripts/verify-random-pair-projection-budget.mjs --port=9703` | PASS 18/18; worst ready 218.5 ms |
| G5 density | `node scripts/verify-information-density.mjs --port=9704` | PASS at 1280x800 and 1920x1080 |

## Five Walkthrough URLs

Manual CDP probes on the five fixed-window walkthrough URLs all mounted the V4
projection panel with `body[data-display-state]="replaying"` and
`panel[data-state]="ready"`.

| # | Pair | Visibility count line | LEO actor count |
| --- | --- | --- | --- |
| 1 | `ksat-svalsat-svalbard` / `ksat-tromso` | `26 mutual windows · showing next 3` | 600 |
| 2 | `ksat-svalsat-svalbard` / `ksat-trollsat-antarctica` | `0 mutual windows` | 600 |
| 3 | `intelsat-fuchsstadt` / `intelsat-atlanta` | `15 mutual windows · showing next 3` | 600 |
| 4 | `singtel-bukit-timah` / `measat-cyberjaya` | `42 mutual windows · showing next 3` | 600 |
| 5 | `cht-yangmingshan` / `sansa-hartebeesthoek` | `9 mutual windows · showing next 3` | 600 |

URL #2 now retains both `stationA` and `stationB`, renders the V4 panel, and
keeps the no-mutual-window scenario reproducible from a deep link.

## Polish Closed

- Row 4 visibility summary exposes a count line with machine-readable
  `data-summary-count`, `data-total-count`, and `data-preview-count`.
- Row 1 header exposes separator-delimited plain text and an equivalent
  `aria-label` for assistive reading.
- The walkthrough and IA docs now distinguish the demo LEO actor fixture count
  (600) from the larger upstream source inventory and from the 60-record
  projection compute cap.

## Deferred

Wave 6 deep cleanup remains intentionally unshipped in this audit. It touches
the visible product UX root and should stay behind a separate visual-diff pass.

## Post-Ship Correction

After manual demo review, clean-route pair selection was corrected so selecting
both stations from `/` automatically enters the V4 pair URL. CDP interaction
evidence confirmed the flow redirects to
`?scenePreset=regional&m8aV4GroundStationScene=1&stationA=ksat-svalsat-svalbard&stationB=ksat-tromso`,
mounts the V4 controller, and leaves the panel in `data-state="ready"`.
