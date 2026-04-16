# ADR 0007: Formal Site Dataset Integration Governance

## Status

Accepted

## Context

The current repo already had the technical seam for a site-specific dataset path, but it did not yet have a formal delivery definition for that line. This ADR is the checkpoint that authorized the current MVP while preserving the dormant baseline and showcase separation.

The accepted repo state today is:

- the preset layer includes `global`, `regional`, and `site`
- the `site` preset may attach an optional configured 3D tiles URL
- that site hook stays dormant by default
- the explicit OSM Buildings path is a separate showcase-only opt-in
- the accepted Phase 2.12 baseline intentionally keeps the site hook dormant and the showcase disabled
- the formal pre-Phase-3 measurement gate is still open because admissible Tier 1 / Tier 2 Profile A measurements are still missing

The repo therefore needed a narrow governance definition before any implementation prompt started a real dataset-backed site line. Without that checkpoint, later work could have accidentally:

- redefine the `site` preset
- treat the OSM showcase as formal site delivery
- overwrite the accepted Phase 2 baseline path
- or silently expand the narrow `3.1` execution exception into unrelated work

Evidence:

- [../delivery-phases.md](../delivery-phases.md) records both the original governance boundary for this line and the current separation between the dormant baseline path and the landed dataset-enabled MVP validation path.
- [../visual-baselines.md](../visual-baselines.md) records that the accepted `site` baseline intentionally runs with `VITE_CESIUM_SITE_TILESET_URL` unset, `siteTilesetState=dormant`, and the showcase disabled.
- [../deployment-profiles.md](../deployment-profiles.md) records that the OSM Buildings path is a mixed/showcase-only Profile C variant and remains separate from formal `site` preset semantics.
- [../cesium-evidence.md](../cesium-evidence.md) records the existing site-hook and showcase separation, including the blocked coexistence path and the missing admissible measurement evidence.

## Decision

Classify this line as:

`formal site dataset integration`

Use the more explicit label `formal site 3D Tiles dataset integration` only when a document needs to emphasize the dataset technology.

This work is governed as:

- a formal delivery line built on top of the existing Phase 2.11 site-hook seam
- separate from the narrow `3.1` HUD-shell exception
- separate from the committed OSM Buildings showcase line
- separate from the accepted Phase 2.12 / Profile A baseline evidence chain

The repo-level meaning of that decision is:

- the `site` preset remains the formal site-view framing contract rather than becoming a generic multi-model mode
- `VITE_CESIUM_SITE_TILESET_URL` remains the current formal site-hook entry seam unless a later ADR explicitly expands the configuration surface
- the OSM Buildings path remains explicit opt-in showcase behavior only; it is not a fallback, proxy, or substitute for formal site delivery
- dataset-enabled validation, screenshots, and review artifacts must be tracked separately from the dormant-hook Phase 2.12 baseline
- this line does not close the missing Tier 1 / Tier 2 Profile A measurement gate and does not change formal Phase 3 readiness

Any execution prompt for this line must preserve the following boundaries:

- do not reopen or invalidate `2.8-2.12`
- do not relabel dormant historical modules as unfinished work
- do not restore the older `offline-first = degrade Cesium-native default` interpretation
- do not redefine the accepted centered global framing or the fog-default / bloom-off guard
- do not redefine `site` preset semantics around showcase content
- do not rewrite the accepted Phase 2.12 / Profile A baseline path
- do not claim measurement-gate closure from WSL, SwiftShader, smoke, or non-admissible evidence

## Consequences

- The next implementation prompt can stay narrowly scoped to a dataset-backed site line instead of reopening Phase 2 or silently widening Phase 3.
- OSM showcase work and formal site dataset work can coexist, but they remain explicitly separated governance lines.
- If the real dataset requires configuration beyond the current single-URL seam, such as extra transforms, auth, metadata, or a broader runtime contract, that seam expansion must be documented before implementation widens.
- Dataset-enabled review artifacts, including the current MVP artifact line, must not overwrite the accepted dormant-hook Phase 2.12 screenshots.
- The existing accepted residual constraints remain unchanged: the large-chunk warning stays accepted and deferred, the upstream `protobufjs` `eval` warning stays accepted as upstream dependency risk, and the missing admissible Tier 1 / Tier 2 Profile A measurements remain the only formal hard blocker.
