# M8A-V4.7.1 Handover Product UX Final Handoff

Source note: this is the final handoff and closeout record for the
`M8A-V4.7.1` handover product UX correction. It is doc-only and does not
authorize new runtime implementation.

Related correction SDD:
[./m8a-v4.7.1-handover-product-ux-correction-plan.md](./m8a-v4.7.1-handover-product-ux-correction-plan.md).
Related V4.7 product UX SDD:
[./m8a-v4.7-handover-product-ux-plan.md](./m8a-v4.7-handover-product-ux-plan.md).
Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).

## Status

- final handoff / closeout record
- doc-only
- current as of 2026-04-29
- final accepted head: `a48b0a6 Clean V4.7.1 accepted runtime status`
- final accepted runtime obstruction fix:
  `9604bde Fix V4.7.1 details sheet annotation obstruction`
- runtime/product acceptance: closed
- no additional `V4.7` or `V4.7.1` runtime work is open from this record

## What Closed

`M8A-V4.7.1` closed the product usability failure left after the initial
`M8A-V4.7` runtime implementation.

The accepted correction keeps the same route, endpoint pair, precision, actor
set, source boundary, and `V4.6D` model truth. It does not add endpoint
selection, endpoint expansion, new data sources, `R2` runtime behavior, `V5`
scope, active satellite/gateway/path claims, measured metrics, or native RF
handover claims.

## Accepted Runtime Result

Accepted runtime commits:

- `26781b8 Implement M8A V4.7 handover product UX`
- `df829af Harden M8A V4.7 acceptance records`
- `4c7ba8a Implement M8A V4.7.1 UX correction`
- `9604bde Fix V4.7.1 details sheet annotation obstruction`

Accepted documentation / closeout commits:

- `93e5362 Add M8A V4.7.1 UX correction plan`
- `7584313 docs: clean up M8A V4.7.1 SDD review wording`
- `6ff985c Record M8A V4.7.1 acceptance result`
- `e454efa Record V4.7.1 obstruction fix validation`
- `a48b0a6 Clean V4.7.1 accepted runtime status`

Runtime implementation accepted:

- stable product UX control DOM identity during active replay ticks
- compact control strip as the primary control surface
- secondary details sheet, closed by default
- noninteractive scene-near current-state annotation tied to display-context
  evidence
- readable typography and hit-target thresholds across accepted viewports
- playback policy preserved: `60x` default, `30x` guided review, `120x` quick
  scan, `240x` debug/test-only seam
- loop, pause, restart, final hold, and replay-time semantics preserved
- `V4.6D` product labels and window ids preserved

## Final Blocker Closure

The final blocking issue was that the open details sheet covered the
scene-near annotation on desktop. Commit `9604bde` moved the sheet and added
smoke coverage proving that open details and the scene-near annotation do not
intersect at:

- `1440x900`
- `1280x720`
- `390x844`

After that fix, the runtime/product acceptance review found no remaining
blocking issues.

## Accepted Validation

The accepted validation set passed:

- `git diff --check`
- `npm run test:m8a-v4.7.1`
- `npm run test:m8a-v4.6d`
- `npm run test:m8a-v4.6e`
- `npm run test:m8a-v4.6a`
- `npm run test:m8a-v4.6b`

The upgraded smoke coverage includes:

- route, endpoint pair, precision, actor counts, source-boundary, and model
  truth checks
- forbidden-claim scan
- real pointer-click matrix
- DOM identity stability during replay ticks
- computed font-size and hit-target assertions
- scene-near annotation mapping and noninteraction checks
- per-state product label validation
- open-details geometry checks against the scene-near annotation

Accepted screenshots:

- `output/m8a-v4.7.1-desktop-1440x900-product-ux.png`
- `output/m8a-v4.7.1-desktop-1280x720-product-ux.png`
- `output/m8a-v4.7.1-narrow-390x844-product-ux.png`

## Runtime Cleanup Record

No dev server was kept after validation. Smoke-managed temporary static
servers and headless browsers exited. No task-owned Playwright, Chrome, MCP, or
static-server process was intentionally retained.

## Closure Rule

No further `V4.7` or `V4.7.1` runtime prompt is open.

Future work must use a new explicit planning/control decision. The next valid
tracks are:

- keep runtime closed and continue source/candidate work
- open a `V5` decision gate only after new accepted endpoint-pair scenarios
  exist
- open a separate legacy aviation/YKA cleanup gate only if explicitly requested

Any future runtime work must preserve the accepted route, endpoint pair,
precision, actor set, source boundary, and `V4.6D` model truth unless a new
accepted SDD explicitly changes those boundaries.
