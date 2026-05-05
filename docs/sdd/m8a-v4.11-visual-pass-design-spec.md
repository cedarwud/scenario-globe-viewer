# M8A V4.11 Visual Pass Design Spec

Date: 2026-05-05

Status: Phase 1 design spec. No runtime or smoke contract change is authorized by this file.

Scope: visual execution layer only for the M8A V4.11 Correction A distributed operator console. Functional state, route, pair, precision, actor set, V4.6D model, R2 posture, reviewer evidence, DOM selectors, data attributes, and smoke invariants remain unchanged.

## 0. Aesthetic Direction

Chosen aesthetic family: **industrial mission-ops console**.

Visual thesis: a matte, instrument-grade command surface wrapped around the Cesium globe: solid steel panels, high-contrast instrument text, amber/mint/sky status accents, restrained shadows, and zero decorative dashboard noise.

Reference examples:

- NASA Eyes / DSN Now as the spatial reference: the globe remains the primary visual object, and UI exists as operational annotation around it.
- Apollo Mission Control / industrial MCC panels as the material reference: dense but legible rows, physical-console contrast, clear state boundaries.
- Grafana ops only as an information-density reference: status chips and monitoring hierarchy, not as a generic dark-card dashboard style.

Reason this fits satellite operator review:

- The SDD describes a distributed operator console, not a generic analytics dashboard. A mission-ops console lets the top scope strip, left handover rail, inspector, countdown, and footer chips each carry a distinct operational job.
- The reviewer needs to understand boundaries and modeled classes quickly. Industrial paneling supports "this is an instrument with constraints" better than glossy dark-theme cards.
- Cesium's black starfield is already high-texture. Solid or near-solid panels preserve figure-ground separation; translucent glass is reserved only for small scene callouts.

frontend-design evidence used:

> "Before coding, understand the context and commit to a BOLD aesthetic direction"

> "Choose a clear conceptual direction and execute it with precision"

> "NEVER use generic AI-generated aesthetics like overused font families ... predictable layouts and component patterns"

Rejected direction:

- Generic dark dashboard / grey text / equal card stack. The current screenshots already show this failure mode: every region has similar dark fill, similar 14px text, and similar card boundaries, so hierarchy collapses.

## 1. Color Palette

Token source:

- `ui-ux-pro-max` color query: `operator dashboard contrast accessible dark industrial mission ops`
- Selected basis: `colors.csv` Result 1, Financial Dashboard, because it returns the closest data-dense dark-ops palette: dark background, elevated card, muted foreground, border, and status green.
- Supporting basis: Result 2, Smart Home/IoT Dashboard, for "dark tech + status green"; Result 7, Analytics Dashboard, for amber highlight adjusted for WCAG.

ui-ux-pro-max evidence:

> "Dark bg + green positive indicators"

> "Dark tech + status green"

> "Blue data + amber highlights [Accent adjusted from #F59E0B for WCAG 3:1]"

Planned CSS custom properties:

| Token | Value | Use |
| --- | --- | --- |
| `--m8a-v411-ui-canvas` | `#020617` | page and panel deep base from color Result 1 |
| `--m8a-v411-ui-panel` | `#0E1223` | primary solid overlay panel |
| `--m8a-v411-ui-panel-raised` | `#111827` | inspector and rail raised panel |
| `--m8a-v411-ui-steel` | `#1E293B` | selected tab, strong chip, button surface |
| `--m8a-v411-ui-border` | `#334155` | structural 1px borders |
| `--m8a-v411-ui-text` | `#F8FAFC` | primary text |
| `--m8a-v411-ui-text-muted` | `#CBD5E1` | secondary text, not low-contrast grey |
| `--m8a-v411-ui-text-dim` | `#94A3B8` | tertiary evidence rows only |
| `--m8a-v411-ui-amber` | `#FBBF24` | active/current/candidate emphasis |
| `--m8a-v411-ui-amber-strong` | `#D97706` | solid warning/control fill with dark text |
| `--m8a-v411-ui-cyan` | `#38BDF8` | boundary/source/data accent |
| `--m8a-v411-ui-mint` | `#5EEAD4` | modeled continuity / available state accent |
| `--m8a-v411-ui-danger` | `#F87171` | unavailable / warning accent when text also states condition |
| `--m8a-v411-ui-w5-warning` | `#ff6b3d` | Conv3 smoke-preserved W5 warning chip border/text |
| `--m8a-v411-ui-on-accent` | `#04111A` | text on amber/mint filled accents |

WCAG AA contrast verification:

| Pair | Ratio | Result |
| --- | ---: | --- |
| text `#F8FAFC` on panel `#0E1223` | 17.77:1 | AA pass |
| muted `#CBD5E1` on panel `#0E1223` | 12.52:1 | AA pass |
| dim `#94A3B8` on panel `#0E1223` | 7.25:1 | AA pass |
| amber `#FBBF24` on panel `#0E1223` | 11.14:1 | AA pass |
| amber strong `#D97706` on panel `#0E1223` | 5.84:1 | AA pass |
| cyan `#38BDF8` on panel `#0E1223` | 8.68:1 | AA pass |
| mint `#5EEAD4` on panel `#0E1223` | 12.57:1 | AA pass |
| danger `#F87171` on panel `#0E1223` | 6.72:1 | AA pass |
| W5 warning `#ff6b3d` on panel `#0E1223` | 6.57:1 | AA pass |
| on-accent `#04111A` on mint `#5EEAD4` | 12.90:1 | AA pass |
| on-accent `#04111A` on amber `#FBBF24` | 11.43:1 | AA pass |
| on-accent `#04111A` on amber-strong `#D97706` | 5.99:1 | AA pass |

Implementation rule:

- White text must not be used on `--m8a-v411-ui-amber-strong`; it only reaches 3.19:1. Use `--m8a-v411-ui-on-accent`.
- Color is never the only state indicator. Existing visible text such as orbit class, boundary wording, source labels, and modeled/unavailable statements remains the primary meaning.

## 2. Typography Scale

Token source:

- `ui-ux-pro-max` typography query: `technical mono sans telemetry dashboard precision`
- Selected basis: `typography.csv` Result 1, Dashboard Data.
- Supporting basis: Result 4, Developer Mono, for data/mono use on precise technical labels.
- The initial `--design-system` output recommended Inter for both heading and body. That is rejected for this pass because `frontend-design` warns against generic default font choices, and the app already needs Chinese text coverage.

ui-ux-pro-max evidence:

> "Dashboard Data"

> "Fira family cohesion. Code for data, Sans for labels."

> "JetBrains for code, IBM Plex for UI. Developer-focused."

Font-family pairing:

- UI/body: `"Fira Sans", "Noto Sans TC M8A V411 Subset", "Noto Sans TC", "Source Han Sans TC", system-ui, sans-serif`
- Data/numeric/chips: `"Fira Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace`
- CJK fallback remains the existing bundled Noto subset. No remote font import is required for this pass.

Scale:

| Role | Size | Weight | Line height | Use |
| --- | ---: | ---: | ---: | --- |
| Primary body | 16-18px | 500-650 | 1.38-1.5 | left rail slot text, inspector body, decision evidence |
| Secondary | 13-14px | 500-650 | 1.28-1.45 | labels, top strip, footer chip content |
| Metric / state number | 24-32px | 700-820 | 1.05-1.15 | countdown primary value, major state counters if exposed |
| Chip / micro label | 11-12px | 650-780 | 1.0-1.18 | orbit chips, source chips, sequence rail details |

Implementation rules:

- Use tabular numeric rendering for timers and replay time via `font-variant-numeric: tabular-nums`.
- Keep `letter-spacing: 0`; do not add tracking as a shortcut for "technical" styling.
- Avoid 10px footnote text except existing native Cesium text outside the V4.11 overlay ownership.

## 3. Spacing / Radius / Shadow / Elevation Tokens

ui-ux-pro-max evidence:

> "Use consistent modular scale"

> "Minimum 8px gap between touch targets"

> "Type scale (12 14 16 18 24 32)"

frontend-ui-engineering evidence:

> "Use a consistent spacing scale. Don't invent values"

> "Use semantic color tokens ... not raw hex values"

> "Color ... Ensure sufficient contrast (4.5:1 for normal text, 3:1 for large text)"

Design tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--m8a-v411-space-1` | 4px | tiny inset, chip inner gap |
| `--m8a-v411-space-2` | 8px | standard row gap, button gap |
| `--m8a-v411-space-3` | 12px | panel internal small padding |
| `--m8a-v411-space-4` | 16px | panel padding, rail gap |
| `--m8a-v411-space-5` | 20px | large section gap |
| `--m8a-v411-space-6` | 24px | inspector/rail rhythm |
| `--m8a-v411-radius-xs` | 3px | micro chips |
| `--m8a-v411-radius-sm` | 4px | instrument slots |
| `--m8a-v411-radius-md` | 6px | inspector tabs/buttons |
| `--m8a-v411-radius-lg` | 8px | major panels only |
| `--m8a-v411-shadow-panel` | `0 18px 44px rgba(0, 0, 0, 0.38)` | rail/inspector depth |
| `--m8a-v411-shadow-callout` | `0 12px 26px rgba(0, 0, 0, 0.34)` | countdown/popover/cue |
| `--m8a-v411-shadow-inner` | `inset 0 1px 0 rgba(248, 250, 252, 0.08)` | material top edge |

Layer tokens:

| Token | Value | Use |
| --- | ---: | --- |
| `--m8a-v411-layer-scene-labels` | 2 | orbit / ground chip layer |
| `--m8a-v411-layer-scene-cues` | 3 | scene cue / provenance badge layer |
| `--m8a-v411-layer-callout` | 4 | countdown context chip / transition toast layer |
| `--m8a-v411-layer-footer` | 5 | footer row / fixed Details button / countdown surface |
| `--m8a-v411-layer-hover-popover` | 7 | hover popover layer |
| `--m8a-v411-layer-hud-frame` | 12 | existing HUD frame compatibility layer |
| `--m8a-v411-layer-rail` | 90 | left handover rail |
| `--m8a-v411-layer-top-strip` | 100 | top scope strip |
| `--m8a-v411-layer-inspector` | 110 | Details inspector above top strip when open |

Elevation model:

- Level 0: Cesium globe and satellite overlays.
- Level 1: orbit chips, scene cues, footer chips.
- Level 2: top strip, countdown, sequence rail.
- Level 3: left rail and right inspector.
- Level 4: popover/toast only while transient.

## 4. Surface Redesigns

### 4.1 Top Strip

Purpose: compact scenario scope, replay time, precision, and boundary without becoming a crammed banner.

```text
+--------------------------------------------------------------------------------+
| Scenario Scope  Scope: 13-actor demo...  Time: replay...  Precision... Boundary |
+--------------------------------------------------------------------------------+
     matte canvas, one row when possible, wraps with row-gap only when needed
```

Token mapping:

- Background: `--m8a-v411-ui-canvas`
- Border: `--m8a-v411-ui-border`
- Label text: `--m8a-v411-ui-text-muted`, 13px, 650
- Value text: `--m8a-v411-ui-text`, 14px, 700
- Bottom keyline: `--m8a-v411-ui-amber` at low opacity through tokenized border/shadow
- Spacing: `--m8a-v411-space-2` vertical, `--m8a-v411-space-4` horizontal, group gap `--m8a-v411-space-5`

Implementation note:

- Keep existing text and strip DOM. Use stronger contrast and rhythm, not extra labels.

### 4.2 Left Handover Decision Rail

Purpose: first-read state summary. It should scan like an instrument checklist, not a stack of equal prose cards.

```text
+-----------------------------+
| CURRENT WINDOW              |
| +-------------------------+ |
| | Current: W2 ...         | |
| +-------------------------+ |
| | Candidate: ...          | |
| | Fallback: ...           | |
| | Decision: ...           | |
| | Time/Quality: ...       | |
+-----------------------------+
```

Token mapping:

- Rail background: `--m8a-v411-ui-panel-raised`
- Slot background: `--m8a-v411-ui-panel`
- Slot border: `--m8a-v411-ui-border`
- Active/first slot accent: `--m8a-v411-ui-amber`
- Body text: 16px, `--m8a-v411-ui-text`, line-height 1.38
- Slot padding: `--m8a-v411-space-3`/`--m8a-v411-space-4`
- Radius: `--m8a-v411-radius-sm`
- Shadow: `--m8a-v411-shadow-panel`

Implementation note:

- The DOM only exposes repeated rail slots. Visual differentiation can use `:first-child` and consistent spacing; no text or selector change is needed.

### 4.3 Countdown

Purpose: high-salience modeled time callout without blocking the globe.

```text
                 +---------------------------------+
                 | SERVICE TIME  ~11 min          |
                 | next segment / modeled value    |
                 +---------------------------------+
```

Token mapping:

- Background: near-solid `--m8a-v411-ui-panel`
- Base border: `--m8a-v411-ui-cyan`
- Pressure border/fill accent: `--m8a-v411-ui-amber`
- Hold/reentry border/fill accent: `--m8a-v411-ui-mint` or `--m8a-v411-ui-cyan`
- Primary line: 16px, 800; numeric fragments inherit data font when browser allows
- Appendix: 13px, `--m8a-v411-ui-text-muted`
- Footnote: 11px minimum, `--m8a-v411-ui-text-dim`
- Radius: `--m8a-v411-radius-md`
- Shadow: `--m8a-v411-shadow-callout`

Implementation note:

- Do not add a new metric number. Improve the existing derived-time surface only.

### 4.4 Details Inspector Four-Tab Surface

Purpose: readable right-side inspector with Decision / Metrics / Boundary / Evidence separated by function.

```text
                                      +------------------------------+
                                      | Inspector              Close |
                                      | [Decision] [Metrics]         |
                                      | [Boundary] [Evidence]        |
                                      |------------------------------|
                                      | Selected replay window       |
                                      | MEO continuity hold          |
                                      | Replay UTC ...               |
                                      |------------------------------|
                                      | Decision / Metrics content   |
                                      | short rows, 16px body        |
                                      +------------------------------+
```

Token mapping:

- Inspector background: `--m8a-v411-ui-panel-raised`
- Header/top keyline: `--m8a-v411-ui-amber`
- Tabs inactive: `--m8a-v411-ui-panel`, `--m8a-v411-ui-text-muted`
- Tabs active: `--m8a-v411-ui-steel`, `--m8a-v411-ui-text`
- Source/provenance button: `--m8a-v411-ui-cyan` border, solid hover via `--m8a-v411-ui-steel`
- Module left rule: `--m8a-v411-ui-mint` for modeled/available sections; `--m8a-v411-ui-amber` for caution/derived timing
- Body: 16px, line-height 1.42
- Evidence rows: 12-13px only in Evidence/source rows
- Width: ideal target 390-420px desktop if the inspector contract is reopened.
  Phase 2 of this visual pass must keep the current smoke invariant that caps
  the inspector at 320px; readability improvements therefore come from type,
  spacing, contrast, tabs, and surface treatment rather than a width change.

Implementation note:

- Existing right sheet width is visually tight at 320px, but this pass must not
  change the Slice 3/5 width budget. Keep the same inspector DOM, data
  attributes, and width cap.

### 4.5 Footer Chips

Purpose: persistent evidence boundary, low volume, with explicit Details/Boundary affordance still visible.

```text
+----------------------------------------------------------------------------+
| [simulation display] [operator-family precision] [TLE source] [13 actors]   |
|                                                        [Boundary & Sources] |
+----------------------------------------------------------------------------+
```

Token mapping:

- Ambient chip background: `--m8a-v411-ui-panel` with muted border
- Ambient chip text: 12px, `--m8a-v411-ui-text-muted`
- Explicit boundary/source chip: `--m8a-v411-ui-steel`, `--m8a-v411-ui-text`
- W5 warning chip: amber/danger tokens with `--m8a-v411-ui-on-accent` when filled
- Height: 26-28px desktop; 28px mobile
- Radius: `--m8a-v411-radius-xs` or `--m8a-v411-radius-sm`

Implementation note:

- Footer chips should not become a second primary nav. Keep them quiet, readable, and below the decision surfaces.

## 5. Cesium Figure-Ground Scheme

Problem:

- Cesium starfield plus Earth texture creates a noisy dark background. Transparent dark panels can look like glass but reduce readability because stars and orbit paths show through the same luminance band as the text.

Decision:

- Use **solid / near-solid panels** for rail and inspector.
- Use **controlled translucent callouts** for countdown, hover, orbit chips, and scene cue only.
- Avoid broad glassmorphism. Glass is only acceptable where the surface is small, text is short, and contrast is verified.

ui-ux-pro-max style evidence:

> "Dark Mode (OLED)... high contrast, deep black, midnight blue, eye-friendly"

> "Minimal glow ... high readability, visible focus"

> "Dimensional Layering... z-index stacking, box-shadow elevation (4 levels)"

> "Glassmorphism... Text contrast 4.5:1 checked"

Card vs glass vs solid panel:

| Surface | Treatment | Reason |
| --- | --- | --- |
| Top strip | Solid matte canvas | persistent scope text; must not fight stars |
| Left rail | Solid raised panel | first-read text and decision slots need stable background |
| Countdown | Near-solid callout | short, transient, over globe center; can use subtle translucency |
| Details inspector | Solid raised panel | long text and tabs need reading comfort |
| Footer chips | Compact solid chips | evidence labels stay legible without stealing focus |
| Orbit/ground labels | Small translucent tags | they point to spatial objects and must not obscure satellites |

Final implementation constraints:

- Centralize tokens as CSS custom properties under the V4.11 product surface/root.
- No inline styles.
- No scattered hex literals in V4.11 CSS after the pass except inside token definitions or legacy untouched files outside the edited scope.
- Preserve selectors, data attributes, DOM structure, visible strings, and smoke selectors.
