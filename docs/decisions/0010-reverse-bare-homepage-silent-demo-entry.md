# ADR 0010: Reverse Bare Homepage Silent Demo Entry

## Status

Accepted

## Context

`src/runtime/bootstrap/composition.ts:154-161` currently maps bare `/`
(`window.location.pathname === "/"` with empty `search`) to the default
first-intake scenario via `R1V_HOME_DEFAULT_SCENARIO_ID`:

```ts
if (window.location.pathname === "/" && window.location.search === "") {
  return R1V_HOME_DEFAULT_SCENARIO_ID;
}
```

That behavior was added during R1V while the first-intake runtime was
first being wired. The repo subsequently added
`applyR1vVisualAcceptanceHudCleanup(...)` to hide the default status panel
whenever first-intake is adopted as active owner. Together they let bare
`/` silently run the addressed first-case scene without any visible user
action.

`docs/sdd/m8a-v3-entry-and-first-impression-plan.md` was written
2026-04-24 as part of the M8A-V3 presentation convergence recovery line.
It identifies that mapping as a direct obstacle to user-facing demo
quality:

- §Stable Entry Rule: "bare `/` remains stable and outside demo state
  unless the user explicitly enters the demo"
- §Canonical Discovery Pattern: one explicit visible homepage/demo entry
  is the only canonical user-discovery authority; named routes and query
  machinery may remain as internal transport, but not as discovery
  surface
- §Forbidden First-Impression Failure Modes: rejects routes that "look
  identical to the baseline until the user reads small text"

The existing silent mapping fails all three rules. It is also a concrete
instance of the failure mode
`itri/multi-orbit/north-star.md` §Current Program Risk item 3 now calls
out: seam/controller/telemetry work that does not produce a visible
viewer change.

## Decision

1. `resolveFirstIntakeRequestedScenarioId()` in
   `src/runtime/bootstrap/composition.ts` must no longer map bare `/` to
   `R1V_HOME_DEFAULT_SCENARIO_ID`. Bare `/` returns `undefined`, so the
   first-intake `adoptFirstIntakeAsActiveOwner` path does not fire on
   the default route.

2. Bare `/` stays as a stable baseline viewer: native Cesium shell,
   globe, default HUD frame, no demo state. The addressed-route HUD
   cleanup path (`applyR1vVisualAcceptanceHudCleanup`) only runs when
   first-intake is adopted as active owner, so baseline-route HUD
   visibility is not widened or narrowed by this ADR.

3. V3.1 implementation adds one explicit, visibly identifiable homepage
   entry (a CTA) as the single canonical discovery pattern. The CTA
   must signal all three of:
   - this is a demo entry
   - this is the cross-orbit handover path
   - this is the first-case `OneWeb LEO + Intelsat GEO aviation`

   per `m8a-v3-entry-and-first-impression-plan.md` §Entry Visual-Signal
   Rule.

4. The existing `FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM` query-param
   machinery is preserved as internal transport detail for legacy and
   smoke/capture coverage, but is no longer the standalone visible
   discovery authority.

5. This ADR does not authorize any change to M8A-V2 accepted runtime
   seams (mobile-endpoint-trajectory, nearby-second-endpoint and its
   expression/info controllers, cinematic-camera-preset, satcom-context
   overlay, replay time authority). V3.1 is a presentation and routing
   slice only.

## Consequences

- `npm run test:phase1` and any harness that assumed bare `/` auto-enters
  the first-case scenario must migrate to the explicit CTA path or the
  preserved query-param path.
- Soak and capture artifacts that were implicitly driven by bare `/`
  must be rechecked; the bare route now captures the baseline viewer,
  not the demo scene.
- `R1V_HOME_DEFAULT_SCENARIO_ID` may be retained as the CTA's scenario
  target or removed if no caller depends on it. A later cleanup pass
  should drop the R1V legacy prefix from the constant name once V3.1
  stabilizes.
- Post-V3.1 slices (V3.2-V3.5) inherit a scene-less bare `/` baseline
  and a single addressed demo surface; those slices may reshape the
  addressed scene freely without preserving the old silent-entry
  behavior.

## Related

- `docs/sdd/m8a-v3-presentation-convergence-umbrella-plan.md`
- `docs/sdd/m8a-v3-entry-and-first-impression-plan.md`
- `itri/multi-orbit/handoff-overview.md` (Framing To Not Confuse section)
- `itri/multi-orbit/north-star.md` (Current Program Risk item 3)
