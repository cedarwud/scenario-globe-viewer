# ADR 0014: Selected-Pair Route and Overlay Governance

## Status

Accepted. Recorded 2026-06-20 as a backfill from agent-memory; the governance
was enacted 2026-05-23..2026-05-30. The original design notes were local SDDs
(`docs/sdd/multi-station-selector/selected-pair-route-governance.md`,
`selected-pair-overlay-governance.md`, `th5-orbit-source-policy-gate.md`) that
have since been removed from disk under the gitignored-SDD convention. This ADR
is the durable, tracked record so the governance no longer depends on deleted
local files.

## Date

2026-05-30 (enacted) / 2026-06-20 (recorded)

## Context

Between 2026-05-23 and 2026-05-30 a governance slice hardened the selected-pair
demo route, overlay state arbitration, side-panel surface allocation, large-CSS
splitting, and TLE refresh isolation. The design lived in local SDDs that are
now gone; the enforcement gate `scripts/verify-selected-pair-route-governance.mjs`
remains in the build, but its rationale was untracked, and CLAUDE.md/AGENTS.md
pointed agents at the missing overlay-governance SDD. This ADR records the
decision.

Implementation module/line references below are as recorded on 2026-05-30 and
should be verified against current code before relying on them.

## Decision

1. **Canonical demo route** is the 6-hour selected-pair route
   `/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=...&durationMinutes=360`.
   The long-form `m8aV4GroundStationScene=1` URL is compatibility-only and must
   not be referenced by active or homepage flows. Enforced by
   `scripts/verify-selected-pair-route-governance.mjs`; smokes use the route
   constants in `scripts/helpers/demo-routes.mjs`.
2. **Overlay state is arbitrated centrally** (recorded module
   `src/features/multi-station-selector/selected-pair-overlay-state.ts`). While
   the details drawer, station info card, or product inspector is open,
   transient marker hovers are suppressed (mutual exclusion).
3. **Accessibility floor**: explicit ARIA (`aria-expanded` / `aria-controls`),
   focus transitions (focus close buttons/triggers, return focus on close), and
   Escape handling on overlay surfaces.
4. **Surface allocation**: the main panel is the primary decision surface (6h
   timeline, link plan, rain delta); `Details & sources` is the supporting
   evidence/summary drawer; exact rows are exported only via the downloadable
   self-contained HTML evidence report.
5. **Large-CSS split**: the 4,000+ line `styles.css` was split into scoped files
   (`src/styles/ground-station-selector.css`, `runtime-panels.css`,
   `app-shell-hud.css`, ...); structural validation is wired into CI and the
   local build.
6. **TLE refresh isolation + network opt-in**: refresh is a manual maintenance
   command (`npm run refresh:tle` -> `scripts/refresh-tle.mjs`), refusing repeats
   within 2 hours and skipping when the manifest is younger than 7 days. The
   runtime and standard builds consume the pinned bundled local snapshots
   (`src/features/multi-station-selector/demo-scenario-config.json`) BY DEFAULT, so
   the delivered scene is reproducible across runs and wall-clock dates and never
   silently swaps in the live-refreshed catalog. The CelesTrak network catalog under
   `/fixtures/satellites-network/` stays reachable only as an explicit per-load
   opt-in (`?tleSource=network`), preserving the fresh-data (F7) capability without
   mutating the default delivery surface.

   _Amended 2026-06-21 (commit `cfc6471`)._ The original clause asserted the runtime
   "consume only bundled local snapshots", but the code silently overruled it:
   `loadDefaultTleSources` defaulted to the network snapshot whenever the manifest
   was fresh and fell back to the pinned snapshots only once it went stale — making
   the demo geometry wall-clock-date-dependent. The default is now actually
   pinned-local (`loadDefaultTleSources` resolves `local-snapshot` unless
   `?tleSource=network` is present), reconciling code with this rule and demoting
   the network catalog to an explicit opt-in.

## Consequences

- The route/overlay governance is now tracked; CLAUDE.md / AGENTS.md points
  agents here (and to agent-memory `project_route_overlay_governance_2026_05_30`)
  instead of the removed local SDD.
- Removing or relaxing any rule above is an ADR-level change, not an incidental
  edit.
- Implementation module / line references may have drifted since 2026-05-30;
  verify against current code before relying on them.

## Related

- agent-memory: `project_route_overlay_governance_2026_05_30`
- Commits: OneWeb integration `609bfb9`, side-panel redesign `9f74c73`,
  CSS/surface split `f828f09`, structural-gates CI `aa6e0c1`
- `scripts/verify-selected-pair-route-governance.mjs`,
  `scripts/helpers/demo-routes.mjs`
- `src/features/multi-station-selector/selected-pair-overlay-state.ts` (verify
  against current code)
