# M8A-V4.11 Slice 6 Manual Reviewer Checklist

Status: `revised and run against the Conv 4 protocol; reviewer execution passed`.

Route under review:
`/?scenePreset=regional&m8aV4GroundStationScene=1`.

Protocol authority:
`output/m8a-v4.11-slice0/reviewer-protocol.md`.

## Checklist result

| Item | Result | Notes |
| --- | --- | --- |
| Use 1440x900 viewport | pass | Route capture and reviewer session used 1440x900. |
| Use 60x replay through all five V4.6D windows | pass | Route capture metadata recorded 60x replay. |
| Ask five cold questions per window | pass | R1-R3 answered W1-W5 Q1-Q5. |
| Keep Details closed during cold questions | pass | Details remained closed; transcript files record `Details opened: no`. |
| Use footer `[Simulation view]` as simulation disclosure | pass | This replaces stale Truth-button wording. |
| Use footer `TLE: CelesTrak NORAD GP` chip for Q5 | pass | Do not use a corner badge as the required cold-question source path. |
| Treat `Sources` as advanced evidence only | pass | `Source provenance` is inside Details and is not required for cold questions. |
| Exclude R0 founding testimony from Slice 6 count | pass | R0 is one-time Slice 0 evidence only. |
| Require three protocol-valid fresh reviewers | pass | R1, R2, and R3 transcripts were collected. |

## Accepted design evolution

`accepted design evolution`: if older SDD text conflicts with Conv 4, use the
Conv 4 handoff and revised reviewer protocol.

| Older wording | Current Conv 4 checklist wording |
| --- | --- |
| Truth button is a cold-review affordance. | Truth button is removed; footer `[Simulation view]` carries ambient disclosure. |
| Details and Truth can be opened together for reviewer questions. | Cold questions must not require opening Details; the old Details + Truth prompt is stale. |
| Corner provenance badge is the primary TLE affordance. | Footer `TLE: CelesTrak NORAD GP · 2026-04-26` chip is the first-read source affordance. |
| Sources can be reached from glance chips. | Sources is demoted to Details advanced `Source provenance`; it is evidence archive, not cold-question path. |

## Manual closeout check

Manual reviewer closeout passes for the V4.11 reviewer-comprehension gate.
Lock-in L hardware-GPU validation remains a separate non-reviewer follow-up.
