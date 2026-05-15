# M8A V4.11 Implementation Phase 3 Token Migration Handoff

## §1 Scope landed

Phase 3 applies spec v2 §6 on top of the Phase 1 content/hookpoint and Phase 2 inspector restructure working tree.

- Added the central `--m8a-v411-state-*` family in `src/styles/m8a-v411-phase-b-layout.css`.
- Migrated active, focus, current-state, warning, disabled, and neutral state styling to state tokens.
- Preserved orbit identity ownership for orbit labels, swatches, glyph color, and source orbit rows.
- Removed raw hex literals from component-level `src/styles/m8a-v411-*.css`; hex remains only in the central token file.
- Re-captured the Phase 2 inspector header detail image with the boundary strip, validation badge, and 3 tabs visible.

Phase 3 production code edits stayed in V4.11 CSS and one token-name smoke assertion. No runtime/DOM source was changed for this phase.

## §2 State tokens

Definitions in `src/styles/m8a-v411-phase-b-layout.css`:

```css
--m8a-v411-state-active: var(--m8a-v411-ui-active);
--m8a-v411-state-warning: var(--m8a-v411-ui-w5-warning);
--m8a-v411-state-disabled: #5a6470;
--m8a-v411-state-neutral: var(--m8a-v411-ui-panel);
```

Resolved capture values from `output/m8a-v4.11-impl-phase3/capture-manifest.json`:

```text
active: #00b8d4
warning: #ff6b3d
disabled: #5a6470
neutral: #0e1223
```

## §3 Orbit tokens preserved

Orbit token definitions remained:

```css
--m8a-v411-orbit-leo: var(--m8a-v411-ui-amber);
--m8a-v411-orbit-meo: var(--m8a-v411-ui-mint);
--m8a-v411-orbit-geo: var(--m8a-v411-ui-cyan);
```

Backed by unchanged base token values:

```css
--m8a-v411-ui-amber: #FBBF24;
--m8a-v411-ui-mint: #5EEAD4;
--m8a-v411-ui-cyan: #38BDF8;
```

Resolved capture values:

```text
orbitLeo: #fbbf24
orbitMeo: #5eead4
orbitGeo: #38bdf8
```

## §4 Token gates

State token definitions:

```text
$ rg -n -- "--m8a-v411-state-(active|warning|disabled|neutral)" src/styles/m8a-v411-phase-b-layout.css
25:  --m8a-v411-state-active: var(--m8a-v411-ui-active);
26:  --m8a-v411-state-warning: var(--m8a-v411-ui-w5-warning);
27:  --m8a-v411-state-disabled: #5a6470;
28:  --m8a-v411-state-neutral: var(--m8a-v411-ui-panel);
```

Raw hex outside the central token file:

```text
$ rg -n "#[0-9a-fA-F]{3,6}" src/styles -g 'm8a-v411-*.css' -g '!m8a-v411-phase-b-layout.css'
<no matches; exit 1>
```

Raw hex inside the central token file only:

```text
$ rg -n "#[0-9a-fA-F]{3,6}" src/styles -g 'm8a-v411-phase-b-layout.css'
src/styles/m8a-v411-phase-b-layout.css:5:  --m8a-v411-ui-canvas: #020617;
src/styles/m8a-v411-phase-b-layout.css:6:  --m8a-v411-ui-panel: #0E1223;
src/styles/m8a-v411-phase-b-layout.css:7:  --m8a-v411-ui-panel-raised: #111827;
src/styles/m8a-v411-phase-b-layout.css:8:  --m8a-v411-ui-steel: #1E293B;
src/styles/m8a-v411-phase-b-layout.css:9:  --m8a-v411-ui-border: #334155;
src/styles/m8a-v411-phase-b-layout.css:10:  --m8a-v411-ui-text: #F8FAFC;
src/styles/m8a-v411-phase-b-layout.css:11:  --m8a-v411-ui-text-muted: #CBD5E1;
src/styles/m8a-v411-phase-b-layout.css:12:  --m8a-v411-ui-text-dim: #94A3B8;
src/styles/m8a-v411-phase-b-layout.css:13:  --m8a-v411-ui-active: #00b8d4;
src/styles/m8a-v411-phase-b-layout.css:14:  --m8a-v411-ui-amber: #FBBF24;
src/styles/m8a-v411-phase-b-layout.css:15:  --m8a-v411-ui-amber-strong: #D97706;
src/styles/m8a-v411-phase-b-layout.css:16:  --m8a-v411-ui-cyan: #38BDF8;
src/styles/m8a-v411-phase-b-layout.css:17:  --m8a-v411-ui-mint: #5EEAD4;
src/styles/m8a-v411-phase-b-layout.css:18:  --m8a-v411-ui-danger: #ff5252;
src/styles/m8a-v411-phase-b-layout.css:19:  --m8a-v411-ui-warning: #ff5252;
src/styles/m8a-v411-phase-b-layout.css:20:  --m8a-v411-ui-w5-warning: #ff6b3d;
src/styles/m8a-v411-phase-b-layout.css:21:  --m8a-v411-ui-on-accent: #04111A;
src/styles/m8a-v411-phase-b-layout.css:27:  --m8a-v411-state-disabled: #5a6470;
```

Ownership gates:

```text
$ rg -n "m8a-v411-orbit[^\n]*(disabled|not-allowed|aria-disabled)|disabled[^\n]*m8a-v411-orbit" src/styles/m8a-v411-*.css
<no matches; exit 1>

$ rg -n "m8a-v411-state[^\n]*(orbit|leo|meo|geo)|orbit[^\n]*m8a-v411-state" src/styles/m8a-v411-*.css
<no matches; exit 1>
```

Reduced motion:

```text
node /tmp/m8a_v411_phase3_capture.mjs
check: reduced-motion-preserves-w4-candidate-state-without-entry-pulse
```

## §5 Screenshots

Phase 3 required captures:

- `output/m8a-v4.11-impl-phase3/w1-default-1440x900.png`
- `output/m8a-v4.11-impl-phase3/w2-default-1440x900.png`
- `output/m8a-v4.11-impl-phase3/w4-candidate-1440x900.png`
- `output/m8a-v4.11-impl-phase3/w5-default-1440x900.png`
- `output/m8a-v4.11-impl-phase3/capture-manifest.json`

Phase 2 re-capture:

- `output/m8a-v4.11-impl-phase2/inspector-header-detail-1440x900.png`

The Phase 2 crop now shows the boundary header strip (`13-actor demo` + `operator-family precision`), validation badge (`Validation status: TBD`), and 3 tabs (`Decision` / `Metrics` / `Evidence`).

## §6 Smoke Softening Disclosure

One smoke assertion was intentionally softened for token-name discipline:

```text
Conv 3: spec v2 §6.5 migrates W5 warning assertions from a raw hex literal to --m8a-v411-state-warning; orbit identity colors are preserved.
```

Updated file:

- `tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs`

The smoke now resolves `--m8a-v411-state-warning` in browser CSS and compares the W5 warning chip computed border color to the resolved token instead of asserting a raw hex literal.

## §7 Validation log

Final smoke matrix result: all green.

```text
npm run build
npm run test:m8a-v4.11:slice1
npm run test:m8a-v4.11:slice2
npm run test:m8a-v4.11:slice3
npm run test:m8a-v4.11:slice4
npm run test:m8a-v4.11:slice5
npm run test:m8a-v4.11:slice6
npm run test:m8a-v4.11:conv1
npm run test:m8a-v4.11:conv2
npm run test:m8a-v4.11:conv3
npm run test:m8a-v4.11:conv4
npm run test:m8a-v4.11:correction-a-phase-b
npm run test:m8a-v4.11:correction-a-phase-c
npm run test:m8a-v4.11:correction-a-phase-d
npm run test:m8a-v4.11:correction-a-phase-e
npm run test:m8a-v4.10:slice1
npm run test:m8a-v4.10:slice2
npm run test:m8a-v4.10:slice3
npm run test:m8a-v4.10:slice4
npm run test:m8a-v4.10:slice5
npm run test:m8a-v4.9
npm run test:m8a-v4.8
npm run test:m8a-v4.7.1
node /tmp/m8a_v411_phase3_capture.mjs
```

Notes:

- Vite's existing bundle-size and `protobufjs` direct-eval warnings remained warnings only.
- Phase 3 capture output confirmed all required 1440x900 images plus the Phase 2 header crop.

## §8 Scope guards

Confirmed unchanged for Phase 3:

- No reviewer mode runtime, replay state machine, or pause behavior was changed.
- No narrow/tablet CSS redesign, drawer, or modal work was performed.
- No Phase 1 disabled tile copy or hookpoint text was changed.
- No Phase 2 tab structure was changed; it remains exactly 3 tabs and no `Boundary` tab.
- No Phase 2 boundary strip selector or validation badge text was changed.
- No production DOM elements or visible text were added for Phase 3.
- Route, endpoint pair, precision boundary, actor set, V4.6D model, R2 provenance, and Slice 6 transcripts were not changed for Phase 3.
- `leo-beam-sim` source was not modified.
- Orbit token values remained unchanged.

## §9 Visual quality estimate

Self-honest estimate after Phase 3: 7.6/10.

State channel separation improves the read of active/focus/warning/disabled accents, W2/W5 warning language is less confused with orbit identity, and the corrected header crop is a more faithful artifact. Remaining visual debt is still structural: the inspector is dense, and the broader reviewer-mode and narrow/tablet presentation work remains intentionally deferred to Phase 4.
