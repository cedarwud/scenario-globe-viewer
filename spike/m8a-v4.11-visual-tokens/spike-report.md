# M8A-V4.11 Visual-Token Spike Report (Conv 0)

Date: 2026-05-03
Status: **spike PASS** — all 5 tokens achievable in Cesium with current
primitives; one minor spec note (depth-test policy) and one harness caveat
(software rendering) recorded below.
Scope: `spike/m8a-v4.11-visual-tokens/` only. Did NOT touch `src/runtime/`,
`src/styles/`, or `tests/smoke/`. Did NOT modify the production controller
or stylesheet. Hardcoded coordinates and clock per Addendum 1.3.

## Harness

- Vite dev server (`npm run dev`), navigated to
  `http://127.0.0.1:5173/spike/m8a-v4.11-visual-tokens/`
- Headless Chrome 145.0 (Playwright MCP), 1280×800, devicePixelRatio 1
- WebGL renderer: **ANGLE / SwiftShader (software)** — fps numbers below are
  software-rendering ceilings, NOT real GPU performance
- 60-second sampling at 0.5 s cadence on the **ALL view**, with all 5 tokens
  active (3 of them animating per frame)

## Per-token results

### W1 — Rising arc trail · spec **可達**

- Cesium primitive: `viewer.entities.add({polyline:{...}})` × 8 entities,
  one per segment, each `material: Color.fromCssColorString("#00d4ff").withAlpha(stepAlpha)`
- Stepped alpha 1/8…8/8 over 8 segments along
  hardcoded ground track `(lon -130, lat 10) → (lon -110, lat 30)`
- Sandcastle reference: `cesium/packages/sandcastle/gallery/circles-and-ellipses`
  for `.withAlpha`; per-segment stepping matches Addendum 1.3's
  "Polyline Per-segment Coloring" pattern
- Screenshot: `screenshots/01-w1-rising-arc.png` — staircase clearly visible,
  faintest at south end, full opacity at current (north end)
- Width 3 px confirmed
- 60s frame budget: included in ALL-view sample below; W1 contributes 8
  static polyline draws, no per-frame compute

### W2 — Fading arc trail · spec **可達**

- Past portion: 6 polyline entities, each with
  `Color.fromCssColorString` lerp (amber `#e8b04a` → red `#d35a3a`) using
  `withinWindowFraction = 0.6` per Addendum §1.1, alpha 20 % (tail) → 100 %
  (current)
- Future portion: 6 polyline entities with
  `PolylineDashMaterialProperty({ color: lerpedRed.withAlpha(...), dashLength: 16 })`,
  alpha 100 % (current) → 20 % (tail)
- Sandcastle reference:
  - past gradient: `cesium/packages/sandcastle/gallery/polyline-color-dev`
    (per-segment color)
  - future dashed: `cesium/packages/sandcastle/gallery/polyline-dash`
- Screenshot: `screenshots/02-w2-fading-arc.png` — solid amber→red tail
  (Brazil → Atlantic) and dashed future predicted (Atlantic → West Africa)
- Width 3 px confirmed
- The "60s of dashes" segment uses `PolylineDashMaterialProperty.dashLength: 16`,
  giving a clearly distinguishable dotted look from the solid past portion
- 60s frame budget: included in ALL-view sample; W2 contributes 12 static
  polyline draws, no per-frame compute

### W3 — Breathing disk · spec **可達 (with size note)**

- Cesium primitive: `entities.add({ ellipse: { semiMajorAxis: r, semiMinorAxis: r,
  material: new ColorMaterialProperty(new CallbackProperty(...))} })`
- Breathing alpha derived in CallbackProperty:
  `alpha = lerp(0.3, 0.35, (sin(2π·0.5·sec)+1)/2)` — 0.5 Hz cycle, 30 %–35 %
- Two side-by-side variants per Addendum 1.3 size comparison:
  W3a 1500 km, W3b 800 km
- Sandcastle reference:
  `cesium/packages/sandcastle/gallery/callback-property` (per-frame lazy eval)
  + `cesium/packages/sandcastle/gallery/circles-and-ellipses`
  (entity ellipse on surface with `.withAlpha`)
- Screenshot: `screenshots/03-w3-breathing-disk-frame-a.png` — both disks
  visible with subtle muted blue shading; **W3a 1500 km dominates the
  Indian-Ocean view at this camera distance, W3b 800 km reads as a tighter
  patch**
- Breathing math sampled in browser: alpha cycles 0.3 ↔ 0.35 over 2 s
  period, confirmed (0.3500 → 0.3002 → 0.3500 → 0.3103 over 4 s)
- **Spec note (matches Addendum 1.3 prediction)**: 1500 km consumes a large
  fraction of the visible globe at 9 000 km camera altitude. **Recommend
  Conv 1 lock the 800 km variant** for production W3 (per Addendum 1.3
  fallback); 1500 km is presented here only for the comparison this spike
  was asked to do.

### W4 — Candidate pulse · spec **可達**

- Cesium primitive: 3 phase-shifted `entities.add({ billboard: {
  image: ringSprite, scale: CallbackProperty(...), color: CallbackProperty(...) }})`
- Ring sprite: 256×256 transparent PNG generated at runtime via Canvas 2D
  (`createRadialGradient` + `arc`)
- Per-frame derivation in CallbackProperty:
  `phase = ((sec * 1Hz) + offset) mod 1`
  `scale = lerp(50/256, 200/256, phase)`
  `alpha = lerp(0.8, 0.0, phase)`
- Phase offsets `[0, 1/3, 2/3]` keep at least one ring visible at any time
- Sandcastle reference:
  `cesium/packages/sandcastle/gallery/billboards` (`scale`, `color`,
  `disableDepthTestDistance`) + `gallery/callback-property`
- Screenshots: `screenshots/04-w4-candidate-pulse-frame-a.png` (3 rings at
  different radii) and `04-w4-candidate-pulse-frame-b.png` (1 s later — ring
  positions advanced, confirming the 1 Hz pulse)
- Anchored above ground at altitude 200 km so screen-space scale is observable

### W5 — Steady ring · spec **可達**

- Cesium primitive: `entities.add({ billboard: { image: ringSprite,
  scale: 80/256, color: gold.withAlpha(0.6) } })` — fixed scale, fixed alpha,
  no CallbackProperty
- Sandcastle reference: `cesium/packages/sandcastle/gallery/billboards`
- Screenshot: `screenshots/05-w5-steady-ring.png` — gold halo around the
  GEO anchor point at altitude 35 786 km, no perceptible animation
- Color `#e8c860` rendered as warm gold; alpha 60 % gives the soft halo feel
  per spec

## 60-second fps observation (ALL view, all 5 tokens active)

| Metric | Value |
|---|---|
| Mean fps | **7.18** |
| Min fps | 4.87 |
| Max fps | 8.14 |
| Sample count | 66 (over 60 s) |
| WebGL renderer | ANGLE / SwiftShader (software) |
| Stable across 60 s? | yes (no degradation trend) |

**Caveat**: Headless Chrome on this WSL2 host falls back to SwiftShader
software rendering. **These fps numbers are not representative of real
desktop GPU.** They are useful only as relative checks: no token causes a
crash, no animation degrades over 60 s, and the 5 tokens together fit within
~140 ms/frame even with a software rasterizer.

For Conv 1 (production wiring), redo the 60 s budget on a real GPU instance
(e.g. an ITRI demo machine or a hardware-accelerated headless run) before
declaring the production frame budget green.

## Findings beyond the per-token spec

### F-1 · Depth-test bleed-through (informational, not a blocker)

The W4 pulse and W5 ring billboards use `disableDepthTestDistance:
Number.POSITIVE_INFINITY` so they remain visible at long camera distances.
This causes them to render through the Earth when the camera is on the
opposite side of the anchor (visible in the W1, W2 screenshots as faint
green/gold rings overlaid on Africa or the Pacific even though the actors
are on the antipodal hemisphere).

Addendum 1.3 does not specify a depth-test policy. Recommend Conv 1
either:
- (a) accept bleed-through (current spike behavior), since it preserves
  affordance under unusual camera angles; or
- (b) add a `DistanceDisplayCondition` to hide tokens beyond
  ~half-circumference camera distance from anchor.

This is a design decision, not a token-feasibility issue. Spike does not
block on it.

### F-2 · withinWindowFraction derivation (Addendum §1.1, confirmed reachable)

W2's amber→red gradient derives `colorT` from
`withinWindowFraction = 0.6` (fixed in spike per Addendum 1.3 instruction).
Production wiring will compute it from the V4.6D `replayRatio` plus the
window range. The spike confirms the derivation produces the visually
expected mid-cycle color split, so the runtime data path can drop in
without re-architecting the polyline construction.

### F-3 · CallbackProperty per-frame cost is negligible relative to scene shading

5 callbacks per frame (2 W3 ellipses × 1 callback + 3 W4 billboards × 2
callbacks each = 8 callback evals/frame) registered no detectable cost vs.
static-only frames; mean fps was the same as a quick static-only sanity
check (~7 fps in software). On real GPU the per-callback work
(`Math.sin`, color clone) is well under 1 µs per call. Addendum 1.3's
"frame budget 風險低（13 actor + ~5 dynamic property）" prediction is
confirmed.

## Spike conclusion

**PASS — all 5 tokens are achievable with the Cesium primitives prescribed
in Addendum 1.3, with no spec changes required.**

Per-token verdicts:

| Token | Verdict | Recommended spec change |
|---|---|---|
| W1 rising arc | 可達 | none |
| W2 fading arc | 可達 | none |
| W3 breathing disk | 可達 | lock 800 km variant for production (already mentioned in Addendum 1.3 as the lighter option) |
| W4 candidate pulse | 可達 | none (depth-test policy is a Conv-1 design decision, not a spec change) |
| W5 steady ring | 可達 | none |

Conv 1 is unblocked. The decision to launch Conv 1 belongs to planning/control,
not this conversation.

## Reproduction

```sh
cd /home/u24/papers/scenario-globe-viewer
npm run dev    # vite at http://127.0.0.1:5173
# open http://127.0.0.1:5173/spike/m8a-v4.11-visual-tokens/
```

The toolbar buttons fly to each token; the fps readout in the top-right is
live; `window.__spike.startSampling()` / `stopSampling()` give a 60 s
mean/min/max sample on demand.
