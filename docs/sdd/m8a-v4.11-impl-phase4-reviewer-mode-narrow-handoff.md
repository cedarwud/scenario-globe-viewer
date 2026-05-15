# M8A V4.11 Implementation Phase 4 Reviewer Mode + Narrow/Tablet Handoff

## §1 Scope landed

Phase 4 applies spec v2 §7 (reviewer mode state machine) and §8 (narrow
+ tablet designed surfaces) on top of the Phase 1 / 2 / 3 working tree.
It is intentionally a runtime + responsive UI phase; no Phase 1 disabled
tile copy, no Phase 2 tab structure or boundary header content, and no
Phase 3 token assignment was changed.

- Added a runtime reviewer-mode state machine module
  (`src/runtime/m8a-v411-reviewer-mode.ts`) with five replay-clock modes,
  eight transitions, default-on policy, and `localStorage` persistence.
- Wired the state machine into the V4 ground-station scene controller:
  inspector-open captures `pinnedWindowId` + `pinnedReplayRatio` and
  pauses replay; inspector-close resumes from the pinned ratio by
  default; window transitions during natural replay enter
  `review-auto-paused` for ~9.5 s when `reviewModeOn=true`; user pause
  / play / restart route through the state machine and the final-hold
  path now also transitions through `final-hold`.
- Added a transition-toast suppression channel: while
  `inspector-pinned`, transition toasts are suppressed and the
  suppressed queue length is exposed for verification but discarded on
  inspector close (no stale toasts replay).
- Added an inspector-header `Pinned to W*` mode label, a control-strip
  `Review mode` toggle button, and a polite ARIA live region
  (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) for
  reviewer-mode announcements (`Reviewer pinned to W2`,
  `Auto-pause: review mode`, `Resumed`, `Final hold; press restart
  to replay from the start`).
- Added designed narrow + tablet surfaces in
  `src/styles/m8a-v411-narrow.css` (new) and replaced the prior
  `<=720px` graceful-degradation rules in
  `src/styles/m8a-v411-inspector-concurrency.css` and
  `src/styles/m8a-v411-phase-b-layout.css`. Phone (≤480 px) and portrait
  tablet (481–1023 px portrait) get a full-screen / near-full-screen
  modal with `min-height: 100dvh`, safe-area padding, scroll lock,
  manual focus trap, and return-focus on close. The handover rail
  becomes a left drawer with a visible compact-strip trigger, an
  Escape / scrim close path, and return-focus-to-trigger semantics.
  Landscape tablet (1024–1279 px) is treated as a constrained desktop
  variant (rail visible, no modal).
- Regenerated `public/fonts/noto-sans-tc-m8a-v411-subset.ttf` from
  `NotoSansTC-VF` to cover every CJK codepoint that appears in V4.11
  source files (159 unique CJK chars + ASCII / common punctuation =
  247 codepoints), closing the validation-badge glyph fallback gap (CJK
  codepoints U+72C0, U+614B, U+88DC, U+6210, U+672A, U+7D44 — these glyphs
  back the "Validation status: TBD" badge and related rail copy in the
  prior subset)
  observed in the Phase 2 inspector-header capture.

## §2 Files changed

Runtime / UI code:

- `src/runtime/m8a-v411-reviewer-mode.ts` (new — state machine module)
- `src/runtime/m8a-v411-transition-toast.ts` (toast suppress / queue / discard)
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
  (state-machine wiring, ARIA region, mode label, review-mode toggle,
  rail drawer trigger, focus trap, return focus, structure-version
  bump to `m8a-v4.11-product-ux-structure-impl-phase4-reviewer-mode-runtime.v1`)

Styles:

- `src/styles/m8a-v411-narrow.css` (new)
- `src/styles/m8a-v411-inspector-concurrency.css` (the prior `<=720px`
  bottom-sheet rule is superseded; only the constrained-laptop rule
  remains, scoped to `(min-width: 1024px)`)
- `src/styles/m8a-v411-phase-b-layout.css` (the prior
  `<=720px` `display: none` for the rail and top strip is superseded)
- `src/styles.css` (imports `m8a-v411-narrow.css`)

Smokes:

- `tests/smoke/verify-m8a-v4.11-impl-phase4-reviewer-mode-runtime.mjs`
  (new — 9 checks, 6 captures)
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`
  (Lock-in J softening cited)
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
  (narrow non-overlap softened, cite spec v2 §8.2)
- `tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs`
  (narrow non-overlap softened, cite spec v2 §8.2)

Asset / docs:

- `public/fonts/noto-sans-tc-m8a-v411-subset.ttf` (regenerated)
- `public/fonts/README.md` (notes the regenerated scope)
- `docs/sdd/m8a-v4.11-impl-phase4-reviewer-mode-narrow-handoff.md`
  (this doc)

## §3 Reviewer mode state machine (spec v2 §7)

### §3.1 Fields implemented

`M8aV411ReviewerModeState` carries every field the spec lists:

- `replayClockMode: "running" | "review-auto-paused" | "inspector-pinned" | "manual-paused" | "final-hold"`
- `pinnedWindowId: M8aV46dSimulationHandoverWindowId | null`
- `pinnedReplayRatio: number | null`
- `previousPlaybackState: M8aV411ReplayClockMode | null`
- `pauseSource: "review-mode-auto" | "inspector-open" | "user-pause-button" | null`
- `toastSuppressed: boolean`
- `reviewModeOn: boolean` (persisted via
  `localStorage["m8a-v411-reviewer-mode-on"]`, default-on per spec §7.2)
- `reviewAutoPauseStartedAtEpochMs: number | null`
- `manualPauseSpeedDeferred: boolean` (drives the
  "applies after resume" hint on speed buttons during pinned/auto-paused)
- `lastModeChangeAtEpochMs: number`

### §3.2 Transitions implemented

| From | Event | To | Side effects |
|---|---|---|---|
| `running` | inspector-open | `inspector-pinned` | capture pinnedWindowId + pinnedReplayRatio, set previousPlaybackState=running, pauseSource=inspector-open, toastSuppressed=true, replayClock.pause |
| `inspector-pinned` | close | `running` (or `manual-paused` if user paused before opening) | seek replayClock back to pinnedReplayRatio, clear pin fields, toastSuppressed=false, replayClock.play if mode reaches running |
| `running` + `reviewModeOn` | natural window-transition | `review-auto-paused` | replayClock.pause, schedule resume timer (~9.5 s), pauseSource=review-mode-auto, manualPauseSpeedDeferred=true |
| `review-auto-paused` | timer elapsed | `running` | replayClock.play, clear pauseSource |
| `review-auto-paused` | user action (pause / open inspector / play) | `manual-paused` or `inspector-pinned` or `running` | timer cancelled |
| any non-final mode | user pause button | `manual-paused` | pauseSource=user-pause-button |
| any paused mode | user play button | `running` | clear pauseSource |
| any active mode | final window end | `final-hold` | held final frame, replayClock.pause |
| `final-hold` | restart / play | `running` | seek to start, replay |

The "natural progression" gate prevents auto-pause from firing on user
seeks (a >0.05 ratio jump between sync ticks is treated as a seek, not
a natural window crossing). This was required to keep the V4.7.1 pointer
matrix smoke green; without it, seeking into W2 would auto-pause and
then any "Play"-labelled click would be misread as a pause.

### §3.3 Toast suppression (spec v2 §7.3)

`renderM8aV411TransientSurfaces` accepts a `toastSuppressed` flag. When
the flag is `true`, transition events still update the lastEventKey
tracker but never spawn toast records or ARIA announcements; instead,
the suppressed queue length is incremented and exposed via
`data-m8a-v411-transition-toast-suppressed-queue-length`. On
suppression release (inspector-close), the suppressed queue is cleared
(no stale toasts replay), the ARIA status text is reset, and
`lastAnnouncedEventKey` is rolled forward so only genuinely new
post-close transitions can announce.

### §3.4 Controls per mode and visible labels

`resolveM8aV411ControlAvailability(state)` returns the
play/pause/restart/speed/review/close availability matrix per mode.
`renderM8aV411ReviewerMode` then sets `aria-disabled` and a
`data-m8a-v411-reviewer-speed-deferred` flag on speed buttons when the
mode is `inspector-pinned` or `review-auto-paused` (matching the spec
"applies after resume" wording).

Mode label content (rendered in
`[data-m8a-v411-inspector-mode-label]`):

- `inspector-pinned` → `Pinned to W2` (or matching W*).
- `review-auto-paused` → `Auto-pause: review mode`.
- `manual-paused` → `Paused by user`.
- `final-hold` → `Final hold · restart`.
- `running` → label hidden.

### §3.5 ARIA (spec v2 §7.5)

A dedicated `role="status"` `aria-live="polite"` `aria-atomic="true"`
container at `[data-m8a-v411-reviewer-mode-status]` announces:

- `Reviewer pinned to W2`
- `Auto-pause: review mode`
- `Paused by user`
- `Final hold; press restart to replay from the start`
- `Resumed`

The container is offscreen (sr-only-style absolute clip) and announces
only when the mode or pinned ordinal changes (no announce-on-every-tick
chatter).

### §3.6 Default policy

- `reviewModeOn` defaults to `true` for review/demo/capture contexts
  (`createM8aV411ReviewerModeInitialState({ reviewModeOn: true, ... })`
  is the seeded value when the localStorage key is absent).
- User choice persists via `localStorage["m8a-v411-reviewer-mode-on"]`
  (`on` / `off`).
- Inspector close resumes from `pinnedReplayRatio` by default
  (`controller.toggleDetailsDisclosure` captures it; close calls
  `replayClock.seek(...pinnedRatio...)` then `replayClock.play()` if
  the post-transition mode is `running`).

## §4 Narrow + tablet designed surfaces (spec v2 §8)

### §4.1 Breakpoints

| Breakpoint | Range | Layout |
|---|---|---|
| Phone | `max-width: 480px` (390x844) | compact horizontal scope strip, drawer rail, full-screen Details modal |
| Tablet portrait | `min-width: 481px` and `max-width: 1023px` and `orientation: portrait` (768x1024) | drawer rail, near-full-screen Details modal with safe-area padding |
| Tablet landscape | `min-width: 1024px` and `max-width: 1279px` (1024x768, 1280x720) | constrained desktop variant; rail visible, no modal |
| Desktop | `min-width: 1440px` (1440x900) | full top strip + rail + inspector + footer composition |

### §4.2 Narrow modal contract (spec v2 §8.2)

- `min-height: 100dvh` (NOT `100vh`) — handles mobile viewport collapse
  correctly under URL-bar resize.
- `padding: max(var(--m8a-v411-space-3), env(safe-area-inset-*))` on
  all four sides — respects safe-area insets.
- Background scroll locked via
  `body:has(.m8a-v47-product-ux__sheet[data-m8a-v411-inspector-concurrency]:not([hidden])) { overflow: hidden; }`.
- Manual focus trap implemented in
  `m8a-v4-ground-station-handover-scene-controller.ts`
  (`handleProductUxKeyDown`): when `(max-width: 1023px)` matches and
  Details is open, Tab/Shift+Tab cycles within the inspector sheet's
  focusable descendants; if focus escapes the sheet, it snaps back to
  the first focusable.
- Escape closes the modal and returns focus to the
  `lastDetailsTriggerElement` recorded when `toggle-disclosure` fired.
- The Close button also closes and returns focus.
- Scene remains visible as a non-interactive backdrop (modal is fixed
  inset 0 with z-index above the rail and footer).
- Touch targets ≥44 px enforced by
  `.m8a-v47-product-ux button[data-m8a-v48-info-class="control"]`
  rule (already present) plus the new
  `.m8a-v411-narrow-rail-trigger`, `.m8a-v411-handover-rail-close`,
  and `.m8a-v411-reviewer-mode-toggle` rules each set
  `min-height: 44px; min-width: 44px`.
- No content depends on hover; the inspector body is rendered
  unchanged across viewports.

### §4.3 Drawer + footer (spec v2 §8.3)

- Handover rail drawer opens via the visible
  `[data-m8a-v411-narrow-rail-trigger]` button on phone / portrait
  tablet (CSS controls visibility; no `hidden` HTML attribute).
- Drawer is `position: fixed; transform: translateX(-100%)` by default;
  `[data-m8a-v411-handover-rail-drawer-state="open"]` flips it to
  `translateX(0)`.
- Drawer focus moves to the first rail slot on open (manual `tabindex`
  + `focus({ preventScroll: true })`).
- Close button + scrim button + Escape close the drawer; focus returns
  to the trigger via `lastRailTriggerElement`.
- Footer chips + sequence rail keep their existing narrow rules (see
  `m8a-v411-footer-chip.css`); W5 warning chip remains in the first
  row; sequence rail simplifies to active + total dot count via the
  existing narrow rules.
- Existing `<=720px` `display: none` for the rail / top strip in
  `m8a-v411-phase-b-layout.css` is replaced by the new designed
  contract.

### §4.4 Required captures (spec v2 §8.4)

All six landed in `output/m8a-v4.11-impl-phase4/`:

- `reviewer-mode-pinned-1440x900.png` — inspector pinned, mode label
  visible (`Pinned to W2`).
- `reviewer-mode-auto-pause-1440x900.png` — natural W1→W2 transition
  arrived in `review-auto-paused`; ARIA live region announced.
- `narrow-modal-390x844.png` — Details open as full-screen modal at
  390x844; CJK glyphs all render.
- `narrow-drawer-390x844.png` — handover rail open as drawer at
  390x844 (W2 rail content visible; scene visible behind).
- `tablet-portrait-768x1024.png` — drawer + near-full-screen inspector
  at 768x1024.
- `tablet-landscape-1024x768.png` — constrained desktop variant at
  1024x768; rail visible.

## §5 Phase 2 badge font fallback verification

The Phase 2 inspector-header crop
(`output/m8a-v4.11-impl-phase2/inspector-header-detail-1440x900.png`)
was inspected and **did show** glyph-fallback artifacts: the validation
badge text rendered with tofu replacements where the "Validation status: TBD"
glyphs should have been (the badge string fell back to placeholder stars
for the missing CJK codepoints) because the Phase 2-era subset font
(`public/fonts/noto-sans-tc-m8a-v411-subset.ttf`) was missing CJK
codepoints U+72C0, U+614B, U+88DC, U+6210, U+672A, U+7D44 (the glyphs
that complete the "Validation status: TBD" badge). A Python
`fontTools.ttLib` cmap inspection
confirmed the gap and a project-wide CJK scan
(`grep` over `src/runtime/*.ts` and `src/features/**/*.ts`) found
exactly 159 unique CJK codepoints used in V4.11 source.

Resolution: regenerated the subset from `NotoSansTC-VF.ttf` using
`pyftsubset` with the union of (existing subset codepoints) ∪ (V4.11
source CJK codepoints) ∪ (CJK punctuation) ∪ (basic Latin). The new
subset covers 247 codepoints (155 → 247 CJK + ASCII / punctuation).
The Phase 4 `narrow-modal-390x844.png` capture confirms the fix
visually: the badge now reads `Validation status: TBD` correctly, and the
`Continuity hold` / `Geometry degrading` / `Signal degrading` body text render without tofu glyphs.

The V4.11 font stack already chains through
`var(--m8a-v411-cjk-font-family, ...)` to "Noto Sans TC" → "Source Han
Sans TC" → "Microsoft JhengHei" → "PingFang TC" → `system-ui`, so no
font stack change was required; only the subset itself needed the
missing codepoints. `public/fonts/README.md` was updated to reflect the
extended scope.

## §6 Skill query log

The prompt asked for five `python3
.codex/skills/ui-ux-pro-max/scripts/search.py ...` queries. The
`.codex` path in this repository is **not a directory** — `ls -la`
shows `.codex` is a 0-byte file (placeholder), and
`find /home/u24/papers/scenario-globe-viewer -maxdepth 5 -type d
-name "ui-ux-pro-max"` returns nothing. No `SKILL.md`, search script,
or runnable skill payload exists in this checkout, so the five queries
could not be executed. The implementation instead follows the spec v2
§7 / §8 contracts directly — those sections already encode the
required UX patterns:

- "review mode pause auto-advance temporal control" → spec v2 §7.2
  table + §7.4 "applies after resume" wording.
- "modal full screen narrow viewport focus trap" → spec v2 §8.2.
- "drawer side panel collapsible mobile" → spec v2 §8.3.
- "ARIA live region status announcement polite" → spec v2 §7.5 +
  §10.3.
- "100dvh safe area inset mobile viewport" → spec v2 §8.2.

The Phase 4 smoke records this fact under
`phase-4-skill-queries-not-runnable-skills-directory-empty`.

## §7 Smoke matrix result

Final smoke run (each command run alone or in resource-isolated batch;
all green):

```
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
node tests/smoke/verify-m8a-v4.11-impl-phase4-reviewer-mode-runtime.mjs
```

Result: 24 / 24 green.

## §8 Smoke softening disclosures (Lock-in J)

Each cites the spec authority that supersedes the prior assertion.

1. `verify-m8a-v4.11-correction-a-phase-e-runtime.mjs` (manifest):
   > Phase 4: spec v2 §8.1 / §8.3 supersedes the prior `narrow fallback
   > intentionally hides desktop top strip / left rail` assertions;
   > narrow now shows a designed compact scope strip plus a
   > handover-rail drawer rather than hidden surfaces.
2. `verify-m8a-v4.11-impl-phase4-reviewer-mode-runtime.mjs`
   (manifest):
   > Phase 4 (spec v2 §7, §8): reviewer mode state machine + designed
   > narrow/tablet surfaces. Existing `<=720px` graceful-degradation
   > rules in `m8a-v411-inspector-concurrency.css` and
   > `m8a-v411-phase-b-layout.css` are superseded by
   > `m8a-v411-narrow.css`. Existing V4.7.1 / V4.9 narrow non-overlap
   > assertions are softened in their respective smokes (cite spec v2
   > §8.2). Toast queue/suppress/discard logic is per spec v2 §7.3.
3. `verify-m8a-v4.9-product-comprehension-runtime.mjs` (inline
   comment): spec v2 §8.2 supersedes the V4.9 narrow non-overlap rule;
   narrow Details now opens as a full-screen modal.
4. `verify-m8a-v4.7-handover-product-ux-runtime.mjs` (inline
   comment): spec v2 §8.2 supersedes the V4.7.1 narrow non-overlap and
   annotation-visibility assertions; narrow Details now opens as a
   full-screen modal.

## §9 A11y check results (spec v2 §10.3)

| Item | Result |
|---|---|
| Keyboard order across top strip / rail / Details / tabs / Archive / footer / modal / drawer | Tab order follows visual order; verified via the Phase 4 smoke focus-trap path (manual collection of focusables uses DOM order). |
| Focus rings visible over globe and panels | `:focus-visible` rules in `m8a-v411-narrow.css`, `m8a-v411-inspector-concurrency.css`, and `m8a-v411-phase-b-layout.css` apply 2 px outline + 4 px box-shadow color-mix highlight. |
| Reduced-motion disables review-auto-paused dwell timer animations | `@media (prefers-reduced-motion: reduce)` in `m8a-v411-narrow.css` sets `transition: none` on the rail drawer and `animation: none` on the mode label; the timer itself still fires at the 9.5 s mark (preserves state meaning, removes motion). |
| Contrast meets WCAG AA in modal / drawer | The reviewer mode label uses `var(--m8a-v411-state-active)` border + 16 % active-on-neutral fill (resolves to `#00b8d4` on `#0E1223`); contrast ratio of `--m8a-v411-ui-text` (`#F8FAFC`) over the resolved fill is >7:1 (text) and >3:1 (border). The drawer + modal reuse the same panel + text tokens already ratified in Phase 3. |
| `aria-disabled` on disabled controls per mode | `renderM8aV411ReviewerMode` sets `aria-disabled` on speed buttons when `controls.speedEnabled === false` (final-hold) and a separate `data-m8a-v411-reviewer-speed-deferred="true"` marker plus a `title="Applies after resume"` when in `inspector-pinned` / `review-auto-paused`. |
| `role="status"` live region present | `[data-m8a-v411-reviewer-mode-status]` exists with `role="status"`, `aria-live="polite"`, `aria-atomic="true"`. Text is updated only on actual mode / ordinal change. |
| Focus trap works in narrow modal | Verified by `handleProductUxKeyDown`: when `(max-width: 1023px)` matches and Details is open, Tab/Shift+Tab cycles inside the sheet; escape closes and returns focus. |
| Return focus on modal close | `lastDetailsTriggerElement` is captured on `toggle-disclosure` and restored on `close-disclosure` (also on Escape). The drawer uses `lastRailTriggerElement` symmetrically. |

## §10 Self-honest visual quality estimate

Phase 4 raises my honest visual-quality estimate from 7.6/10 (post Phase 3)
to **7.9/10**. Reviewer mode and the designed narrow/tablet surfaces
are functional improvements — they remove the worst graceful-degradation
behavior and give every viewport a designed flow — but the desktop
composition itself was unchanged in this phase. The biggest remaining
visual debt is still the inspector tab body density at 1440x900, which
Phase 5 reconciliation (per spec §11) is positioned to address.

## §11 Scope guards (Phase 4 explicitly NOT changed)

Confirmed unchanged for Phase 4:

- Phase 1 disabled tile content / wording (13 tiles, hookpoint copy,
  reachability qualifiers, placeholders).
- Phase 2 tab structure (still `Decision` / `Metrics` / `Evidence`,
  no `Boundary` tab).
- Phase 2 boundary header strip selector / chip content (`13-actor
  demo` + `operator-family precision`); validation badge text
  (`Validation status: TBD`); only the subset font was extended to render the
  same text glyphs without fallback tofu.
- Phase 3 token assignments (orbit identity tokens unchanged; state
  family preserved; raw hex outside the central token file remains
  `<no matches>`).
- Visible Decision / Metrics / Evidence body text.
- No measured numeric latency / jitter / Mbps was added.
- Route `/?scenePreset=regional&m8aV4GroundStationScene=1`,
  endpoint pair `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`,
  precision `operator-family-only`, actor set 6 LEO + 5 MEO + 2 GEO,
  V4.6D `m8a-v4.6d-simulation-handover-model.v1`, R2 read-only, and
  Slice 6 reviewer transcripts were not changed.
- `leo-beam-sim` source was not modified.
- V4.12 / F-09 docs were not touched.
- Phase 5 final reconciliation work (per spec §11) was not started.

## §12 Phase 5 readiness

**Phase 4 ready for Phase 5 reconciliation prompt? YES** — the
reviewer-mode state machine, narrow/tablet designed surfaces, and the
Phase 2 badge font fallback are all closed; the smoke matrix is
fully green; required captures landed; and the scope guards are
intact, so a Phase 5 reconciliation prompt can proceed without
Phase 4 amendments.
