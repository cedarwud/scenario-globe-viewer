# M8A V4.11 Correction A - ITRI Requirement-Driven Details And Layout Plan

Date: 2026-05-04

Status: Planning SDD. Do not implement from memory; implementation must read this file first.

Scope: `scenario-globe-viewer` M8A V4.11 ground-station multi-orbit handover route.

## 0. Planning Decisions

This correction makes the following decisions explicit:

1. `Details` must not remain one dense block. It becomes a right-side inspector with separate `Decision`, `Metrics`, `Boundary`, and `Evidence` sections.
2. The first-read handover explanation moves out of Details into a left-side Handover Decision Rail, so the user can understand the scene without opening the inspector.
3. Scenario scope and replay/time state move to a compact top strip, because ITRI requirements include mode, speed, and scale boundaries.
4. Footer source chips stay visible, but they are not the only clickable path. A clear disclosure button or info control is required.
5. The `Details` button must remain visible. Removing it makes the interaction too hidden.
6. The W4 fast expanding satellite ring must be replaced by a short entry cue plus a stable candidate halo.
7. Slice6 reviewer validation stays paused until this correction is implemented and visually accepted.

The intended screen is not "one bigger Details panel." It is a distributed layout:

```text
Top scope/time strip
Left handover decision rail | globe workspace | right Details inspector
Footer truth/source strip with explicit disclosure control
```

## 1. Why This SDD Exists

V4.11 Conv 0-4 improved the scene readability with visual tokens, hover, footer disclosure, Truth removal, and Sources demotion. That work still did not fully solve the core ITRI-facing problem:

1. `Details` is still too dense, too small, and too concentrated.
2. Important ITRI information is not clearly split by purpose, time, and evidence level.
3. The footer chips became ambient disclosure, but the clickable affordance is not obvious enough.
4. The W4 candidate satellite fast expanding ring is visually loud and semantically unclear.
5. The design conversation drifted toward generic product comprehension instead of tracing every visible decision back to ITRI's stated needs.

This SDD is the correction plan before any new implementation prompt. It replaces "make Details shorter" with a requirement-driven information architecture.

## 2. Authority And Inputs

Primary ITRI authority:

- `/home/u24/papers/itri/README.md`
- `/home/u24/papers/itri/multi-orbit/README.md`
- `/home/u24/papers/itri/multi-orbit/north-star.md`
- `/home/u24/papers/itri/multi-orbit/handoff-overview.md`
- `/home/u24/papers/itri/multi-orbit/m8-expansion-authority.md`

Scenario authority:

- `docs/decisions/0013-ground-station-multi-orbit-scope-reset.md`
- `docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`
- `docs/sdd/m8a-v4.11-real-product-experience-redesign-plan.md`
- `docs/sdd/m8a-v4.11-storyboard-rewrite-proposal.md`
- `docs/sdd/m8a-v4.11-conv4-sources-demote-smoke-matrix-handoff.md`
- `docs/sdd/m8a-v4.11-slice6-validation-matrix-final-handoff.md`

Current route and guardrails remain unchanged:

- Route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Pair: `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- Endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- Endpoint B: Singapore / Speedcast Singapore Teleport
- Precision: operator-family-only
- Actor set: 6 LEO, 5 MEO, 2 GEO
- Model: V4.6D bounded repo-owned projection
- R2: read-only evidence archive, not a selector
- Forbidden claims: no live measurement truth, no active serving satellite, no active gateway, no pair-specific teleport path, no native RF handover, no measured latency/jitter/throughput/continuity

## 3. Design Principle

Every visible element must answer an ITRI requirement question.

The implementation must use this trace:

```text
ITRI requirement -> operator question -> UI region -> data support -> visible wording -> truth boundary
```

If current data does not support a requirement, the UI must show the gap honestly instead of inventing metrics.

## 4. Requirement-To-UI Traceability

| ITRI requirement | Operator question | Required UI region | Current support | Display rule |
| --- | --- | --- | --- | --- |
| LEO/MEO/GEO multi-orbit service switching | Which orbit layer is serving, candidate, or fallback now? | Left Handover Decision Rail, scene tokens, Details `Decision` tab | V4.6D five-window projection and 13 actors | Show primary/candidate/fallback as modeled service state, not active satellite truth |
| Link quality based switching: latency, jitter, speed | Why is it switching or staying? | Details `Metrics` tab and per-window rail summary | Current scene has bounded quality classes, not measured metrics | Show quality class and reason; do not fabricate ms, jitter, or Mbps |
| Communication state and communication time | How long can this state hold? | Time strip, rail countdown, Details `Decision` tab | Countdown derived from replay/window timing | Prefix derived values with approximate/simulation wording |
| Handover rules and strategy | What rule triggered this decision? | Details `Decision` tab, rail stage reason | Five-window storyboard has rule-like reasons | Show rule narrative; do not claim a live network policy engine |
| TLE and satellite tracking | Where did the moving satellite positions come from? | Footer source strip, Details `Evidence` tab | TLE/CelesTrak provenance exists for 13 actors | Keep first-read source summary visible; full Sources remains advanced |
| Communication speed visualization | What is the rate now? | Details `Metrics` tab | No real `iperf`/traffic metric in this scene | Show "not connected in this scenario" or disabled metric; no fake throughput |
| Physical layer: rain, antenna, ITU/V group | Are weather/antenna factors affecting the decision? | Details `Metrics` tab as `Physical Factors` module | Not integrated in current V4.11 route | Show "not modeled in this scene"; do not create decorative rain evidence |
| Real-time/prerecorded TLE and speed control | Is this live, replayed, or accelerated? | Top time/mode strip and controls | Replay route and speed controls exist | Make mode and speed visible without burying them in Details |
| >=500 LEO scale | Is this the required large-scale simulator? | Scope strip and Details `Boundary` tab | Current route is 13-actor demo | State 13-actor demonstration; do not imply >=500 LEO validation |
| ESTNeT/INET, virtual/physical DUT validation | Is this connected to a traffic testbed? | Details `Boundary` or `Validation` module | Not wired into this viewer route | State not connected; keep as future integration boundary |
| Report/export and 24h stability | Can this produce validation reports or long-run proof? | Details `Boundary` or validation note | Slice6 reviewer failed; Lock-in L unavailable on WSL/SwiftShader | Do not claim closeout; require future validation evidence |
| Endpoint evidence and precision | What are these ground-side entities? | Ground chips, rail endpoint row, Evidence tab | Operator-family-only evidence accepted | State operator-family precision; no site-level or active gateway claim |

## 5. Proposed Layout Architecture

The next implementation must stop treating `Details` as the only place where meaning lives. The screen should become a distributed operator console with five regions.

### 5.1 Primary Globe Workspace

The globe remains the main workspace. It should show:

- Taiwan and Singapore endpoint markers.
- Active orbit layer, candidate orbit layer, and fallback orbit layer through restrained scene tokens.
- Satellite motion and current window context.
- Minimal labels only; avoid large panels over active satellites.

The globe should not carry long explanatory prose. It should carry spatial state.

### 5.2 Left Handover Decision Rail

Add a desktop left rail or equivalent non-overlapping side region.

Purpose:

- Provide the first-read answer before opening Details.
- Split the five storyboard windows into operator stages.
- Show current, next, and fallback state without forcing the user into one dense block.

Content:

- Current window label: W1-W5.
- Primary orbit class.
- Candidate orbit class.
- Fallback orbit class, when relevant.
- One short ITRI-facing decision sentence.
- One compact time/quality line.

Example for W4:

```text
W4 / 候選 LEO 回來
Primary: MEO
Candidate: LEO
Decision: 位置條件恢復，正在評估切回 LEO
Time: 模擬倒數 ~03:10
```

The rail must not become another large prose panel. It is a scan surface.

### 5.3 Top Scenario Scope And Time Strip

Add or revise a compact strip that keeps scenario scope visible:

- `13-actor demo`
- `LEO / MEO / GEO`
- `operator-family precision`
- `replay` or `prerecorded`
- current speed multiplier

This strip should prevent users from mistaking the scene for the full >=500 LEO simulator or live network validation.

### 5.4 Right Details Inspector

`Details` must remain as an explicit button. It must not depend on users discovering a hidden clickable footer chip.

The inspector should become a docked or side-safe panel with sectioned content. It must not be one undifferentiated block.

Required tabs or segmented sections:

1. `Decision`
2. `Metrics`
3. `Boundary`
4. `Evidence`

Default open state: `Decision`.

Minimum layout rules:

- Primary text at least 15-16px.
- Section titles at least 13-14px.
- Evidence rows may be smaller only inside the advanced `Evidence` section.
- Use rows, badges, and short statements instead of paragraphs.
- Do not place UI cards inside another card.
- Keep inspector width large enough for readability, approximately 360-420px on desktop, with responsive behavior for smaller viewports.
- If the inspector would cover the active satellite/marker area, dock it to the side or let the globe safe-zone shift.

### 5.5 Footer Truth And Source Strip

Footer chips should be ambient disclosure, not the only interaction.

Required change:

- Keep chips such as `模擬展示`, `TLE: CelesTrak NORAD GP`, `13 actors`, `operator-family precision`.
- Add a clearly visible disclosure affordance, such as an info icon button or `Boundary` button.
- Do not rely on a generic block/chip click as the only way to open truth/source information.

The footer should answer "what kind of evidence is this?" without stealing attention from the main decision UI.

## 6. Details Inspector Content Model

### 6.1 Decision Tab

Purpose: answer what is happening and why.

Required modules:

- `Now`: current modeled service state.
- `Why`: the handover pressure or rule.
- `Next`: candidate action or next window.
- `Watch`: the condition that should change next.

Rules:

- Keep this tab readable without scrolling for normal desktop height.
- Use the layperson Chinese vocabulary already approved in Conv 4 protocol:
  - `現在看這顆`
  - `位置條件變差`
  - `暫時接住`
  - `候選`
  - `保底覆蓋`
  - `模擬展示`
  - `不是實際備援切換證據`

### 6.2 Metrics Tab

Purpose: show ITRI-required communication quantities and distinguish available projection from missing measurement.

Required modules:

- `Link quality`: modeled class and reason.
- `Communication time`: derived remaining/elapsed window time.
- `Latency / jitter / throughput`: unavailable or not connected unless real data exists.
- `Physical factors`: rain/antenna/ITU factors unavailable unless modeled source exists.

Rules:

- Do not show fake numeric latency, jitter, throughput, packet loss, or rain attenuation.
- If unavailable, the UI must say that the current route is not connected to `ping`, `iperf`, ESTNeT/INET, DUT, rain, or antenna models.
- Derived timing should be marked as simulated or approximate.

### 6.3 Boundary Tab

Purpose: keep the truth boundary legible without restoring the old confusing `Truth` button.

Required modules:

- `Simulation boundary`: repo-owned projection, not measured truth.
- `Service-layer boundary`: modeled service handover, not native RF handover.
- `Endpoint boundary`: operator-family precision, not site-level gateway claim.
- `Scale boundary`: 13-actor demo, not >=500 LEO validation.
- `Validation boundary`: no 24h hardware-GPU validation and no Slice6 reviewer closeout yet.

### 6.4 Evidence Tab

Purpose: source provenance for users who need auditability.

Required modules:

- `TLE source summary`: visible first, short.
- `Endpoint evidence`: Taiwan/CHT and Singapore/Speedcast operator-family evidence.
- `R2 archive`: read-only, not selector.
- `Full source provenance`: advanced/collapsible.

Sources remains an advanced path, but source summary must not be buried so deeply that the scene looks unsupported.

## 7. Per-Window Information Plan

Each window must distribute information across the rail, globe, and Details instead of repeating one long block.

| Window | Rail first-read | Globe visual | Details `Decision` | Details `Metrics` |
| --- | --- | --- | --- | --- |
| W1 LEO acquisition | LEO is usable now; watch service time | restrained rising LEO trail | why LEO is primary and when to watch | modeled quality strong; simulated remaining time |
| W2 LEO degrading | position condition is worsening; prepare switch | fading LEO trail and countdown | why switch pressure is increasing | quality class drops; no measured jitter/throughput claim |
| W3 MEO hold | MEO temporarily carries continuity | stable wider coverage cue | why MEO is selected as hold state | higher-latency class may be described only as modeled class |
| W4 LEO candidate returns | LEO is candidate, not primary yet | steady candidate halo after short entry cue | why LEO is being evaluated for switch-back | candidate quality class and remaining evaluation time |
| W5 GEO guard | GEO is fallback/guard coverage | restrained guard ring | why guard coverage remains | boundary that this is not real backup switching evidence |

## 8. W4 Candidate Ring Redesign

The current fast satellite circle scaling is not acceptable as a permanent cue. It is visually dominant and can be misread as an active handover, alarm, or confirmed serving satellite.

Replace it with a two-state candidate token:

1. Entry cue:
   - A short 1-2 second ripple when W4 begins or when the candidate first appears.
   - Maximum radius approximately 120px.
   - No faster than one restrained expansion during the entry cue.
   - Must stop automatically.

2. Steady candidate halo:
   - A small stable outline around the candidate satellite.
   - Pair with a `候選 LEO` label or chip.
   - Do not use alarm colors unless the state is actually a warning.
   - Do not imply active serving state.

Motion policy:

- Respect reduced motion preferences.
- No permanent 1Hz large pulse through the whole W4 window.
- The candidate cue must be subordinate to the rail and Details decision message.

## 9. Interaction Requirements

Required explicit controls:

- A visible `Details` button.
- A visible boundary/source disclosure affordance in the footer or footer-adjacent area.
- A visible advanced source provenance toggle inside Details.

Forbidden interaction assumptions:

- Do not require users to know that a footer chip/block is clickable.
- Do not remove the only obvious entry point into Details.
- Do not use hidden hover-only access for critical ITRI information.

## 10. Visual Design Requirements

This redesign should look like an operator-facing simulation console, not a marketing page and not a dense debug panel.

Required qualities:

- Clear visual hierarchy.
- Readable primary text.
- Stable side regions that do not jitter when content changes.
- Compact but not microscopic metrics.
- Distinct regions for decision, metrics, boundary, and evidence.
- Scene tokens that explain state without dominating the globe.

Avoid:

- One huge panel containing every fact.
- Tiny source text mixed with decision text.
- Card-inside-card layouts.
- Fast repetitive pulses.
- Decorative visuals that do not map to ITRI requirements.
- Claim-like metric numbers without measurement support.

## 11. Implementation Phases

### Phase A - SDD Lock

Output: this document accepted as the correction plan.

No code changes.

Acceptance:

- ITRI requirement-to-UI traceability exists.
- Details is explicitly redesigned as multiple sections, not one block.
- W4 fast pulse correction is specified.
- Footer click-affordance issue is specified.

### Phase B - Layout Shell

Implement structural layout only:

- Left Handover Decision Rail.
- Top scenario scope/time strip.
- Right Details inspector shell with tabs/segments.
- Footer explicit disclosure affordance.

Acceptance:

- `Details` button is visible.
- Footer has an obvious disclosure control.
- Rail and inspector do not overlap key satellite/endpoint view at 1440x900 and 1280x720.

### Phase C - ITRI Content Split

Implement per-window content modules:

- Decision tab.
- Metrics tab.
- Boundary tab.
- Evidence tab.
- Per-window rail summaries.

Acceptance:

- No single Details tab contains the full evidence dump.
- Modeled vs unavailable vs source-backed data is visually separated.
- Latency/jitter/throughput/physical-layer gaps are explicit and not faked.

### Phase D - W4 Visual Token Correction

Replace the permanent fast pulse:

- Short entry cue.
- Stable candidate halo.
- Reduced-motion behavior.

Acceptance:

- No continuous large 1Hz candidate ring in W4.
- Candidate token cannot be mistaken for active serving satellite.

### Phase E - Smoke And Visual Acceptance

Add correction-specific smokes and screenshots.

Required smoke assertions:

- `Details` button exists and opens inspector.
- Inspector has separate `Decision`, `Metrics`, `Boundary`, and `Evidence` sections or tabs.
- Default Details view is `Decision`.
- Footer disclosure affordance is explicit and not only a hidden chip click.
- W4 candidate token is not a permanent fast expanding ring.
- Metrics section does not show fake measured latency, jitter, throughput, or rain attenuation.
- Boundary section includes 13-actor demo and non-measurement truth.
- Source boundary and forbidden-claim scans still pass.

Required screenshots:

- W1 default rail + globe + top strip.
- W2 degrading state with Metrics tab.
- W3 MEO hold with Decision tab.
- W4 candidate halo after entry cue.
- W5 guard state with Boundary tab.
- Evidence tab showing source summary and advanced provenance.

### Phase F - Resume Reviewer Gate

Only after Phases B-E pass should Slice6 reviewer validation resume.

Reviewer gate remains:

- 3 protocol-valid fresh reviewers.
- 5 windows per reviewer.
- Each reviewer/window score at least 4/5 within 30 seconds without opening Details for the first-read test.
- Details may be used only for the secondary "can inspect deeper" test.

Lock-in L hardware-GPU validation remains separate and cannot be claimed from WSL/SwiftShader.

## 12. Open Questions Before Implementation

1. Should the left decision rail be permanently visible on desktop, or collapsible after first comprehension is proven?
2. Should unavailable ITRI metrics be shown as disabled rows, or grouped under one `Not connected in this scene` module?
3. Should the physical-layer/rain/antenna gap be visible in the main Metrics tab, or only inside Boundary?
4. What is the maximum acceptable Details inspector width before it harms the globe view?
5. Should report/export and 24h stability be represented in this route at all, or deferred to a separate validation view?

## 13. Non-Goals

This correction does not:

- Change endpoint pair.
- Promote R2 to runtime selector.
- Add live CelesTrak/network fetching.
- Add real `ping`, `iperf`, ESTNeT/INET, DUT, or NE-ONE integration.
- Add measured latency, jitter, throughput, packet loss, or rain attenuation.
- Claim >=500 LEO runtime validation.
- Claim 24h stability.
- Claim native RF handover.
- Claim active serving satellite, active gateway, or pair-specific teleport path.
- Close Slice6 reviewer validation.

## 14. Required Execution Prompt Shape

When this SDD is accepted, implementation should be started with a phase-scoped prompt, not a broad "fix Details" prompt.

Minimum execution prompt:

```text
Read the canonical SDD first and implement only the requested phase. Do not rewrite the plan.

Canonical SDD:
- scenario-globe-viewer/docs/sdd/m8a-v4.11-correction-a-itri-requirement-driven-details-and-layout-plan.md

This run should implement only:
- <Phase B | Phase C | Phase D | Phase E>

Requirements:
1. Preserve the existing V4.11 route, endpoint pair, precision, actor set, V4.6D model, R2 read-only boundary, and forbidden-claim assertions.
2. Implement only the selected phase.
3. Do not invent measured latency, jitter, throughput, rain attenuation, active gateway, active serving satellite, or live handover truth.
4. Report deviations separately.
5. Run the phase-specific smoke plus existing V4.11 and V4.10 regressions that are relevant to the touched surfaces.

Return only:
- Changed files
- What was implemented
- ITRI requirement mapping covered
- Smoke results
- Screenshots
- Deviations from SDD
- Remaining work
```
