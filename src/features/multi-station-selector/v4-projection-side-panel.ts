// V4 projection side panel — five-row information layering per IA §5.
//
// Row 1 — header: title (`A ↔ B`), tier badge pill, ISO window line,
//   `Copy link` icon button (top-right of header).
// Row 2 — rain control: rain rate slider (single row).
// Row 3 — flat stats: `Comm time` + `Handovers` (two values).
// Row 4 — summary lists: visibility windows (next 3 by chronological start)
//   and link selection events (next 3 by chronological time PLUS the most
//   recent `cross-orbit-migration` event if not in the top 3).
// Row 5 — three independent disclosures:
//   d1 `Rain impact`: rain-impact stats + per-orbit downlink contrast +
//      body-header line carrying the K-E6 citation `ITU-R P.618-14 §2.2.1`
//      so the rain-effect source is reachable without opening another panel.
//   d2 `All visibility windows`: full sorted list with internal scroll +
//      CSV download button at the top of the disclosure body.
//   d3 `Sources + non-claims`: full handover events list + non-claims +
//      policy citation chain + Mean dwell stat as a small secondary block.
// Row 6 — footer: dim one-liner `${precisionLabel} · ${sourceTier}`.
//
// Style notes:
// - Each row carries a `data-row="${1|2|3|4|5|6}"` attribute so probes can
//   assert the layout without leaning on class hierarchies.
// - The panel itself is `overflow:hidden`; only Row 5 disclosure bodies
//   scroll internally when opened (IA §9.1, G5.2).

import {
  buildDefaultTimeWindow,
  computeLinkBudgetMetricsForOrbit,
  loadDefaultTleSources,
  parseRuntimeTleSources,
  type RuntimeProjectionResult
} from "./runtime-projection";
import {
  buildRuntimeProjectionCsv,
  buildRuntimeProjectionCsvFilename
} from "./runtime-projection-csv";
import { createRuntimeProjectionWorkerClient } from "./runtime-projection-worker-client";
import { inferPairSourceTier } from "./tier-inference";
import type { OrbitClass, PairVisibilityWindow } from "./visibility-utils";
import type { TleRecord } from "./visibility-utils";
import type { V4ResolvedStationPair } from "./v4-route-selection";

const PANEL_ROW4_VISIBILITY_PREVIEW_COUNT = 3;
const PANEL_ROW4_HANDOVER_PREVIEW_COUNT = 3;
const PANEL_ROW5_VISIBILITY_MAX_ROWS = 64;
const PANEL_ROW5_HANDOVER_MAX_ROWS = 64;
const DEFAULT_DEMO_PROJECTION_DURATION_MINUTES = 360;
const MIN_DEMO_PROJECTION_DURATION_MINUTES = 20;
const MAX_DEMO_PROJECTION_DURATION_MINUTES = 480;
const START_UTC_PARAM = "startUtc";
const DURATION_MINUTES_PARAM = "durationMinutes";

const RAIN_RATE_MIN_MM_PER_HOUR = 0;
const RAIN_RATE_MAX_MM_PER_HOUR = 100;
const RAIN_RATE_STEP_MM_PER_HOUR = 5;
const RAIN_RECOMPUTE_DEBOUNCE_MS = 150;

const RAIN_IMPACT_STANDARD_CITATION = "ITU-R P.618-14 §2.2.1";

const PANEL_STYLE_ATTR = "data-v4-projection-side-panel-style";

const PANEL_CSS = `
/* Five-row panel layout per IA §5. The panel root never scrolls; only
   Row 5 disclosure bodies scroll internally. */
.v4-projection-side-panel__row {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}
.v4-projection-side-panel__header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "title  copy"
    "badge  copy"
    "window window";
  align-items: center;
  column-gap: 0.5rem;
  row-gap: 0.18rem;
}
.v4-projection-side-panel__title {
  grid-area: title;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f0f7fb;
  letter-spacing: 0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.v4-projection-side-panel__tier-badge {
  grid-area: badge;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}
.v4-projection-side-panel__tier-badge[data-tier="public-disclosed"] {
  background: rgba(126, 226, 184, 0.14);
  color: #c9ffe8;
  border-color: rgba(126, 226, 184, 0.45);
}
.v4-projection-side-panel__tier-badge[data-tier="geometric-derived"] {
  background: rgba(255, 209, 102, 0.12);
  color: #ffe8a3;
  border-color: rgba(255, 209, 102, 0.4);
}
.v4-projection-side-panel__window {
  grid-area: window;
  margin: 0;
  font-size: 0.72rem;
  color: rgba(157, 196, 232, 0.85);
  font-variant-numeric: tabular-nums;
}
.v4-projection-side-panel__plain-text-separator {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
.v4-projection-side-panel__copy-link {
  grid-area: copy;
  align-self: start;
  width: 1.85rem;
  height: 1.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0.35rem;
  border: 1px solid rgba(126, 226, 184, 0.32);
  background: rgba(126, 226, 184, 0.08);
  color: #c9ffe8;
  font-size: 0.9rem;
  cursor: pointer;
}
.v4-projection-side-panel__copy-link:hover,
.v4-projection-side-panel__copy-link:focus-visible {
  background: rgba(126, 226, 184, 0.18);
  border-color: rgba(126, 226, 184, 0.55);
  outline: none;
}
.v4-projection-side-panel__copy-link[data-copied="true"] {
  background: rgba(255, 209, 102, 0.18);
  border-color: rgba(255, 209, 102, 0.55);
  color: #ffd166;
}
.v4-projection-side-panel__rain-control {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4rem 0.6rem 0.45rem;
  border-radius: 0.4rem;
  background: rgba(157, 196, 232, 0.06);
  border: 1px solid rgba(126, 226, 184, 0.18);
}
.v4-projection-side-panel__rain-control[data-rain-active="true"] {
  background: rgba(255, 209, 102, 0.08);
  border-color: rgba(255, 209, 102, 0.3);
}
.v4-projection-side-panel__rain-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.v4-projection-side-panel__rain-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(157, 196, 232, 0.85);
}
.v4-projection-side-panel__rain-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f0f7fb;
  font-variant-numeric: tabular-nums;
}
.v4-projection-side-panel__rain-control[data-rain-active="true"]
  .v4-projection-side-panel__rain-value {
  color: #ffd166;
}
.v4-projection-side-panel__rain-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 0.35rem;
  border-radius: 0.35rem;
  background: rgba(126, 226, 184, 0.22);
  outline: none;
  cursor: pointer;
}
.v4-projection-side-panel__rain-slider:focus-visible {
  box-shadow: 0 0 0 2px rgba(126, 226, 184, 0.55);
}
.v4-projection-side-panel__rain-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 50%;
  background: #7ee2b8;
  border: 2px solid rgba(6, 18, 28, 0.94);
  cursor: pointer;
}
.v4-projection-side-panel__rain-slider::-moz-range-thumb {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: #7ee2b8;
  border: 2px solid rgba(6, 18, 28, 0.94);
  cursor: pointer;
}
.v4-projection-side-panel__rain-control[data-rain-active="true"]
  .v4-projection-side-panel__rain-slider::-webkit-slider-thumb {
  background: #ffd166;
}
.v4-projection-side-panel__rain-control[data-rain-active="true"]
  .v4-projection-side-panel__rain-slider::-moz-range-thumb {
  background: #ffd166;
}
.v4-projection-side-panel__rain-caption {
  margin: 0;
  font-size: 0.68rem;
  color: rgba(157, 196, 232, 0.75);
  font-variant-numeric: tabular-nums;
}
.v4-projection-side-panel__rain-control[data-rain-active="true"]
  .v4-projection-side-panel__rain-caption {
  color: rgba(255, 209, 102, 0.9);
}
.v4-projection-side-panel__stat[data-modifier="rain-degraded"] {
  background: rgba(255, 209, 102, 0.1);
  border-color: rgba(255, 209, 102, 0.32);
}
.v4-projection-side-panel__stat[data-modifier="rain-degraded"]
  .v4-projection-side-panel__stat-value {
  color: #ffd166;
}
.v4-projection-side-panel__list-item[data-modifier="cross-orbit-migration"] {
  border-left: 3px solid #c9a0ff;
  padding-left: 0.45rem;
  background: rgba(201, 160, 255, 0.07);
}
.v4-projection-side-panel__list-item[data-modifier="cross-orbit-migration"]
  .v4-projection-side-panel__list-secondary {
  color: #c9a0ff;
  font-weight: 600;
}
.v4-projection-side-panel__list-count {
  margin: 0;
  font-size: 0.72rem;
  color: rgba(157, 196, 232, 0.85);
  font-variant-numeric: tabular-nums;
}
.v4-projection-side-panel__summary-section {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}
.v4-projection-side-panel__summary-heading {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(221, 233, 241, 0.78);
}
[data-row="4"] .v4-projection-side-panel__list {
  gap: 0.18rem;
}
[data-row="4"] .v4-projection-side-panel__list-item {
  padding: 0.22rem 0.45rem;
}
[data-row="4"] .v4-projection-side-panel__list-primary {
  font-size: 0.73rem;
  line-height: 1.18;
}
[data-row="4"] .v4-projection-side-panel__list-secondary {
  font-size: 0.65rem;
  line-height: 1.18;
}
.v4-projection-side-panel__details + .v4-projection-side-panel__details {
  margin-top: 0.3rem;
}
/* G5 IA §9.1 + §9.2: rows 1-4 + 6 fit without internal panel scroll
   when no disclosure is open. When one disclosure opens, row 4
   (summary lists) shrinks with internal scroll and row 5 grows to
   fill remaining height. The open disclosure body is positioned
   absolutely inside its disclosure so its content size doesn't push
   the panel layout past its fixed height. */
.v4-projection-side-panel [data-row="4"] {
  flex: 0 1 auto;
  min-height: 0;
}
.v4-projection-side-panel:has([data-row="5"] details[open]) [data-row="4"] {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}
.v4-projection-side-panel [data-row="5"] {
  flex: 0 1 auto;
  min-height: 0;
}
.v4-projection-side-panel:has([data-row="5"] details[open]) [data-row="5"] {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.v4-projection-side-panel [data-row="5"] > .v4-projection-side-panel__details {
  flex: 0 0 auto;
}
.v4-projection-side-panel [data-row="5"] > .v4-projection-side-panel__details[open] {
  flex: 1 1 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.v4-projection-side-panel [data-row="5"] > .v4-projection-side-panel__details[open]
  > .v4-projection-side-panel__details-summary {
  position: relative;
  z-index: 1;
}
.v4-projection-side-panel [data-row="5"] > .v4-projection-side-panel__details[open]
  > .v4-projection-side-panel__details-body {
  position: absolute;
  left: 0;
  right: 0;
  top: 1.6rem;
  bottom: 0;
  overflow-y: auto;
}
/* Fallback body cap for the closed-to-open transition before the
   absolute positioning above takes effect, and for environments
   without :has() support. */
.v4-projection-side-panel__details-body--scroll {
  max-height: 11rem;
  overflow-y: auto;
}
.v4-projection-side-panel [data-row="5"] > .v4-projection-side-panel__details[open]
  > .v4-projection-side-panel__details-body--scroll {
  max-height: none;
}
.v4-projection-side-panel__citation {
  margin: 0;
  font-size: 0.68rem;
  color: rgba(157, 196, 232, 0.85);
  font-variant-numeric: tabular-nums;
}
.v4-projection-side-panel__download-csv {
  width: 100%;
  min-height: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.7rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(126, 226, 184, 0.32);
  background: rgba(126, 226, 184, 0.1);
  color: #e6f7f1;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
}
.v4-projection-side-panel__download-csv:hover {
  background: rgba(126, 226, 184, 0.16);
  border-color: rgba(126, 226, 184, 0.48);
}
.v4-projection-side-panel__download-csv:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(126, 226, 184, 0.55);
}
.v4-projection-side-panel__footer {
  margin: 0;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(157, 196, 232, 0.16);
  font-size: 0.68rem;
  color: rgba(157, 196, 232, 0.72);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}
.v4-projection-side-panel__mean-dwell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.32rem 0.45rem;
  border-radius: 0.32rem;
  background: rgba(157, 196, 232, 0.06);
}
.v4-projection-side-panel__mean-dwell-label {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(157, 196, 232, 0.75);
}
.v4-projection-side-panel__mean-dwell-value {
  font-size: 0.78rem;
  font-weight: 600;
  color: #f0f7fb;
  font-variant-numeric: tabular-nums;
}
`;

function injectPanelStyleOnce(): void {
  if (document.head.querySelector(`[${PANEL_STYLE_ATTR}="true"]`)) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute(PANEL_STYLE_ATTR, "true");
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
}

function createPanelShell(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "v4-projection-side-panel";
  root.dataset.v4ProjectionSidePanel = "true";
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Runtime projection of the selected ground-station pair");
  return root;
}

function renderLoading(root: HTMLElement, pair: V4ResolvedStationPair): void {
  root.replaceChildren();
  root.dataset.state = "loading";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = `Runtime projection · ${pair.stationA.name} ↔ ${pair.stationB.name}`;

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status";
  status.textContent = "Loading TLE fixtures and computing visibility windows…";

  root.append(title, status);
}

function renderError(root: HTMLElement, message: string): void {
  root.replaceChildren();
  root.dataset.state = "error";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = "Runtime projection unavailable";

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status v4-projection-side-panel__status--error";
  status.textContent = message;

  root.append(title, status);
}

function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const minutes = Math.floor(totalSec / 60);
  const sec = totalSec - minutes * 60;
  return sec === 0 ? `${minutes}m` : `${minutes}m ${sec}s`;
}

function formatIsoShort(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const normalized = new Date(ms).toISOString();
  return `${normalized.slice(0, 10)} ${normalized.slice(11, 19)}Z`;
}

function formatIsoSecond(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}

function formatStationPanelName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\bSatellite Station\b/g, "")
    .trim();
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSummaryCountLabel(
  count: number,
  previewLimit: number,
  singular: string,
  plural: string
): string {
  const base = formatCountLabel(count, singular, plural);
  if (count === 0) {
    return base;
  }
  return `${base} · showing next ${Math.min(count, previewLimit)}`;
}

function buildPlainTextSeparator(): HTMLSpanElement {
  const separator = document.createElement("span");
  separator.className = "v4-projection-side-panel__plain-text-separator";
  separator.textContent = " · ";
  return separator;
}

function clampDurationMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
  }
  return Math.min(
    Math.max(Math.round(value), MIN_DEMO_PROJECTION_DURATION_MINUTES),
    MAX_DEMO_PROJECTION_DURATION_MINUTES
  );
}

function resolveProjectionTimeWindowAndDuration(): {
  window: { startUtc: string; endUtc: string };
  durationMinutes: number;
} {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const startUtcParam = search.get(START_UTC_PARAM);
  const parsedStartMs = startUtcParam ? Date.parse(startUtcParam) : NaN;
  const startUtc = Number.isFinite(parsedStartMs)
    ? new Date(parsedStartMs).toISOString()
    : new Date().toISOString();
  const durationParam = search.get(DURATION_MINUTES_PARAM);
  const durationMinutes =
    durationParam === null
      ? DEFAULT_DEMO_PROJECTION_DURATION_MINUTES
      : clampDurationMinutes(Number(durationParam));
  return {
    window: buildDefaultTimeWindow(startUtc, durationMinutes),
    durationMinutes
  };
}

function buildStatBlock(
  label: string,
  value: string,
  modifier?: string
): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-projection-side-panel__stat";
  if (modifier) {
    block.dataset.modifier = modifier;
  }
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__stat-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__stat-value";
  valueEl.textContent = value;
  block.append(labelEl, valueEl);
  return block;
}

function downloadRuntimeProjectionCsv(result: RuntimeProjectionResult): void {
  const csv = buildRuntimeProjectionCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildRuntimeProjectionCsvFilename(result);
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function buildDownloadCsvButton(result: RuntimeProjectionResult): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__download-csv";
  button.textContent = "Download CSV";
  button.addEventListener("click", () => {
    downloadRuntimeProjectionCsv(result);
  });
  return button;
}

function formatSignedPercent(fraction: number): string {
  const pct = fraction * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded)}%`;
}

function formatSpeedMbps(mbps: number): string {
  if (mbps >= 100) {
    return `${Math.round(mbps)} Mbps`;
  }
  if (mbps >= 10) {
    return `${(Math.round(mbps * 10) / 10).toFixed(1)} Mbps`;
  }
  return `${(Math.round(mbps * 100) / 100).toFixed(2)} Mbps`;
}

const ORBIT_DISPLAY_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

/**
 * Per-orbit downlink-throughput contrast. `computeLinkBudgetMetricsForOrbit`
 * runs the same ITU-R P.618-14 model the projection uses; pricing it at
 * 0 mm/h vs the current rate makes the rain fade visible even when the
 * window's comm-time is geometry-saturated.
 */
function buildRainSpeedComparison(
  rainRateMmPerHour: number,
  sharedSupportedOrbits: ReadonlyArray<OrbitClass>
): HTMLElement {
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";
  const allowedOrbits = new Set(sharedSupportedOrbits);

  for (const orbit of ORBIT_DISPLAY_ORDER.filter((orbitClass) =>
    allowedOrbits.has(orbitClass)
  )) {
    const clear = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour: 0
    });
    const wet = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour
    });
    const dropFraction =
      clear.networkSpeedMbps > 0
        ? (clear.networkSpeedMbps - wet.networkSpeedMbps) / clear.networkSpeedMbps
        : 0;
    const rainTransparent =
      Math.abs(wet.networkSpeedMbps - clear.networkSpeedMbps) < 0.01;

    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    if (!rainTransparent) {
      li.dataset.modifier = "rain-degraded";
    }

    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__list-primary";
    primary.textContent = `${orbit} downlink  ${formatSpeedMbps(clear.networkSpeedMbps)} → ${formatSpeedMbps(wet.networkSpeedMbps)}`;

    const secondary = document.createElement("span");
    secondary.className = "v4-projection-side-panel__list-secondary";
    secondary.textContent = rainTransparent
      ? "Below the 10–30 GHz rain band — fade does not apply."
      : `${formatSignedPercent(-dropFraction)} throughput · jitter ${clear.jitterMs.toFixed(1)} → ${wet.jitterMs.toFixed(1)} ms`;

    li.append(primary, secondary);
    list.append(li);
  }

  return list;
}

/**
 * Rain-attenuation impact body (Row 5 disclosure 1). Contrasts a
 * clear-sky baseline projection (0 mm/h) against the current rain rate so
 * the user can see the degradation. The K-E6 citation `ITU-R P.618-14
 * §2.2.1` appears as a body-header line per IA §5 Row 5 d1 + §9.5.
 */
function buildRainImpactBody(
  rainRateMmPerHour: number,
  current: RuntimeProjectionResult,
  clearSky: RuntimeProjectionResult
): DocumentFragment {
  const frag = document.createDocumentFragment();

  const citation = document.createElement("p");
  citation.className = "v4-projection-side-panel__citation";
  citation.textContent = `Standard: ${RAIN_IMPACT_STANDARD_CITATION}`;
  frag.append(citation);

  const clearMs = clearSky.communicationStats.totalCommunicatingMs;
  const currentMs = current.communicationStats.totalCommunicatingMs;

  if (rainRateMmPerHour <= 0) {
    const note = document.createElement("p");
    note.className = "v4-projection-side-panel__empty";
    note.textContent =
      "Clear sky — no rain attenuation applied. Raise the rain rate (Row 2) to model a fade.";
    frag.append(note);

    // Even at 0 mm/h still show the per-orbit downlink baseline so the
    // disclosure body is never empty.
    frag.append(
      buildRainSpeedComparison(rainRateMmPerHour, current.sharedSupportedOrbits)
    );
    return frag;
  }

  const lostMs = Math.max(0, clearMs - currentMs);
  const lossFraction = clearMs > 0 ? lostMs / clearMs : 0;

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock("Clear-sky comm", formatDurationMs(clearMs)),
    buildStatBlock(
      `Comm @ ${rainRateMmPerHour} mm/h`,
      formatDurationMs(currentMs),
      lostMs > 0 ? "rain-degraded" : undefined
    ),
    buildStatBlock(
      "Comm-time lost",
      formatDurationMs(lostMs),
      lostMs > 0 ? "rain-degraded" : undefined
    ),
    buildStatBlock(
      "Comm-time impact",
      clearMs > 0 ? formatSignedPercent(-lossFraction) : "n/a",
      lostMs > 0 ? "rain-degraded" : undefined
    )
  );
  frag.append(stats);

  const speedHeading = document.createElement("p");
  speedHeading.className = "v4-projection-side-panel__rain-caption";
  speedHeading.textContent = `Modeled downlink throughput · clear sky → ${rainRateMmPerHour} mm/h`;
  frag.append(speedHeading);

  // Per-orbit throughput contrast — always moves with rain, so the link
  // degradation stays visible even when comm-time is geometry-limited.
  frag.append(
    buildRainSpeedComparison(rainRateMmPerHour, current.sharedSupportedOrbits)
  );

  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__rain-caption";
  caption.textContent =
    lostMs > 0
      ? `Rain fade removes ${formatDurationMs(lostMs)} of usable communication and cuts per-orbit throughput versus clear sky.`
      : "Comm-time is geometry-limited in this window, so rain fade shows up as the per-orbit throughput and jitter loss above.";
  frag.append(caption);

  return frag;
}

interface RainControlElements {
  readonly control: HTMLElement;
  readonly slider: HTMLInputElement;
  readonly valueEl: HTMLSpanElement;
  readonly captionEl: HTMLParagraphElement;
}

function buildRainControl(
  rainRateMmPerHour: number,
  onInput: (rainRateMmPerHour: number) => void
): RainControlElements {
  const control = document.createElement("div");
  control.className = "v4-projection-side-panel__rain-control";
  control.dataset.rainActive = rainRateMmPerHour > 0 ? "true" : "false";

  const head = document.createElement("div");
  head.className = "v4-projection-side-panel__rain-head";

  const label = document.createElement("label");
  label.className = "v4-projection-side-panel__rain-label";
  label.id = "v4-rain-rate-label";
  label.textContent = "Rain rate";

  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__rain-value";
  valueEl.textContent = `${rainRateMmPerHour} mm/h`;

  head.append(label, valueEl);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "v4-projection-side-panel__rain-slider";
  slider.min = String(RAIN_RATE_MIN_MM_PER_HOUR);
  slider.max = String(RAIN_RATE_MAX_MM_PER_HOUR);
  slider.step = String(RAIN_RATE_STEP_MM_PER_HOUR);
  slider.value = String(rainRateMmPerHour);
  slider.setAttribute("aria-labelledby", "v4-rain-rate-label");
  slider.setAttribute("aria-valuemin", String(RAIN_RATE_MIN_MM_PER_HOUR));
  slider.setAttribute("aria-valuemax", String(RAIN_RATE_MAX_MM_PER_HOUR));
  slider.setAttribute("aria-valuenow", String(rainRateMmPerHour));

  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__rain-caption";

  control.append(head, slider, caption);

  slider.addEventListener("input", () => {
    const next = Number(slider.value);
    const normalized = Number.isFinite(next) ? next : 0;
    valueEl.textContent = `${normalized} mm/h`;
    slider.setAttribute("aria-valuenow", String(normalized));
    control.dataset.rainActive = normalized > 0 ? "true" : "false";
    onInput(normalized);
  });

  return { control, slider, valueEl, captionEl: caption };
}

function setRainControlCaption(
  elements: RainControlElements,
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number
): void {
  if (rainRateMmPerHour <= 0) {
    elements.captionEl.textContent =
      "Model ITU-R P.618-14 rain fade on Ku/Ka.";
    return;
  }
  const rainNonClaim = result.truthBoundary.nonClaims.find((note) =>
    note.toLowerCase().includes("rain")
  );
  elements.captionEl.textContent =
    rainNonClaim ?? "Rain-rate attenuation applied per ITU-R P.618-14.";
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

function buildHeaderRow(
  pair: V4ResolvedStationPair,
  result: RuntimeProjectionResult,
  durationMinutes: number
): HTMLElement {
  const row = document.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__header";
  row.dataset.row = "1";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  const titleText = `${formatStationPanelName(pair.stationA.name)} ↔ ${formatStationPanelName(pair.stationB.name)}`;
  title.textContent = titleText;
  title.title = titleText;

  const tierAttribution = inferPairSourceTier(pair.stationA, pair.stationB);
  const tierBadge = document.createElement("span");
  tierBadge.className = "v4-projection-side-panel__tier-badge";
  tierBadge.dataset.tier = tierAttribution.sourceTier;
  const tierLabel =
    tierAttribution.sourceTier === "public-disclosed"
      ? "Public-disclosure"
      : "Geometric";
  tierBadge.textContent = tierLabel;

  const windowLine = document.createElement("p");
  windowLine.className = "v4-projection-side-panel__window";
  const windowText = `${formatIsoSecond(result.timeWindow.startUtc)} → ${formatIsoSecond(result.timeWindow.endUtc)} UTC · ${durationMinutes}m`;
  windowLine.textContent = windowText;
  row.setAttribute("aria-label", `${titleText} · ${tierLabel} · ${windowText}`);

  const copyLink = document.createElement("button");
  copyLink.type = "button";
  copyLink.className = "v4-projection-side-panel__copy-link";
  copyLink.title = "Copy link to clipboard";
  copyLink.setAttribute("aria-label", "Copy link to clipboard");
  copyLink.textContent = "📋";
  copyLink.addEventListener("click", () => {
    const href =
      typeof window !== "undefined" ? window.location.href : "";
    if (!href) {
      return;
    }
    const navigatorClipboard = (
      typeof navigator !== "undefined" ? navigator.clipboard : undefined
    );
    if (!navigatorClipboard) {
      return;
    }
    void navigatorClipboard.writeText(href).then(
      () => {
        copyLink.dataset.copied = "true";
        copyLink.textContent = "✓";
        window.setTimeout(() => {
          copyLink.dataset.copied = "false";
          copyLink.textContent = "📋";
        }, 1200);
      },
      () => {
        // clipboard write may fail in some sandboxes; leave the icon as-is.
      }
    );
  });

  row.append(
    title,
    buildPlainTextSeparator(),
    tierBadge,
    buildPlainTextSeparator(),
    windowLine,
    copyLink
  );
  return row;
}

function buildRainControlRow(rainControl: RainControlElements): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "2";
  row.append(rainControl.control);
  return row;
}

function buildFlatStatsRow(result: RuntimeProjectionResult): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "3";

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock(
      "Comm time",
      formatDurationMs(result.communicationStats.totalCommunicatingMs)
    ),
    buildStatBlock(
      "Handovers",
      String(result.communicationStats.handoverCount)
    )
  );
  row.append(stats);
  return row;
}

function buildVisibilityRow(
  satelliteId: string,
  orbitClass: OrbitClass,
  startUtc: string,
  endUtc: string
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "v4-projection-side-panel__list-item";
  const dur = Date.parse(endUtc) - Date.parse(startUtc);
  const sat = document.createElement("span");
  sat.className = "v4-projection-side-panel__list-primary";
  sat.textContent = `${satelliteId} · ${orbitClass}`;
  const time = document.createElement("span");
  time.className = "v4-projection-side-panel__list-secondary";
  time.textContent = `${formatIsoShort(startUtc)} – ${formatIsoShort(endUtc)}  ·  ${formatDurationMs(dur)}`;
  li.append(sat, time);
  return li;
}

function buildHandoverRow(
  event: RuntimeProjectionResult["handoverEvents"][number]
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "v4-projection-side-panel__list-item";
  if (event.reasonKind === "cross-orbit-migration") {
    li.dataset.modifier = "cross-orbit-migration";
  }
  const head = document.createElement("span");
  head.className = "v4-projection-side-panel__list-primary";
  head.textContent = `${formatIsoShort(event.handoverAtUtc)}  ${event.fromSatelliteId ?? "—"} → ${event.toSatelliteId}`;
  const reason = document.createElement("span");
  reason.className = "v4-projection-side-panel__list-secondary";
  reason.textContent =
    event.fromSatelliteId === null
      ? "initial acquisition"
      : event.reasonKind === "cross-orbit-migration"
      ? "cross-orbit migration (V-MO1)"
      : event.reasonKind.replace(/-/g, " ");
  li.append(head, reason);
  return li;
}

function pickRow4HandoverEvents(
  events: RuntimeProjectionResult["handoverEvents"]
): ReadonlyArray<RuntimeProjectionResult["handoverEvents"][number]> {
  if (events.length === 0) {
    return [];
  }
  const sortedAsc = [...events].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const head = sortedAsc.slice(0, PANEL_ROW4_HANDOVER_PREVIEW_COUNT);
  // Pin the most recent cross-orbit-migration event if it is not already
  // in the head — V-MO1 visibility requirement (IA §5 Row 4).
  const headIds = new Set(head.map((event) => event.handoverAtUtc));
  const latestCrossOrbit = [...sortedAsc]
    .reverse()
    .find(
      (event) =>
        event.reasonKind === "cross-orbit-migration" &&
        !headIds.has(event.handoverAtUtc)
    );
  return latestCrossOrbit ? [...head, latestCrossOrbit] : head;
}

function buildSummariesRow(result: RuntimeProjectionResult): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "4";

  // Visibility windows summary
  const visSection = document.createElement("section");
  visSection.className = "v4-projection-side-panel__summary-section";
  const visHeading = document.createElement("h3");
  visHeading.className = "v4-projection-side-panel__summary-heading";
  visHeading.textContent = "Visibility windows";
  const visCount = document.createElement("p");
  visCount.className = "v4-projection-side-panel__list-count";
  visCount.dataset.summaryCount = "visibility";
  visCount.dataset.totalCount = String(result.visibilityWindows.length);
  visCount.dataset.previewCount = String(
    Math.min(result.visibilityWindows.length, PANEL_ROW4_VISIBILITY_PREVIEW_COUNT)
  );
  visCount.textContent = formatSummaryCountLabel(
    result.visibilityWindows.length,
    PANEL_ROW4_VISIBILITY_PREVIEW_COUNT,
    "mutual window",
    "mutual windows"
  );
  visSection.append(visHeading, visCount);
  if (result.visibilityWindows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No mutual visibility in this window.";
    visSection.append(empty);
  } else {
    const sorted = [...result.visibilityWindows].sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) -
        Date.parse(b.intersectionStartUtc)
    );
    const head = sorted.slice(0, PANEL_ROW4_VISIBILITY_PREVIEW_COUNT);
    const list = document.createElement("ul");
    list.className = "v4-projection-side-panel__list";
    for (const w of head) {
      list.append(
        buildVisibilityRow(
          w.satelliteId,
          w.orbitClass,
          w.intersectionStartUtc,
          w.intersectionEndUtc
        )
      );
    }
    visSection.append(list);
  }

  // Link selection events summary
  const handoverSection = document.createElement("section");
  handoverSection.className = "v4-projection-side-panel__summary-section";
  const handoverHeading = document.createElement("h3");
  handoverHeading.className = "v4-projection-side-panel__summary-heading";
  handoverHeading.textContent = "Link selection events";
  const handoverCount = document.createElement("p");
  handoverCount.className = "v4-projection-side-panel__list-count";
  handoverCount.dataset.summaryCount = "handover";
  handoverCount.dataset.totalCount = String(result.handoverEvents.length);
  handoverCount.dataset.previewCount = String(
    pickRow4HandoverEvents(result.handoverEvents).length
  );
  handoverCount.textContent = formatSummaryCountLabel(
    result.handoverEvents.length,
    PANEL_ROW4_HANDOVER_PREVIEW_COUNT,
    "event",
    "events"
  );
  handoverSection.append(handoverHeading, handoverCount);
  if (result.handoverEvents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent =
      "No handover events triggered by the cross-orbit-live policy in this window.";
    handoverSection.append(empty);
  } else {
    const head = pickRow4HandoverEvents(result.handoverEvents);
    const list = document.createElement("ul");
    list.className = "v4-projection-side-panel__list";
    for (const event of head) {
      list.append(buildHandoverRow(event));
    }
    handoverSection.append(list);
  }

  row.append(visSection, handoverSection);
  return row;
}

function buildDisclosure(
  label: string,
  bodyChildren: ReadonlyArray<Node>,
  bodyScroll: boolean,
  detailsAttrs?: { [key: string]: string }
): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "v4-projection-side-panel__details";
  if (detailsAttrs) {
    for (const [k, v] of Object.entries(detailsAttrs)) {
      details.dataset[k] = v;
    }
  }
  const summary = document.createElement("summary");
  summary.className = "v4-projection-side-panel__details-summary";
  summary.textContent = label;
  const body = document.createElement("div");
  body.className = bodyScroll
    ? "v4-projection-side-panel__details-body v4-projection-side-panel__details-body--scroll"
    : "v4-projection-side-panel__details-body";
  for (const child of bodyChildren) {
    body.append(child);
  }
  details.append(summary, body);
  return details;
}

function buildAllVisibilityList(
  windows: ReadonlyArray<PairVisibilityWindow>
): HTMLElement {
  if (windows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No mutual visibility windows in this projection.";
    return empty;
  }
  const sorted = [...windows]
    .sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) - Date.parse(b.intersectionStartUtc)
    )
    .slice(0, PANEL_ROW5_VISIBILITY_MAX_ROWS);
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";
  for (const w of sorted) {
    list.append(
      buildVisibilityRow(
        w.satelliteId,
        w.orbitClass,
        w.intersectionStartUtc,
        w.intersectionEndUtc
      )
    );
  }
  return list;
}

function buildAllHandoverList(
  events: RuntimeProjectionResult["handoverEvents"]
): HTMLElement {
  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent =
      "No handover events triggered by the cross-orbit-live policy (TR 38.821 §7.3 + V-MO1) in this window.";
    return empty;
  }
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";
  for (const event of sorted.slice(0, PANEL_ROW5_HANDOVER_MAX_ROWS)) {
    list.append(buildHandoverRow(event));
  }
  return list;
}

function buildNonClaimsBlock(
  truthBoundary: RuntimeProjectionResult["truthBoundary"]
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className =
    "v4-projection-side-panel__section v4-projection-side-panel__section--non-claims";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Non-claims · ${truthBoundary.sourceTier}`;
  wrapper.append(heading);
  if (truthBoundary.nonClaims.length === 0) {
    return wrapper;
  }
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const note of truthBoundary.nonClaims) {
    const li = document.createElement("li");
    li.textContent = note;
    list.append(li);
  }
  wrapper.append(list);
  return wrapper;
}

function buildStandardsReferences(): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Standards references";
  wrapper.append(heading);
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  const refs = [
    "Handover policy: TR 38.821 §7.3 + V-MO1 (cross-orbit live)",
    "Rain attenuation: ITU-R P.618-14 §2.2.1",
    "Gas absorption: ITU-R P.676-13"
  ];
  for (const ref of refs) {
    const li = document.createElement("li");
    li.textContent = ref;
    list.append(li);
  }
  wrapper.append(list);
  return wrapper;
}

function buildMeanDwellBlock(result: RuntimeProjectionResult): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-projection-side-panel__mean-dwell";
  const label = document.createElement("span");
  label.className = "v4-projection-side-panel__mean-dwell-label";
  label.textContent = "Mean dwell";
  const value = document.createElement("span");
  value.className = "v4-projection-side-panel__mean-dwell-value";
  value.textContent = formatDurationMs(
    result.communicationStats.meanLinkDwellMs
  );
  block.append(label, value);
  return block;
}

function buildDisclosuresRow(
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number,
  clearSky: RuntimeProjectionResult
): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "5";

  // d1 Rain impact — scroll mode so the body caps at the same height as
  // d2/d3 and the panel root never overflows when any single disclosure
  // is open (G5 IA §9.1 + IA §9.2). The rain-impact body is shorter than
  // the cap on typical pairs so scroll only engages at extreme content
  // heights.
  const rainBody = buildRainImpactBody(rainRateMmPerHour, result, clearSky);
  row.append(
    buildDisclosure("Rain impact", [rainBody], true, {
      disclosure: "rain-impact"
    })
  );

  // d2 All visibility windows
  const csvButton = buildDownloadCsvButton(result);
  const visList = buildAllVisibilityList(result.visibilityWindows);
  row.append(
    buildDisclosure("All visibility windows", [csvButton, visList], true, {
      disclosure: "all-visibility"
    })
  );

  // d3 Sources + non-claims
  const handoverList = buildAllHandoverList(result.handoverEvents);
  const nonClaims = buildNonClaimsBlock(result.truthBoundary);
  const standards = buildStandardsReferences();
  const meanDwell = buildMeanDwellBlock(result);
  row.append(
    buildDisclosure(
      "Sources + non-claims",
      [handoverList, nonClaims, standards, meanDwell],
      true,
      { disclosure: "sources-non-claims" }
    )
  );

  return row;
}

function buildFooterRow(result: RuntimeProjectionResult): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "6";
  const footer = document.createElement("p");
  footer.className = "v4-projection-side-panel__footer";
  footer.textContent = `${result.truthBoundary.precisionLabel} · ${result.truthBoundary.sourceTier}`;
  row.append(footer);
  return row;
}

interface RenderResultOptions {
  readonly rainRateMmPerHour: number;
  readonly clearSky: RuntimeProjectionResult;
  readonly rainControl: RainControlElements;
  readonly durationMinutes: number;
}

function renderResult(
  root: HTMLElement,
  pair: V4ResolvedStationPair,
  result: RuntimeProjectionResult,
  options: RenderResultOptions
): void {
  const { rainRateMmPerHour, clearSky, rainControl, durationMinutes } = options;

  // Preserve slider focus across re-renders: the rain control node is reused,
  // not recreated, so the user can keep dragging while the panel recomputes.
  const sliderWasFocused = document.activeElement === rainControl.slider;

  root.replaceChildren();
  root.dataset.state = "ready";
  root.dataset.sourceTier = result.truthBoundary.sourceTier;
  root.dataset.rainRateMmPerHour = String(rainRateMmPerHour);

  setRainControlCaption(rainControl, result, rainRateMmPerHour);

  root.append(
    buildHeaderRow(pair, result, durationMinutes),
    buildRainControlRow(rainControl),
    buildFlatStatsRow(result),
    buildSummariesRow(result),
    buildDisclosuresRow(result, rainRateMmPerHour, clearSky),
    buildFooterRow(result)
  );

  if (sliderWasFocused) {
    rainControl.slider.focus();
  }
}

export interface V4ProjectionSidePanelInput {
  readonly resolvedPair: V4ResolvedStationPair | null;
}

export interface V4ProjectionSidePanelHandle {
  /**
   * Subscribe to the latest runtime projection result the panel has rendered.
   * Fires immediately with the current result (if any) and again on each
   * recompute. Returns an unsubscribe function. Used by the replay event
   * pill (§4.3.1) to observe `handoverEvents` without re-running compute.
   */
  subscribeRuntimeResult(
    listener: (result: RuntimeProjectionResult | null) => void
  ): () => void;
  dispose(): void;
}

export function mountV4ProjectionSidePanel(
  viewerContainer: HTMLElement,
  input: V4ProjectionSidePanelInput
): V4ProjectionSidePanelHandle | null {
  if (!input.resolvedPair) {
    return null;
  }
  const pair = input.resolvedPair;

  injectPanelStyleOnce();

  const root = createPanelShell();
  viewerContainer.appendChild(root);

  let disposed = false;
  renderLoading(root, pair);

  // Inputs cached after the first load so the projection can re-run without
  // re-fetching TLE fixtures while the worker keeps compute off the UI thread.
  const projectionClient = createRuntimeProjectionWorkerClient();
  let tleRecords: ReadonlyArray<TleRecord> | null = null;
  let timeWindow: { startUtc: string; endUtc: string } | null = null;
  let durationMinutes = DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
  let clearSkyResult: RuntimeProjectionResult | null = null;
  let rainControl: RainControlElements | null = null;
  let currentRainRate = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let computeRequestSeq = 0;
  let latestResult: RuntimeProjectionResult | null = null;
  const runtimeResultListeners = new Set<
    (result: RuntimeProjectionResult | null) => void
  >();

  function publishRuntimeResult(result: RuntimeProjectionResult | null): void {
    latestResult = result;
    for (const listener of runtimeResultListeners) {
      try {
        listener(result);
      } catch {
        // Listener errors must not break the panel render loop.
      }
    }
  }

  async function recompute(rainRateMmPerHour: number): Promise<void> {
    if (disposed || !tleRecords || !timeWindow || !clearSkyResult || !rainControl) {
      return;
    }
    const requestSeq = ++computeRequestSeq;
    currentRainRate = rainRateMmPerHour;
    try {
      const result = await projectionClient.compute({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow,
        tleRecords,
        rainRateMmPerHour
      });
      if (disposed || requestSeq !== computeRequestSeq || !rainControl) {
        return;
      }
      if (rainRateMmPerHour <= 0) {
        clearSkyResult = result;
      }
      renderResult(root, pair, result, {
        rainRateMmPerHour,
        clearSky: clearSkyResult,
        rainControl,
        durationMinutes
      });
      publishRuntimeResult(result);
    } catch (error) {
      if (disposed || requestSeq !== computeRequestSeq) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while computing runtime projection.";
      renderError(root, message);
    }
  }

  function onSliderInput(rainRateMmPerHour: number): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void recompute(rainRateMmPerHour);
    }, RAIN_RECOMPUTE_DEBOUNCE_MS);
  }

  void (async () => {
    try {
      const sources = await loadDefaultTleSources();
      if (disposed) {
        return;
      }
      tleRecords = parseRuntimeTleSources(sources);
      const resolved = resolveProjectionTimeWindowAndDuration();
      timeWindow = resolved.window;
      durationMinutes = resolved.durationMinutes;
      const requestSeq = ++computeRequestSeq;
      clearSkyResult = await projectionClient.compute({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow,
        tleRecords,
        rainRateMmPerHour: 0
      });
      if (disposed || requestSeq !== computeRequestSeq) {
        return;
      }
      rainControl = buildRainControl(currentRainRate, onSliderInput);
      renderResult(root, pair, clearSkyResult, {
        rainRateMmPerHour: currentRainRate,
        clearSky: clearSkyResult,
        rainControl,
        durationMinutes
      });
      publishRuntimeResult(clearSkyResult);
    } catch (error) {
      if (disposed) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while loading TLE fixtures.";
      renderError(root, message);
    }
  })();

  return {
    subscribeRuntimeResult(
      listener: (result: RuntimeProjectionResult | null) => void
    ): () => void {
      runtimeResultListeners.add(listener);
      // Fire immediately with the current result so the subscriber does
      // not have to wait for the next recompute to receive its first
      // observation. Mirrors the pattern in selection-store.subscribe.
      try {
        listener(latestResult);
      } catch {
        // Subscriber errors must not propagate into the mount return.
      }
      return () => {
        runtimeResultListeners.delete(listener);
      };
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      runtimeResultListeners.clear();
      projectionClient.dispose();
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
