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
import type { OrbitClass, PairVisibilityWindow } from "./visibility-utils";
import type { TleRecord } from "./visibility-utils";
import type { V4ResolvedStationPair } from "./v4-route-selection";

const PANEL_MAX_VISIBILITY_ROWS = 8;
const PANEL_MAX_HANDOVER_ROWS = 6;
const DEFAULT_DEMO_PROJECTION_DURATION_MINUTES = 360;
const MIN_DEMO_PROJECTION_DURATION_MINUTES = 20;
const MAX_DEMO_PROJECTION_DURATION_MINUTES = 480;
const START_UTC_PARAM = "startUtc";
const DURATION_MINUTES_PARAM = "durationMinutes";

const RAIN_RATE_MIN_MM_PER_HOUR = 0;
const RAIN_RATE_MAX_MM_PER_HOUR = 100;
const RAIN_RATE_STEP_MM_PER_HOUR = 5;
const RAIN_RECOMPUTE_DEBOUNCE_MS = 150;

const RAIN_CONTROL_STYLE_ATTR = "data-v4-rain-control-style";

const RAIN_CONTROL_CSS = `
.v4-projection-side-panel__rain-control {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  padding: 0.55rem 0.65rem 0.6rem;
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
.v4-projection-side-panel__download-csv {
  grid-column: 1 / -1;
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
`;

function injectRainControlStyleOnce(): void {
  if (document.head.querySelector(`[${RAIN_CONTROL_STYLE_ATTR}="true"]`)) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute(RAIN_CONTROL_STYLE_ATTR, "true");
  style.textContent = RAIN_CONTROL_CSS;
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

function formatProjectionDuration(window: {
  startUtc: string;
  endUtc: string;
}): string {
  const durationMs = Date.parse(window.endUtc) - Date.parse(window.startUtc);
  return formatDurationMs(durationMs);
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

function clampDurationMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
  }
  return Math.min(
    Math.max(Math.round(value), MIN_DEMO_PROJECTION_DURATION_MINUTES),
    MAX_DEMO_PROJECTION_DURATION_MINUTES
  );
}

function resolveProjectionTimeWindow(): { startUtc: string; endUtc: string } {
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
  return buildDefaultTimeWindow(startUtc, durationMinutes);
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

function formatOrbitCommunicationTimes(result: RuntimeProjectionResult): string {
  if (result.sharedSupportedOrbits.length === 0) {
    return "none";
  }
  return result.sharedSupportedOrbits
    .map((orbit) => `${orbit} ${formatDurationMs(result.communicationStats.byOrbit[orbit])}`)
    .join(" · ");
}

function buildProjectionStatus(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Scenario status";
  wrapper.append(heading);

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  const status = document.createElement("li");
  status.className = "v4-projection-side-panel__list-item";
  const statusPrimary = document.createElement("span");
  statusPrimary.className = "v4-projection-side-panel__list-primary";
  const statusSecondary = document.createElement("span");
  statusSecondary.className = "v4-projection-side-panel__list-secondary";
  if (result.communicationStats.totalCommunicatingMs <= 0) {
    statusPrimary.textContent = "No mutual communication in this window";
    statusSecondary.textContent =
      "The selected stations share no visible satellite above the elevation threshold for this projection window.";
  } else {
    statusPrimary.textContent = "Selected-pair projection is active";
    statusSecondary.textContent =
      `${formatCountLabel(
        result.visibilityWindows.length,
        "mutual window",
        "mutual windows"
      )} · ${formatCountLabel(
        result.communicationStats.handoverCount,
        "handover",
        "handovers"
      )} · TLE-derived geometry`;
  }
  status.append(statusPrimary, statusSecondary);
  list.append(status);

  if (result.communicationStats.handoverCount === 0) {
    const handover = document.createElement("li");
    handover.className = "v4-projection-side-panel__list-item";
    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__list-primary";
    primary.textContent = "No handover event in this window";
    const secondary = document.createElement("span");
    secondary.className = "v4-projection-side-panel__list-secondary";
    secondary.textContent =
      "The pair may still communicate; this window does not exercise the handover policy.";
    handover.append(primary, secondary);
    list.append(handover);
  }

  const boundary = document.createElement("li");
  boundary.className = "v4-projection-side-panel__list-item";
  const boundaryPrimary = document.createElement("span");
  boundaryPrimary.className = "v4-projection-side-panel__list-primary";
  boundaryPrimary.textContent = "Display boundary";
  const boundarySecondary = document.createElement("span");
  boundarySecondary.className = "v4-projection-side-panel__list-secondary";
  boundarySecondary.textContent =
    "Panel and CSV follow selected-pair modeled projection; globe selected-pair cues use TLE-derived display lanes, not measured service telemetry.";
  boundary.append(boundaryPrimary, boundarySecondary);
  list.append(boundary);

  wrapper.append(list);
  return wrapper;
}

function buildProjectionSummary(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Scenario status";
  wrapper.append(heading);

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  const status = document.createElement("li");
  status.className = "v4-projection-side-panel__list-item";
  const statusPrimary = document.createElement("span");
  statusPrimary.className = "v4-projection-side-panel__list-primary";
  const statusSecondary = document.createElement("span");
  statusSecondary.className = "v4-projection-side-panel__list-secondary";

  if (result.communicationStats.totalCommunicatingMs <= 0) {
    statusPrimary.textContent = "No mutual communication";
    statusSecondary.textContent = "No shared visible satellite in this projection window.";
  } else {
    statusPrimary.textContent = `${formatCountLabel(
      result.visibilityWindows.length,
      "mutual window",
      "mutual windows"
    )} · ${formatCountLabel(
      result.communicationStats.handoverCount,
      "handover",
      "handovers"
    )}`;
    statusSecondary.textContent = "TLE-derived selected-pair projection";
  }

  status.append(statusPrimary, statusSecondary);
  list.append(status);
  wrapper.append(list);
  return wrapper;
}

function buildDetailedStats(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Projection metrics";

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock("Mean dwell", formatDurationMs(result.communicationStats.meanLinkDwellMs)),
    buildStatBlock("Orbit comm time", formatOrbitCommunicationTimes(result))
  );

  wrapper.append(heading, stats);
  return wrapper;
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

function buildVisibilityWindowList(
  windows: ReadonlyArray<PairVisibilityWindow>
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Pair visibility windows (${windows.length})`;
  wrapper.append(heading);

  if (windows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No satellite is mutually visible to both stations in the time window.";
    wrapper.append(empty);
    return wrapper;
  }

  const sorted = [...windows]
    .sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) - Date.parse(b.intersectionStartUtc)
    )
    .slice(0, PANEL_MAX_VISIBILITY_ROWS);

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  for (const w of sorted) {
    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    const dur = Date.parse(w.intersectionEndUtc) - Date.parse(w.intersectionStartUtc);
    li.innerHTML = "";
    const sat = document.createElement("span");
    sat.className = "v4-projection-side-panel__list-primary";
    sat.textContent = `${w.satelliteId} · ${w.orbitClass}`;
    const time = document.createElement("span");
    time.className = "v4-projection-side-panel__list-secondary";
    time.textContent = `${formatIsoShort(w.intersectionStartUtc)} – ${formatIsoShort(w.intersectionEndUtc)}  ·  ${formatDurationMs(dur)}`;
    li.append(sat, time);
    list.append(li);
  }

  wrapper.append(list);

  if (windows.length > PANEL_MAX_VISIBILITY_ROWS) {
    const more = document.createElement("p");
    more.className = "v4-projection-side-panel__more";
    more.textContent = `+${windows.length - PANEL_MAX_VISIBILITY_ROWS} more windows`;
    wrapper.append(more);
  }

  return wrapper;
}

function buildHandoverEventList(
  events: RuntimeProjectionResult["handoverEvents"]
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Link selection events (${events.length})`;
  wrapper.append(heading);

  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No handover events triggered by the cross-orbit-live policy (TR 38.821 §7.3 + V-MO1) in this window.";
    wrapper.append(empty);
    return wrapper;
  }

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  for (const e of events.slice(0, PANEL_MAX_HANDOVER_ROWS)) {
    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    if (e.reasonKind === "cross-orbit-migration") {
      // V-MO1 cross-orbit live migration — highlight visually so a reviewer
      // can distinguish it from same-orbit handovers without reading the
      // truth-boundary non-claims.
      li.dataset.modifier = "cross-orbit-migration";
    }
    const head = document.createElement("span");
    head.className = "v4-projection-side-panel__list-primary";
    head.textContent = `${formatIsoShort(e.handoverAtUtc)}  ${e.fromSatelliteId ?? "—"} → ${e.toSatelliteId}`;
    const reason = document.createElement("span");
    reason.className = "v4-projection-side-panel__list-secondary";
    reason.textContent =
      e.fromSatelliteId === null
        ? "initial acquisition"
        : e.reasonKind === "cross-orbit-migration"
        ? "cross-orbit migration (V-MO1)"
        : e.reasonKind.replace(/-/g, " ");
    li.append(head, reason);
    list.append(li);
  }

  wrapper.append(list);

  if (events.length > PANEL_MAX_HANDOVER_ROWS) {
    const more = document.createElement("p");
    more.className = "v4-projection-side-panel__more";
    more.textContent = `+${events.length - PANEL_MAX_HANDOVER_ROWS} more events`;
    wrapper.append(more);
  }

  return wrapper;
}

function buildNonClaims(
  truthBoundary: RuntimeProjectionResult["truthBoundary"]
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section v4-projection-side-panel__section--non-claims";

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
 * Rain-attenuation impact summary. Contrasts a clear-sky baseline projection
 * (0 mm/h) against the current rain rate so the user can see the degradation.
 */
function buildRainImpactSection(
  rainRateMmPerHour: number,
  current: RuntimeProjectionResult,
  clearSky: RuntimeProjectionResult
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Rain attenuation";
  wrapper.append(heading);

  const clearMs = clearSky.communicationStats.totalCommunicatingMs;
  const currentMs = current.communicationStats.totalCommunicatingMs;

  if (rainRateMmPerHour <= 0) {
    const note = document.createElement("p");
    note.className = "v4-projection-side-panel__empty";
    note.textContent =
      "Clear sky — no rain attenuation applied. Raise the rain rate to model an ITU-R P.618-14 fade.";
    wrapper.append(note);
    return wrapper;
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
  wrapper.append(stats);

  const speedHeading = document.createElement("p");
  speedHeading.className = "v4-projection-side-panel__rain-caption";
  speedHeading.textContent = `Modeled downlink throughput · clear sky → ${rainRateMmPerHour} mm/h`;
  wrapper.append(speedHeading);

  // Per-orbit throughput contrast — always moves with rain, so the link
  // degradation stays visible even when comm-time is geometry-limited.
  wrapper.append(
    buildRainSpeedComparison(rainRateMmPerHour, current.sharedSupportedOrbits)
  );

  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__rain-caption";
  caption.textContent =
    lostMs > 0
      ? `Rain fade removes ${formatDurationMs(lostMs)} of usable communication and cuts per-orbit throughput versus clear sky.`
      : "Comm-time is geometry-limited in this window, so rain fade shows up as the per-orbit throughput and jitter loss above.";
  wrapper.append(caption);

  return wrapper;
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

function buildProjectionDetails(
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number,
  clearSky: RuntimeProjectionResult
): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "v4-projection-side-panel__details";

  const summary = document.createElement("summary");
  summary.className = "v4-projection-side-panel__details-summary";
  summary.textContent = "Details";

  const body = document.createElement("div");
  body.className = "v4-projection-side-panel__details-body";
  body.append(
    buildDownloadCsvButton(result),
    buildProjectionStatus(result),
    buildDetailedStats(result),
    buildRainImpactSection(rainRateMmPerHour, result, clearSky),
    buildVisibilityWindowList(result.visibilityWindows),
    buildHandoverEventList(result.handoverEvents),
    buildNonClaims(result.truthBoundary)
  );

  details.append(summary, body);
  return details;
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

interface RenderResultOptions {
  readonly rainRateMmPerHour: number;
  readonly clearSky: RuntimeProjectionResult;
  readonly rainControl: RainControlElements;
}

function renderResult(
  root: HTMLElement,
  pair: V4ResolvedStationPair,
  result: RuntimeProjectionResult,
  options: RenderResultOptions
): void {
  const { rainRateMmPerHour, clearSky, rainControl } = options;

  // Preserve slider focus across re-renders: the rain control node is reused,
  // not recreated, so the user can keep dragging while the panel recomputes.
  const sliderWasFocused = document.activeElement === rainControl.slider;

  root.replaceChildren();
  root.dataset.state = "ready";
  root.dataset.sourceTier = result.truthBoundary.sourceTier;
  root.dataset.rainRateMmPerHour = String(rainRateMmPerHour);

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = `${formatStationPanelName(
    pair.stationA.name
  )} → ${formatStationPanelName(pair.stationB.name)}`;

  const windowLine = document.createElement("p");
  windowLine.className = "v4-projection-side-panel__window";
  windowLine.textContent = `${formatProjectionDuration(result.timeWindow)} selected-pair projection`;

  setRainControlCaption(rainControl, result, rainRateMmPerHour);

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock("Comm time", formatDurationMs(result.communicationStats.totalCommunicatingMs)),
    buildStatBlock("Handovers", String(result.communicationStats.handoverCount))
  );

  root.append(
    title,
    windowLine,
    buildProjectionSummary(result),
    rainControl.control,
    stats,
    buildProjectionDetails(result, rainRateMmPerHour, clearSky)
  );

  if (sliderWasFocused) {
    rainControl.slider.focus();
  }
}

export interface V4ProjectionSidePanelInput {
  readonly resolvedPair: V4ResolvedStationPair | null;
}

export interface V4ProjectionSidePanelHandle {
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

  injectRainControlStyleOnce();

  const root = createPanelShell();
  viewerContainer.appendChild(root);

  let disposed = false;
  renderLoading(root, pair);

  // Inputs cached after the first load so the projection can re-run without
  // re-fetching TLE fixtures while the worker keeps compute off the UI thread.
  const projectionClient = createRuntimeProjectionWorkerClient();
  let tleRecords: ReadonlyArray<TleRecord> | null = null;
  let timeWindow: { startUtc: string; endUtc: string } | null = null;
  let clearSkyResult: RuntimeProjectionResult | null = null;
  let rainControl: RainControlElements | null = null;
  let currentRainRate = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let computeRequestSeq = 0;

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
        rainControl
      });
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
      timeWindow = resolveProjectionTimeWindow();
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
        rainControl
      });
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
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      projectionClient.dispose();
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
