# M8A-V4.11 Visual-Token Spike (Conv 0)

Sandbox prototype of the 5 visual tokens in
`docs/sdd/m8a-v4.11-storyboard-rewrite-proposal.md` §Visual Token Spec.
Verifies that each token can be rendered with current Cesium primitives.

**This is a spike, not production.**
Do NOT extend it into production code, do NOT touch
`src/runtime/`, `src/styles/`, or `tests/smoke/` from this folder.

## Files

- `index.html` — sandbox page with toolbar, fps counter, legend
- `main.js` — 5 tokens implemented per spec dimensions (color, opacity,
  motion, radius), with Cesium Sandcastle gallery references in comments
- `screenshots/` — captured per-token + ALL-tokens visuals
- `spike-report.md` — written summary of fps, spec达成度, recommendations

## Running

```sh
# from scenario-globe-viewer root
npm run dev
# then open http://127.0.0.1:5173/spike/m8a-v4.11-visual-tokens/
```

## Tokens

| Token | Cesium primitive | Sandcastle reference |
|---|---|---|
| W1 rising arc | 8 polyline entities, stepped alpha | circles-and-ellipses (.withAlpha) |
| W2 fading arc | per-segment polyline (past) + dashed polyline (future) | polyline-color-dev, polyline-dash |
| W3 breathing disk | ellipse + ColorMaterialProperty(CallbackProperty) | callback-property, circles-and-ellipses |
| W4 candidate pulse | 3 phase-shifted billboards w/ Canvas ring sprite, scale + color via CallbackProperty | billboards, callback-property |
| W5 steady ring | billboard w/ Canvas ring sprite, fixed scale 80/256 | billboards |

## Spike rules

- hardcoded coordinates / hardcoded clock (no production data flow)
- no production controller, no production stylesheet
- Conv 0 outcome: PASS (spec achievable) or FAIL (spec needs revision)
- `spike-report.md` documents the conclusion
