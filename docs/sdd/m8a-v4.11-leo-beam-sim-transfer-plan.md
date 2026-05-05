# M8A V4.11 Leo Beam Sim Transfer Plan

Status: transfer plan only. This document audits leo-beam-sim's visual-clarity redesign and extracts transferable principles for a later V4.11 second visual pass. It does not authorize implementation and does not change V4.11 runtime, CSS, smoke tests, DOM, or leo-beam-sim files.

Scope note: V4.11 visible copy is intentionally not reproduced here. V4.11 mappings use structural names only, such as left decision rail, top scope/time strip, sequence rail, inspector tabs, endpoint chip, footer chips, transition toast, and scene cue.

## §0 Skill Audit Log

| Skill | Queries / sections used | One-line summary for leo-beam-sim |
| --- | --- | --- |
| `ui-ux-pro-max` | Required searches: `telemetry mission ops dashboard dark accent` in `product`; `monospace metric large number caps label` in `typography`; `solid panel border accent dark dashboard figure ground` in `style`; `information hierarchy card chunking bento` in `ux`; `telemetry tabular numeric pairing` in `typography`. Also used SKILL quick-reference rules for contrast, color-not-only, semantic tokens, tabular numbers, focus states, reduced motion, and transform-only motion. | leo-beam-sim matches dark, data-dense mission telemetry patterns and uses strong role semantics; it diverges from glass/HUD defaults by using more solid panels, which is correct for readability over a globe. |
| `frontend-design` | Read `Design Thinking`, aesthetic direction, generic-AI avoidance, and implementation-complexity matching sections in `/home/u24/.codex/skills/frontend-design/SKILL.md`. | leo-beam-sim committed to a high-contrast orbital telemetry / industrial mission-ops family instead of a generic dark dashboard, then expressed that family through caps mono labels, semantic accents, dense micro-data, and restrained scene motion. |
| `frontend-ui-engineering` | Read component colocation, focused components, state placement, spacing scale, semantic color tokens, accessibility, focus management, loading/error/empty-state expectations, and red-flag checklist in `/home/u24/.codex/skills/frontend-ui-engineering/SKILL.md`. | leo-beam-sim has good production signals in shared tokens, ARIA on many controls, visible focus classes, and reduced-motion plumbing for beam effects, but still carries large component files and many raw inline color literals. |

Search detail:

- `telemetry mission ops dashboard dark accent --domain product`: matched dark/data-dense dashboards, space-tech/HUD, real-time monitoring, 3D/simulation surfaces, and alert/accent color conventions.
- `monospace metric large number caps label --domain typography`: matched Terminal CLI Monospace and Brutalist Raw references; both support monospaced, precise, technical labeling.
- `solid panel border accent dark dashboard figure ground --domain style`: matched Modern Dark and Dark Mode (OLED), with border hairlines, dark elevated surfaces, high contrast, visible focus, and minimal glow.
- `information hierarchy card chunking bento --domain ux`: produced hierarchy and color-only warnings rather than a bento-specific mandate; the useful transfer is chunking by meaning, not decorative card grids.
- `telemetry tabular numeric pairing --domain typography`: returned no direct match. For numeric telemetry, use the `ui-ux-pro-max` SKILL quick-reference rule `number-tabular`: tabular/monospaced figures for data columns and timers.

## §1 Forensic Audit Summary

### ui-ux-pro-max Lens

- Product fit: leo-beam-sim's post-redesign direction fits the search result family `Dark Mode (OLED) + Data-Dense` and space-tech real-time monitoring. The source SDD explicitly calls for "a high-contrast orbital telemetry console" in `/home/u24/papers/project/leo-beam-sim/docs/frontend-ux-redesign-sdd.md`.
- Typography fit: the redesign uses caps, mono, dense labels, and large numeric readouts. `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` defines `body: 16`, `readout: 30`, `signal: 32`, and a mono family.
- Hierarchy fit: the visual-clarity proposal does not solve clutter by adding more color. It says, "先減量，再分層，最後才是配色" in `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/README.md`.
- Accessibility fit is partial: `/home/u24/papers/project/leo-beam-sim/src/styles/main.scss` defines focus variables and `:focus-visible` outlines, and `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/visual-clarity-sdd/contracts.md` requires `prefers-reduced-motion`; however, large inline-style surfaces and scene effects still need audit before direct transfer.

Grounding quote from skill/search: `ui-ux-pro-max` says `color-not-only` means "Don't convey info by color alone (add icon/text)."

### frontend-design Lens

- Aesthetic family: leo-beam-sim chose mission-ops / industrial orbital telemetry, not editorial, marketing, or generic glassmorphism. `/home/u24/papers/project/leo-beam-sim/docs/frontend-ux-redesign-sdd.md` says the interface should be a "space-tech/scientific simulation dashboard, not generic glassmorphism."
- Concrete expression: solid dark panels, hairline borders, luminous cyan/amber/violet role accents, caps mono headers, technical identity chips, and large signal numbers express the family consistently.
- Distinctive concept: the three-tier channel model gives the scene a memorable visual grammar. `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/README.md` assigns Tier 1 to event role, Tier 2 to satellite identity, and Tier 3 to frequency.
- Design risk: the `vc4a-post-slice-duel-card` checkpoint shows that dense telemetry cards can collapse into cramped columns if not given enough width; V4.11 should borrow the hierarchy, not the exact card proportions.

Grounding quote from skill: `frontend-design` says, "Choose a clear conceptual direction and execute it with precision."

### frontend-ui-engineering Lens

- Tokenization is real but incomplete: `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` centralizes text, surface, border, semantic, spacing, radius, type, and shadow tokens; `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts` centralizes role, frequency, satellite tint, line width, opacity, dash, and pulse values.
- Raw literals still remain in components: `/home/u24/papers/project/leo-beam-sim/src/ui/InfoPanel.tsx`, `/home/u24/papers/project/leo-beam-sim/src/ui/SignalTuningPanel.tsx`, and `/home/u24/papers/project/leo-beam-sim/src/ui/ControlBar.tsx` still use many inline `rgba(...)` and hex values.
- Accessibility signals are strong in specific controls: `ControlBar.tsx` uses `aria-label` for mode/spotlight controls; `SignalTuningPanel.tsx` uses `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, and control `aria-label`s; `InfoPanel.tsx` exposes handover trigger state with `role="progressbar"` and ARIA values.
- Architecture risk is documented by leo-beam-sim itself: `/home/u24/papers/project/leo-beam-sim/docs/agent-readability-audit.md` flags very large files, including `SignalTuningPanel.tsx`, `InfoPanel.tsx`, `MainScene.tsx`, and `useSimulation.ts`.

Grounding quote from skill: `frontend-ui-engineering` says, "Use semantic color tokens: `text-primary`, `bg-surface`, `border-default` — not raw hex values."

## §2 Transferable Principles

| Principle | leo-beam-sim execution | Skill rationale | V4.11 mapping |
| --- | --- | --- | --- |
| 1. Commit to a specific product family before styling individual widgets. | `/home/u24/papers/project/leo-beam-sim/docs/frontend-ux-redesign-sdd.md` frames the product as a high-contrast orbital telemetry console; checkpoints show mission-style surfaces, not generic cards. | `frontend-design`: "Choose a clear conceptual direction and execute it with precision." `ui-ux-pro-max` product search matched dark/data-dense and space-tech monitoring patterns. | Keep V4.11 in the industrial mission-ops family already named by the visual-pass spec. Do not add decorative glass, marketing hero patterns, or unrelated dashboard idioms in the second pass. |
| 2. Use solid figure-ground panels for readable overlays on a moving globe. | `UI_TOKENS.color.surface.panel` and `tuningPanel` in `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` use dark near-opaque gradients; the visual SDD rejects generic gray glass for primary reading. | `ui-ux-pro-max` style search matched Modern Dark / OLED guidance: high contrast, hairline borders, minimal glow. `frontend-ui-engineering` requires sufficient contrast. | Rail, inspector, top strip, footer chips, and cue surfaces should remain solid or near-solid with a single border token. Reserve transparency for small scene callouts only. |
| 3. Assign each visual channel one owner: state, identity, or secondary data. | `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/visual-clarity-sdd/contracts.md` says channels are decomposed so each pixel surface has "exactly one tier owner." `/home/u24/papers/project/leo-beam-sim/src/viz/SatelliteBeams.tsx` separates `discFillColor`, `satelliteTintColor`, inner role ring, glyph, and swatch. | `ui-ux-pro-max`: `color-not-only`; `frontend-ui-engineering`: semantic tokens instead of raw hex. | For sequence rail, endpoint chips, inspector badges, and scene cue, assign state to border/accent, orbit or endpoint identity to label/glyph, and supporting category/source data to muted text or small swatch. |
| 4. Let event state win; demote frequency/category data to background channels. | `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts` caps event-role disc opacity with `Math.min(base.discOpacity, 0.18)` and keeps `frequencySwatchColor` available for callouts. The proposal states "Tier 1 必須贏." | `ui-ux-pro-max`: hierarchy via size, spacing, and contrast, not color alone. Product search supports alert/accent colors on dark monitoring surfaces. | V4.11 current/candidate/fallback states should not compete with orbit family, source provenance, or evidence category colors. Use one dominant state accent per surface, with secondary data reduced to chip/swatch/text. |
| 5. Use identical identity strings across scene and panels. | `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/visual-clarity-sdd/phase-1-identity-first.md` requires one canonical identity across scene and panel. `/home/u24/papers/project/leo-beam-sim/src/viz/SatelliteBeams.tsx` builds `identityLine` from the same beam token used in callouts. | `ui-ux-pro-max` UX search emphasized information hierarchy; `frontend-ui-engineering` accessibility rules require labels for non-obvious controls and readable text, not hidden hover-only meaning. | Endpoint chips, globe labels, inspector rows, footer chips, and sequence rail labels should use the same identity token vocabulary. Avoid alternate names for the same endpoint across surfaces. |
| 6. Build first-read surfaces as scan rails, not prose panels. | `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/side-panel-decluttering.md` recommends a handover duel card, collapsed debug/detail content, and mode separation. `/home/u24/papers/project/leo-beam-sim/src/ui/InfoPanel.tsx` implements `MetricTile`, `DuelCard`, and grouped formula terms. | `ui-ux-pro-max` UX query maps to hierarchy and chunking; `frontend-design` requires visual choices to express the product purpose. | The V4.11 left rail should stay a fast scan surface: current state, candidate/fallback relation, timing/quality class, and one next-action cue. Put explanations and evidence in the inspector, not the rail. |
| 7. Treat telemetry numbers as instruments: mono/tabular, stable, and visibly larger than labels. | `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` sets `body: 16`, `formula: 24`, `delta: 25`, `readout: 30`, and `signal: 32`; the source SDD calls for primary numeric readouts of `30px` or larger. | `ui-ux-pro-max` typography search matched Terminal CLI Monospace for precision; its `number-tabular` rule requires tabular/monospaced figures for timers and data columns. | Countdown, replay speed, scope timing, quality classes, and metric values should use tabular numeric rendering and a data font. Do not let changing digits resize rail or inspector rows. |
| 8. Motion must explain state, then yield to reduced-motion. | `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts` gives role pulses specific periods/amplitudes; `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/visual-clarity-sdd/contracts.md` says every animation-driven slice must consult `runtime.reducedMotion`. | `ui-ux-pro-max`: animation should be 150-300ms, meaningful, transform/opacity only, and reduced-motion aware. | Transition toast and scene cue should be short, non-critical, transform/opacity based, and disabled or made static under reduced motion. A stable candidate halo is safer than continuous alarm-like pulsing. |
| 9. Screenshot fidelity is insufficient without accessibility regression gates. | `/home/u24/papers/project/leo-beam-sim/src/styles/main.scss` defines `.leo-ui-*:focus-visible` outlines; `SignalTuningPanel.tsx` and `InfoPanel.tsx` include tab/progressbar semantics; the SDD requires reduced-motion fixtures. | `ui-ux-pro-max` lists contrast, focus states, keyboard navigation, aria labels, no hover-only critical info, and reduced motion as critical/high-priority rules. | After any V4.11 transfer, validate keyboard order, tab ARIA, focus rings, icon-only labels, contrast over globe imagery, no hover-only required information, and reduced-motion behavior in addition to screenshot review. |
| 10. Centralize tokens before porting visual language. | leo-beam-sim has `UI_TOKENS`, `UI_CLASSES`, and `BEAM_ROLE_TOKENS`, but its own audit flags large files and raw inline color literals in `/home/u24/papers/project/leo-beam-sim/src/ui/InfoPanel.tsx` and `SignalTuningPanel.tsx`. | `frontend-ui-engineering`: use semantic color tokens, consistent spacing scale, focused components; `ui-ux-pro-max`: `color-semantic` says not to use raw hex in components. | Keep V4.11's token block as the receiving surface. Any later runtime/UI changes should introduce named role/endpoint/source tokens first, then apply them to rail, inspector, toast, and scene labels. |

## §3 Direct Transfer Items

No direct transfer is performed in this task. The following leo-beam-sim items are candidates for later porting with minimal conceptual change, subject to license/attribution approval.

License note: `/home/u24/papers/project/leo-beam-sim/package.json` declares `"license": "ISC"` and an empty author field. No standalone `LICENSE`, `COPYING`, or `NOTICE` file was found at max depth 2. If exact source, exact token values, or exact class patterns are copied, V4.11 should preserve the ISC notice/copyright terms in the agreed project location. If control does not approve direct copying, derive equivalent tokens and document the derivation.

| Candidate item | leo-beam-sim source | Proposed V4.11 destination | Transfer note |
| --- | --- | --- | --- |
| Focus-ring variables and shared focus classes: `--leo-focus-ring`, `--leo-focus-ring-shadow`, `.leo-ui-button`, `.leo-ui-select`, `.leo-ui-range`, `.leo-ui-checkbox`, `.leo-ui-toggle-chip`, `.leo-ui-tab-button`. | `/home/u24/papers/project/leo-beam-sim/src/styles/main.scss`; `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` `UI_CLASSES`. | Future expansion of `/home/u24/papers/scenario-globe-viewer/src/styles/m8a-v411-phase-b-layout.css` or `/home/u24/papers/scenario-globe-viewer/src/styles/m8a-v411-visual-tokens.css`. | Port the class pattern and outline/shadow behavior, not necessarily the exact cyan color. V4.11 should map focus color to its own semantic token. |
| Surface, text, border, semantic, spacing, radius, type, and shadow token structure. | `/home/u24/papers/project/leo-beam-sim/src/constants/uiTokens.ts` `UI_TOKENS`. | `/home/u24/papers/scenario-globe-viewer/src/styles/m8a-v411-phase-b-layout.css` token block, or a future V4.11 token module if runtime work is authorized. | The structure transfers cleanly; exact hex/rgba values should be reconciled against V4.11's existing amber/cyan/mint/on-accent palette. |
| Role token schema: `color`, `lineWidth`, `coneOpacity`, `discOpacity`, `endpointRadius`, `endpointFilled`, `dashed`, `pulse`, `calloutGlowPx`, `markerScale`. | `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts` `BEAM_ROLE_TOKENS`. | Future V4.11 scene/state token module; CSS-only analog can live in `/home/u24/papers/scenario-globe-viewer/src/styles/m8a-v411-visual-tokens.css`. | Useful for V4.11 current/candidate/fallback/boundary states. Keep the schema; remap names and values to V4.11 authority/state semantics. |
| Secondary palettes: `BEAM_FREQUENCY_COLORS` and `SATELLITE_TINT_PALETTE`. | `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts`. | Future endpoint/orbit/source identity token module; CSS custom properties if scene remains CSS-driven. | Do not blindly adopt the colors. Use the palette concept: role colors dominate, identity tints stay orthogonal, secondary category colors stay lower emphasis. |
| Reduced-motion role pulse envelope: `BEAM_PULSE_SPECS` plus `reducedMotion` bypass. | `/home/u24/papers/project/leo-beam-sim/src/constants/beamRoleTokens.ts`; `/home/u24/papers/project/leo-beam-sim/docs/visual-clarity-proposal/visual-clarity-sdd/contracts.md`. | `/home/u24/papers/scenario-globe-viewer/src/styles/m8a-v411-transition-toast.css` and any future scene cue module. | Port the gating rule. Avoid exact pulse timings unless V4.11 control approves them for its replay cadence. |
| Scene callout anatomy: border-left role accent, owner/glyph chip, identity line, frequency/category swatch, dense metric micro-row. | `/home/u24/papers/project/leo-beam-sim/src/viz/SatelliteBeams.tsx` `BeamCalloutContent`. | Future V4.11 scene label/cue CSS and endpoint-chip component. | Transfer as anatomy only. Do not copy leo visible labels or V4.11 visible text. |
| Glyph abstraction: `triangle`, `diamond`, `circle`, `star`, and symbol mapping. | `/home/u24/papers/project/leo-beam-sim/src/viz/glyphs.ts`. | Future V4.11 endpoint identity glyph module if runtime changes are authorized. | Useful when color cannot carry identity alone. Direct code copy needs ISC attribution handling. |
| Cover/priority rule for overlapping visual actors. | `/home/u24/papers/project/leo-beam-sim/src/viz/EarthFixedCells.tsx` `CELL_COVER_ROLE_PRIORITY`. | Future V4.11 sequence rail and endpoint overlap policy documentation or token module. | Transfer the priority idea: current/active state wins, candidate/fallback next, ambient evidence last. |
| Metric tile and progressbar semantics. | `/home/u24/papers/project/leo-beam-sim/src/ui/InfoPanel.tsx` `MetricTile`, `DuelCard`, and `role="progressbar"` trigger progress. | Future V4.11 inspector/rail component work, not this doc-only pass. | Transfer the accessible structure: label, stable value, semantic progress, and visible supporting metadata. |

## §4 V4.11-Only Adjustments

### 5-State Sequence Rail

Apply Principles 3, 4, 7, 8, and 9. Treat each rail state as a fixed-size instrument slot. State owns accent/border/weight; order owns position; time/quality owns tabular numeric text; supporting category/source data stays muted. Current/candidate/fallback-like states need text or glyph backup, not color-only encoding. Motion should be a short state transition, not persistent vibration, and reduced-motion should show static state changes.

### Per-Orbit Ground-Station Endpoint Chip

Apply Principles 3 and 5. Use a three-part chip grammar: state accent on border or left rule, endpoint/orbit identity in the main label/glyph, and source/category evidence as a small muted swatch or sublabel. The same endpoint identity vocabulary must appear in globe labels, inspector rows, footer chips, and sequence rail references.

### 4-Tab Decision / Metrics / Boundary / Evidence Inspector

Apply Principles 2, 6, 7, 9, and 10. The inspector should stay a solid raised panel with keyboard-reachable tabs, visible focus, stable tab hit targets, and no cards inside cards. Use section rows, compact modules, and tabular data. Evidence can be dense, but critical decision state must remain visible outside hover-only surfaces. Any added color should come from inspector semantic tokens, not raw per-row literals.

### Correction A Left Handover Decision Rail

Apply Principles 1, 4, 6, and 7. The left rail is the first-read scan surface. It should show state hierarchy through one active accent, weight, spacing, and stable numeric readouts. It should not become a mini inspector; explanations, source lineage, and boundary caveats belong in the right inspector or footer disclosure.

### Top Scope / Time Strip

Apply Principles 2, 5, 7, and 10. Keep it as a compact, solid instrument strip. Scope labels, time, replay speed, and demo boundary should be consistently named across inspector/footer references. Numeric fields should use tabular figures and stable widths. Avoid any styling that implies live production truth or measured values outside the V4.11 evidence contract.

### Transition Toast / Scene Cue

Apply Principles 4, 8, and 9. Toasts and scene cues may confirm a transition but must not carry the only critical information. Use transform/opacity animations, a short lifecycle, `aria-live="polite"` if announced, and reduced-motion static behavior. Scene cue color should follow the state token; it should not introduce a new alarm hue unless the state is actually warning/error.

## §5 Skill-Protected Regression List

These are not carried by screenshots; they must be verified after any later transfer.

- Contrast: normal text at least 4.5:1, large text and non-text data marks at least 3:1, measured over actual globe/screenshot backgrounds where overlays are translucent.
- Focus rings: visible on inspector tabs, Details/source controls, speed controls, footer chips, rail buttons, and any icon-only or glyph-only control.
- Keyboard navigation: tab order follows visual order; tablists expose `aria-selected`/`aria-controls`; no focus trap in inspector, toast, source disclosure, or popover.
- Accessible labels: every icon-only, glyph-only, or swatch-only interactive control has `aria-label` or visible text.
- No hover-only critical information: hover popovers may explain, but state, decision, source boundary, and unavailable-data status must be reachable without hover.
- Reduced motion: transition toast, scene cue, candidate halo, pulse/ripple, and panel transitions respect `prefers-reduced-motion`.
- Color not only: state uses at least one backup channel: text, glyph, border weight, shape, pattern, position, or ARIA state.
- Tabular numeric telemetry: time, countdown, replay speed, quality classes, metric values, and sequence timing use stable-width/tabular figures.
- Token discipline: no new raw hex/rgba in component bodies or per-window CSS; add semantic variables first.
- Motion discipline: no width/height/top/left animations that cause layout shift; use transform/opacity.
- Responsive fit: 390px mobile and 1280x720 overlap checks must avoid horizontal scroll, clipped tabs, hidden critical controls, and text overflowing chip/rail bounds.
- Touch targets and disabled states: controls remain operable on mobile; disabled states use native semantics or ARIA plus visible disabled styling.

## §6 Open Questions for Control

1. License and attribution: `leo-beam-sim/package.json` declares ISC, but no standalone license/notice file was found in the checked depth. Should V4.11 permit exact token/source transfer, and where should ISC attribution be retained?
2. Accent palette: should V4.11 adopt leo-beam-sim's cyan/amber/violet role accent family, or preserve V4.11's current industrial amber/cyan/mint palette and only transfer the hierarchy rules?
3. Fonts: should V4.11 keep its current UI/data font choices, adopt a JetBrains/Fira-style data font, or use leo-beam-sim's generic `monospace` fallback only as a constraint?
4. Inspector width: V4.11 visual-pass handoff notes a practical 320px inspector cap, while the Correction A plan suggests a wider ideal. Should the second pass target width relief, content reduction, or both?
5. Runtime scope: should later V4.11 work introduce scene glyph/tint/spine identity channels, or remain CSS-only around existing DOM and scene actors?
6. Motion policy: what is the maximum allowed cue duration and repetition for V4.11 candidate/transition feedback, especially under reduced-motion and replay-speed changes?
7. Boundary/evidence density: should unavailable or modeled-only metrics be grouped into a single boundary module, or repeated near each affected metric for comprehension?
8. Direct-transfer threshold: should future implementers copy exact leo-beam-sim classes/tokens where useful, or treat every item as derived design guidance to avoid cross-project coupling?
