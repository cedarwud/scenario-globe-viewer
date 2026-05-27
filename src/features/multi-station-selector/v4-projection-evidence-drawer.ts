import {
  computeLinkBudgetMetricsForOrbit,
  type RuntimeProjectionResult
} from "./runtime-projection";
import {
  buildRuntimeProjectionEvidenceReportFilename,
  buildRuntimeProjectionEvidenceReportHtml
} from "./runtime-projection-evidence-report";
import type { OrbitClass } from "./visibility-utils";

export const PANEL_EVIDENCE_DRAWER_ID = "v4-selected-pair-evidence";

const PANEL_EVIDENCE_COVERAGE_SEGMENT_LIMIT = 28;
const PANEL_EVIDENCE_EVENT_MARKER_LIMIT = 24;
const ORBIT_DISPLAY_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

interface EvidenceCoverageSegment {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly startPercent: number;
  readonly widthPercent: number;
}

interface EvidenceRailMarker {
  readonly handoverAtUtc: string;
  readonly leftPercent: number;
  readonly kind: "acquisition" | "handover" | "cross-orbit";
  readonly label: string;
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

function formatUtcClock(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  return new Date(ms).toISOString().slice(11, 16);
}

function formatUtcClockWithSeconds(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  return new Date(ms).toISOString().slice(11, 19);
}

function formatSatelliteShort(satelliteId: string | null): string {
  if (!satelliteId) {
    return "—";
  }
  const trimmed = satelliteId.trim();
  if (trimmed.length <= 22) {
    return trimmed;
  }
  return `${trimmed.slice(0, 19)}...`;
}

function formatReasonLabel(
  reasonKind: RuntimeProjectionResult["handoverEvents"][number]["reasonKind"],
  fromSatelliteId: string | null
): string {
  if (fromSatelliteId === null) {
    return "Initial acquisition";
  }
  if (reasonKind === "cross-orbit-migration") {
    return "Cross-orbit migration (V-MO1)";
  }
  return reasonKind.replace(/-/g, " ");
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

function sampleEvenly<T>(items: ReadonlyArray<T>, limit: number): ReadonlyArray<T> {
  if (items.length <= limit) {
    return items;
  }
  if (limit <= 1) {
    return items.slice(0, 1);
  }
  const sampled: T[] = [];
  const used = new Set<number>();
  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round((index * (items.length - 1)) / (limit - 1));
    if (!used.has(sourceIndex)) {
      used.add(sourceIndex);
      sampled.push(items[sourceIndex]);
    }
  }
  return sampled;
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resolveSourceBadgeLabel(
  attribution: RuntimeProjectionResult["dataCompleteness"]["pairSourceAttribution"]
): string {
  if (attribution.sourceTier === "public-disclosed") {
    return "Public source";
  }
  if (attribution.evidenceKind === "same-operator-family-inferred") {
    return "Same-family inferred";
  }
  return "Geometry only";
}

function resolveSatelliteOrbitClass(
  result: RuntimeProjectionResult,
  satelliteId: string
): OrbitClass {
  const windowOrbit = result.visibilityWindows.find(
    (entry) => entry.satelliteId === satelliteId
  )?.orbitClass;
  if (windowOrbit) {
    return windowOrbit;
  }
  for (const orbit of ORBIT_DISPLAY_ORDER) {
    if (
      result.visibleConstellations[orbit].some(
        (entry) => entry.satelliteId === satelliteId
      )
    ) {
      return orbit;
    }
  }
  return result.sharedSupportedOrbits[0] ?? "LEO";
}

function computeProjectionPairMidpointHeightAboveSeaKm(
  result: RuntimeProjectionResult
): number {
  return (result.pair.stationA.elevationM + result.pair.stationB.elevationM) / 2000;
}

function downloadRuntimeProjectionEvidenceReport(
  result: RuntimeProjectionResult
): void {
  const html = buildRuntimeProjectionEvidenceReportHtml(result);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildRuntimeProjectionEvidenceReportFilename(result);
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function buildDownloadEvidenceReportButton(
  result: RuntimeProjectionResult,
  label = "Download evidence report"
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__download-report";
  button.textContent = label;
  button.setAttribute("aria-label", "Download evidence report");
  button.addEventListener("click", () => {
    downloadRuntimeProjectionEvidenceReport(result);
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

function buildStationCoordinateSourceBlock(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  wrapper.dataset.stationCoordinateSourceDisclosure = "true";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Station coordinate sources";

  const summary = document.createElement("p");
  summary.className = "v4-projection-side-panel__empty";
  summary.textContent =
    "Coordinate precision describes coordinate use; coordinate source authority describes the public source class.";

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const [index, station] of result.dataCompleteness.stationPrecision.entries()) {
    const slot = index === 0 ? "A" : "B";
    const li = document.createElement("li");
    li.textContent =
      `${slot} ${station.stationId}: ${station.coordinateSourceAuthority} · ` +
      `${station.disclosurePrecision} · ${station.coordinateSourceNote}`;
    list.append(li);
  }

  wrapper.append(heading, summary, list);
  return wrapper;
}

function buildPolicyDisclosureBlock(result: RuntimeProjectionResult): HTMLElement {
  const disclosure = result.dataCompleteness.policyDisclosure;
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  wrapper.dataset.policyDisclosure = "true";
  wrapper.dataset.activePolicyId = disclosure.activePolicyId;
  const thresholds = disclosure.thresholds;
  wrapper.dataset.latencyBudgetMs = String(thresholds.latencyBudgetMs ?? "");
  wrapper.dataset.hysteresisDb = String(thresholds.hysteresisDb);
  wrapper.dataset.minVisibilityWindowMs = String(
    thresholds.minVisibilityWindowMs
  );
  wrapper.dataset.elevationThresholdDeg = String(
    thresholds.elevationThresholdDeg
  );

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Policy";

  const summary = document.createElement("p");
  summary.className = "v4-projection-side-panel__empty";
  summary.textContent = `${disclosure.activePolicyId} · elevation ${thresholds.elevationThresholdDeg}° · hysteresis ${thresholds.hysteresisDb} dB · min window ${Math.round(thresholds.minVisibilityWindowMs / 1000)}s · latency ${thresholds.latencyBudgetMs ?? "n/a"} ms`;

  wrapper.append(heading, summary);
  return wrapper;
}

function buildCapDisclosureBlock(result: RuntimeProjectionResult): HTMLElement {
  const capDisclosure = result.dataCompleteness.capDisclosure;
  const inventoryDisclosure = result.dataCompleteness.runtimeInventoryDisclosure;
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  wrapper.dataset.capDisclosure = "true";
  wrapper.dataset.runtimeInventoryDisclosure = "true";
  for (const orbit of ORBIT_DISPLAY_ORDER) {
    const prefix = orbit.toLowerCase();
    const inventory = inventoryDisclosure.perOrbit[orbit];
    wrapper.dataset[`${prefix}InventorySourceMode`] =
      inventory.inventorySourceMode;
    wrapper.dataset[`${prefix}NetworkSnapshotInventoryCount`] = String(
      inventory.networkSnapshotInventoryCount ?? ""
    );
    wrapper.dataset[`${prefix}LocalFallbackInventoryCount`] = String(
      inventory.localFallbackInventoryCount ?? ""
    );
    wrapper.dataset[`${prefix}ActiveInventoryCount`] = String(
      inventory.activeInventoryCount
    );
    wrapper.dataset[`${prefix}AcceptedRecordCount`] = String(
      inventory.acceptedRecordCount
    );
    wrapper.dataset[`${prefix}RuntimeCap`] = String(inventory.runtimeCap);
    wrapper.dataset[`${prefix}VisibleActorCount`] = String(
      inventory.visibleActorCount
    );
    wrapper.dataset[`${prefix}Cap`] = String(capDisclosure.perOrbitCap[orbit]);
    wrapper.dataset[`${prefix}Inventory`] = String(
      capDisclosure.perOrbitInventory[orbit]
    );
    wrapper.dataset[`${prefix}CappedAtRuntime`] = String(
      capDisclosure.cappedAtRuntime[orbit]
    );
  }

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Runtime inventory";
  const note = document.createElement("p");
  note.className = "v4-projection-side-panel__empty";
  note.textContent = inventoryDisclosure.note;
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const orbit of ORBIT_DISPLAY_ORDER) {
    const inventory = inventoryDisclosure.perOrbit[orbit];
    const li = document.createElement("li");
    const capped = inventory.cappedAtRuntime ? "capped" : "uncapped";
    const networkCount =
      inventory.networkSnapshotInventoryCount === null
        ? "unavailable"
        : String(inventory.networkSnapshotInventoryCount);
    const localFallbackCount =
      inventory.localFallbackInventoryCount === null
        ? "unavailable"
        : String(inventory.localFallbackInventoryCount);
    li.textContent =
      `${orbit}: source ${inventory.inventorySourceMode} · network ${networkCount} · ` +
      `local fallback ${localFallbackCount} · active ${inventory.activeInventoryCount} · ` +
      `accepted ${inventory.acceptedRecordCount} · cap ${inventory.runtimeCap} · ` +
      `${capped} · visible ${inventory.visibleActorCount}`;
    list.append(li);
  }
  wrapper.append(heading, note, list);
  return wrapper;
}

function buildMetricAnchorDisclosureBlock(result: RuntimeProjectionResult): HTMLElement {
  const disclosure = result.dataCompleteness.metricAnchorDisclosure;
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  wrapper.dataset.metricAnchorDisclosure = "true";
  wrapper.dataset.carrierSelection = disclosure.carrierSelection ?? "";
  wrapper.dataset.capacityModel = disclosure.capacityModel ?? "";
  wrapper.dataset.jitterModel = disclosure.jitterModel ?? "";
  wrapper.dataset.delayModel = disclosure.delayModel ?? "";
  wrapper.dataset.activePolicyId = disclosure.activePolicyId;
  wrapper.dataset.latencyBudgetMs = String(
    disclosure.policyThresholds.latencyBudgetMs ?? ""
  );
  wrapper.dataset.hysteresisDb = String(disclosure.policyThresholds.hysteresisDb);
  wrapper.dataset.minVisibilityWindowMs = String(
    disclosure.policyThresholds.minVisibilityWindowMs
  );
  wrapper.dataset.elevationThresholdDeg = String(
    disclosure.policyThresholds.elevationThresholdDeg
  );

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Metric anchors";
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  const rows = [
    ["Carrier selection", disclosure.carrierSelection],
    ["Capacity model", disclosure.capacityModel],
    ["Jitter model", disclosure.jitterModel],
    ["Delay model", disclosure.delayModel],
    [
      "Policy thresholds",
      `${disclosure.activePolicyId}: elevation ${disclosure.policyThresholds.elevationThresholdDeg}° · hysteresis ${disclosure.policyThresholds.hysteresisDb} dB · min window ${Math.round(disclosure.policyThresholds.minVisibilityWindowMs / 1000)}s · latency ${disclosure.policyThresholds.latencyBudgetMs ?? "n/a"} ms`
    ],
    ["Non-claim", disclosure.nonClaim]
  ] as const;
  for (const [label, value] of rows) {
    const li = document.createElement("li");
    li.textContent = `${label}: ${value ?? "unavailable"}`;
    list.append(li);
  }
  wrapper.append(heading, list);
  return wrapper;
}

function buildStandardsReferences(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Standards references";
  wrapper.append(heading);
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  const refs = [
    `Handover policy: TR 38.821 §7.3 + V-MO1 (${result.dataCompleteness.policyDisclosure.activePolicyId})`,
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

function formatEvidenceDurationMs(ms: number): string {
  if (ms < 60 * 60_000) {
    return formatDurationMs(ms);
  }
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - hours * 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function resolveEvidenceTimeWindow(result: RuntimeProjectionResult): {
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
} {
  const startMs = Date.parse(result.timeWindow.startUtc);
  const endMs = Date.parse(result.timeWindow.endUtc);
  const durationMs = endMs - startMs;
  return { startMs, endMs, durationMs };
}

function percentInEvidenceWindow(
  ms: number,
  window: ReturnType<typeof resolveEvidenceTimeWindow>
): number {
  if (!Number.isFinite(ms) || window.durationMs <= 0) {
    return 0;
  }
  return clampPercent(((ms - window.startMs) / window.durationMs) * 100);
}

function buildEvidenceHealthCell(
  label: string,
  value: string,
  meta: string
): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "v4-projection-side-panel__evidence-health-cell";
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__evidence-health-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__evidence-health-value";
  valueEl.textContent = value;
  const metaEl = document.createElement("span");
  metaEl.className = "v4-projection-side-panel__evidence-health-meta";
  metaEl.textContent = meta;
  cell.append(labelEl, valueEl, metaEl);
  return cell;
}

function buildEvidenceHealthStrip(result: RuntimeProjectionResult): HTMLElement {
  const strip = document.createElement("div");
  strip.className = "v4-projection-side-panel__evidence-health-strip";
  const pairSource = result.dataCompleteness.pairSourceAttribution;
  const tleSources = result.dataCompleteness.tleSources;
  const acceptedCount = tleSources.reduce(
    (total, source) => total + source.acceptedRecordCount,
    0
  );
  const rejectedCount = tleSources.reduce(
    (total, source) => total + source.rejectedRecordCount,
    0
  );
  const health = tleSources.length
    ? tleSources.map((source) => `${source.orbitClass}:${source.health}`).join(" / ")
    : "no sources";
  strip.append(
    buildEvidenceHealthCell(
      "Source tier",
      resolveSourceBadgeLabel(pairSource),
      pairSource.evidenceKind.replace(/-/g, " ")
    ),
    buildEvidenceHealthCell(
      "TLE health",
      health,
      `${acceptedCount} accepted · ${rejectedCount} rejected`
    ),
    buildEvidenceHealthCell(
      "Policy",
      result.dataCompleteness.policyDisclosure.activePolicyId,
      `${formatCountLabel(result.handoverEvents.length, "event", "events")}`
    ),
    buildEvidenceHealthCell(
      "Model scope",
      `${result.dataCompleteness.actorProvenance.length} actors`,
      `${result.dataCompleteness.modeledOutputs.length} modeled outputs`
    )
  );
  return strip;
}

function buildEvidenceCoverageSegments(
  result: RuntimeProjectionResult,
  orbitClass: OrbitClass
): {
  readonly segments: ReadonlyArray<EvidenceCoverageSegment>;
  readonly visibleMs: number;
  readonly rawCount: number;
} {
  const window = resolveEvidenceTimeWindow(result);
  if (window.durationMs <= 0) {
    return { segments: [], visibleMs: 0, rawCount: 0 };
  }

  const rawSegments = result.visibilityWindows
    .filter((entry) => entry.orbitClass === orbitClass)
    .map((entry) => {
      const startMs = Math.max(Date.parse(entry.intersectionStartUtc), window.startMs);
      const endMs = Math.min(Date.parse(entry.intersectionEndUtc), window.endMs);
      return { startMs, endMs };
    })
    .filter(
      (entry) =>
        Number.isFinite(entry.startMs) &&
        Number.isFinite(entry.endMs) &&
        entry.endMs > entry.startMs
    )
    .sort((a, b) => a.startMs - b.startMs);

  const merged: Array<{ startMs: number; endMs: number }> = [];
  for (const segment of rawSegments) {
    const previous = merged[merged.length - 1];
    if (previous && segment.startMs <= previous.endMs + 60_000) {
      previous.endMs = Math.max(previous.endMs, segment.endMs);
      continue;
    }
    merged.push({ ...segment });
  }

  const visibleMs = merged.reduce(
    (total, segment) => total + Math.max(0, segment.endMs - segment.startMs),
    0
  );
  const segments = sampleEvenly(
    merged.map((segment) => {
      const startPercent = percentInEvidenceWindow(segment.startMs, window);
      const endPercent = percentInEvidenceWindow(segment.endMs, window);
      return {
        startUtc: new Date(segment.startMs).toISOString(),
        endUtc: new Date(segment.endMs).toISOString(),
        startPercent,
        widthPercent: Math.max(0.22, endPercent - startPercent)
      };
    }),
    PANEL_EVIDENCE_COVERAGE_SEGMENT_LIMIT
  );

  return { segments, visibleMs, rawCount: rawSegments.length };
}

function buildCoverageDashboard(result: RuntimeProjectionResult): HTMLElement {
  const map = document.createElement("div");
  map.className = "v4-projection-side-panel__coverage-map";
  const allowedOrbits = new Set(result.sharedSupportedOrbits);
  const window = resolveEvidenceTimeWindow(result);

  for (const orbit of ORBIT_DISPLAY_ORDER) {
    const lane = document.createElement("div");
    lane.className = "v4-projection-side-panel__coverage-lane";
    lane.dataset.orbit = orbit;
    lane.dataset.supported = allowedOrbits.has(orbit) ? "true" : "false";

    const label = document.createElement("span");
    label.className = "v4-projection-side-panel__coverage-label";
    label.textContent = orbit;

    const track = document.createElement("div");
    track.className = "v4-projection-side-panel__coverage-track";

    const { segments, visibleMs, rawCount } = buildEvidenceCoverageSegments(
      result,
      orbit
    );
    for (const segment of segments) {
      const bar = document.createElement("span");
      bar.className = "v4-projection-side-panel__coverage-segment";
      bar.dataset.orbit = orbit;
      bar.style.setProperty("--coverage-start", `${segment.startPercent}%`);
      bar.style.setProperty("--coverage-width", `${segment.widthPercent}%`);
      bar.title = `${orbit} visible ${formatUtcClockWithSeconds(segment.startUtc)}-${formatUtcClockWithSeconds(segment.endUtc)}`;
      track.append(bar);
    }

    const activeMs = result.communicationStats.byOrbit[orbit] ?? 0;
    const coveragePercent =
      window.durationMs > 0 ? clampPercent((visibleMs / window.durationMs) * 100) : 0;
    const summary = document.createElement("span");
    summary.className = "v4-projection-side-panel__coverage-summary";
    summary.textContent =
      visibleMs > 0
        ? `${Math.round(coveragePercent)}% visible · ${formatEvidenceDurationMs(activeMs)} active`
        : "no visibility";
    track.setAttribute(
      "aria-label",
      `${orbit} coverage: ${rawCount} windows, ${summary.textContent}`
    );

    lane.append(label, track, summary);
    map.append(lane);
  }

  const axis = document.createElement("div");
  axis.className = "v4-projection-side-panel__coverage-axis";
  const startLabel = document.createElement("span");
  startLabel.textContent = formatUtcClock(result.timeWindow.startUtc);
  const midLabel = document.createElement("span");
  midLabel.textContent =
    window.durationMs > 0
      ? formatUtcClock(new Date(window.startMs + window.durationMs / 2).toISOString())
      : "mid";
  const endLabel = document.createElement("span");
  endLabel.textContent = formatUtcClock(result.timeWindow.endUtc);
  axis.append(startLabel, midLabel, endLabel);
  map.append(axis);

  return buildEvidenceCard("Orbit coverage map", [map]);
}

function buildEvidenceRailMarker(
  result: RuntimeProjectionResult,
  event: RuntimeProjectionResult["handoverEvents"][number]
): EvidenceRailMarker | null {
  const window = resolveEvidenceTimeWindow(result);
  const eventMs = Date.parse(event.handoverAtUtc);
  if (
    !Number.isFinite(eventMs) ||
    window.durationMs <= 0 ||
    eventMs < window.startMs ||
    eventMs > window.endMs
  ) {
    return null;
  }

  const fromOrbit = event.fromSatelliteId
    ? resolveSatelliteOrbitClass(result, event.fromSatelliteId)
    : null;
  const toOrbit = resolveSatelliteOrbitClass(result, event.toSatelliteId);
  const kind =
    event.fromSatelliteId === null
      ? "acquisition"
      : event.reasonKind === "cross-orbit-migration"
        ? "cross-orbit"
        : "handover";
  const orbitPath = fromOrbit ? `${fromOrbit}->${toOrbit}` : toOrbit;
  return {
    handoverAtUtc: event.handoverAtUtc,
    leftPercent: percentInEvidenceWindow(eventMs, window),
    kind,
    label: `${formatUtcClockWithSeconds(event.handoverAtUtc)} · ${formatReasonLabel(event.reasonKind, event.fromSatelliteId)} · ${orbitPath} · ${formatSatelliteShort(event.toSatelliteId)}`
  };
}

function buildHandoverEventRail(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "v4-projection-side-panel__event-rail";
  const summary = buildEvidenceMetricGrid([
    [
      "Acquisition",
      String(result.handoverEvents.filter((event) => event.fromSatelliteId === null).length)
    ],
    ["Handovers", String(result.communicationStats.handoverCount)],
    [
      "Cross-orbit",
      String(
        result.handoverEvents.filter(
          (event) => event.reasonKind === "cross-orbit-migration"
        ).length
      )
    ],
    ["Mean dwell", formatEvidenceDurationMs(result.communicationStats.meanLinkDwellMs)]
  ]);

  const track = document.createElement("div");
  track.className = "v4-projection-side-panel__event-rail-track";
  const markers = sampleEvenly(
    result.handoverEvents
      .slice()
      .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc))
      .map((event) => buildEvidenceRailMarker(result, event))
      .filter((event): event is EvidenceRailMarker => event !== null),
    PANEL_EVIDENCE_EVENT_MARKER_LIMIT
  );
  for (const marker of markers) {
    const span = document.createElement("span");
    span.className = "v4-projection-side-panel__event-marker";
    span.dataset.kind = marker.kind;
    span.style.setProperty("--event-left", `${marker.leftPercent}%`);
    span.title = marker.label;
    track.append(span);
  }
  if (markers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No handover events inside this projection window.";
    track.append(empty);
  }

  const legend = document.createElement("div");
  legend.className = "v4-projection-side-panel__event-rail-legend";
  for (const [kind, label] of [
    ["acquisition", "Acquisition"],
    ["handover", "Handover"],
    ["cross-orbit", "Cross-orbit"]
  ] as const) {
    const item = document.createElement("span");
    item.className = "v4-projection-side-panel__event-rail-legend-item";
    const mark = document.createElement("span");
    mark.className = "v4-projection-side-panel__event-rail-legend-mark";
    mark.dataset.kind = kind;
    item.append(mark, document.createTextNode(label));
    legend.append(item);
  }

  wrapper.append(summary, track, legend);
  return buildEvidenceCard("Handover rail", [wrapper]);
}

function buildThresholdChip(
  label: string,
  value: string,
  levelPercent: number | null
): HTMLElement {
  const chip = document.createElement("div");
  chip.className = "v4-projection-side-panel__threshold-chip";
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__threshold-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__threshold-value";
  valueEl.textContent = value;
  chip.append(labelEl, valueEl);
  if (levelPercent !== null) {
    const meter = document.createElement("span");
    meter.className = "v4-projection-side-panel__threshold-meter";
    const fill = document.createElement("span");
    fill.className = "v4-projection-side-panel__threshold-meter-fill";
    fill.style.setProperty("--threshold-level", `${clampPercent(levelPercent)}%`);
    meter.append(fill);
    chip.append(meter);
  }
  return chip;
}

function buildPolicyThresholdDashboard(
  result: RuntimeProjectionResult
): HTMLElement {
  const disclosure = result.dataCompleteness.policyDisclosure;
  const thresholds = disclosure.thresholds;
  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__threshold-grid";
  grid.append(
    buildThresholdChip("Policy", disclosure.activePolicyId, null),
    buildThresholdChip(
      "Elevation",
      `${thresholds.elevationThresholdDeg} deg`,
      (thresholds.elevationThresholdDeg / 90) * 100
    ),
    buildThresholdChip(
      "Hysteresis",
      `${thresholds.hysteresisDb} dB`,
      (thresholds.hysteresisDb / 10) * 100
    ),
    buildThresholdChip(
      "Min window",
      formatEvidenceDurationMs(thresholds.minVisibilityWindowMs),
      (thresholds.minVisibilityWindowMs / (10 * 60_000)) * 100
    ),
    buildThresholdChip(
      "Latency",
      thresholds.latencyBudgetMs === null
        ? "none"
        : `${thresholds.latencyBudgetMs} ms`,
      thresholds.latencyBudgetMs === null
        ? null
        : (thresholds.latencyBudgetMs / 1000) * 100
    )
  );
  return buildEvidenceCard("Policy thresholds", [grid]);
}

function buildRainDeltaDashboard(
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number
): HTMLElement {
  const bars = document.createElement("div");
  bars.className = "v4-projection-side-panel__rain-bars";
  const allowedOrbits = new Set(result.sharedSupportedOrbits);
  const stationHeightAboveSeaKm =
    computeProjectionPairMidpointHeightAboveSeaKm(result);

  for (const orbit of ORBIT_DISPLAY_ORDER.filter((orbitClass) =>
    allowedOrbits.has(orbitClass)
  )) {
    const clear = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour: 0,
      stationHeightAboveSeaKm
    });
    const wet = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour,
      stationHeightAboveSeaKm
    });
    const dropFraction =
      clear.networkSpeedMbps > 0
        ? (clear.networkSpeedMbps - wet.networkSpeedMbps) / clear.networkSpeedMbps
        : 0;
    const dropPercent = clampPercent(dropFraction * 100);

    const row = document.createElement("div");
    row.className = "v4-projection-side-panel__rain-bar-row";
    const label = document.createElement("span");
    label.className = "v4-projection-side-panel__rain-bar-label";
    label.textContent = orbit;
    const track = document.createElement("span");
    track.className = "v4-projection-side-panel__rain-bar-track";
    const fill = document.createElement("span");
    fill.className = "v4-projection-side-panel__rain-bar-fill";
    fill.dataset.orbit = orbit;
    fill.dataset.empty = dropPercent <= 0 ? "true" : "false";
    fill.style.setProperty("--rain-drop", `${dropPercent}%`);
    track.append(fill);
    const value = document.createElement("span");
    value.className = "v4-projection-side-panel__rain-bar-value";
    value.textContent =
      rainRateMmPerHour <= 0
        ? "clear baseline"
        : `${formatSignedPercent(-dropFraction)} · ${formatSpeedMbps(wet.networkSpeedMbps)}`;
    row.title = `${orbit} ${formatSpeedMbps(clear.networkSpeedMbps)} -> ${formatSpeedMbps(wet.networkSpeedMbps)}`;
    row.append(label, track, value);
    bars.append(row);
  }

  if (bars.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__evidence-copy";
    empty.textContent = "No shared orbit class is available for rain comparison.";
    bars.append(empty);
  }

  return buildEvidenceCard("Rain delta", [bars]);
}

function buildEvidenceMetric(label: string, value: string): HTMLElement {
  const metric = document.createElement("div");
  metric.className = "v4-projection-side-panel__evidence-metric";
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__evidence-metric-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__evidence-metric-value";
  valueEl.textContent = value;
  metric.append(labelEl, valueEl);
  return metric;
}

function buildEvidenceMetricGrid(
  rows: ReadonlyArray<readonly [string, string]>
): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__evidence-metrics";
  for (const [label, value] of rows) {
    grid.append(buildEvidenceMetric(label, value));
  }
  return grid;
}

function buildEvidenceCard(
  title: string,
  children: ReadonlyArray<Node>,
  priority?: "primary"
): HTMLElement {
  const section = document.createElement("section");
  section.className = "v4-projection-side-panel__evidence-card";
  if (priority) {
    section.dataset.priority = priority;
  }
  const heading = document.createElement("h4");
  heading.className = "v4-projection-side-panel__evidence-heading";
  heading.textContent = title;
  section.append(heading, ...children);
  return section;
}

function buildEvidenceReportBlock(result: RuntimeProjectionResult): HTMLElement {
  const copy = document.createElement("p");
  copy.className = "v4-projection-side-panel__evidence-copy";
  copy.textContent =
    "Download one offline HTML report with section tabs, searchable tables, visibility windows, handover events, sources, assumptions, and raw JSON.";
  return buildEvidenceCard(
    "Evidence package",
    [copy, buildDownloadEvidenceReportButton(result)]
  );
}

function buildEvidenceSummaryBlock(result: RuntimeProjectionResult): HTMLElement {
  return buildEvidenceCard("Evidence summary", [
    buildEvidenceHealthStrip(result),
    buildEvidenceMetricGrid([
      ["Available", formatDurationMs(result.communicationStats.totalCommunicatingMs)],
      ["Handovers", String(result.communicationStats.handoverCount)],
      ["Windows", String(result.visibilityWindows.length)],
      ["Events", String(result.handoverEvents.length)]
    ])
  ], "primary");
}

function buildPairSourceNonClaimsBlock(
  result: RuntimeProjectionResult
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Pair-source limits";
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const note of result.dataCompleteness.pairSourceAttribution.nonClaims) {
    const li = document.createElement("li");
    li.textContent = note;
    list.append(li);
  }
  wrapper.append(heading, list);
  return wrapper;
}

function buildSourceConfidenceDisclosure(
  result: RuntimeProjectionResult
): HTMLDetailsElement {
  const pairSource = result.dataCompleteness.pairSourceAttribution;
  const intro = document.createElement("p");
  intro.className = "v4-projection-side-panel__evidence-copy";
  intro.textContent =
    `${pairSource.badgeLabel}. This section keeps the source boundary readable; the complete row-level evidence is in the downloaded report.`;
  const details = buildDisclosure(
    "Source confidence",
    [
      intro,
      buildPolicyDisclosureBlock(result),
      buildCapDisclosureBlock(result),
      buildMetricAnchorDisclosureBlock(result),
      buildStationCoordinateSourceBlock(result),
      buildStandardsReferences(result)
    ],
    false,
    { disclosure: "sources-non-claims" }
  );
  return details;
}

function buildAssumptionsDisclosure(
  result: RuntimeProjectionResult
): HTMLDetailsElement {
  const details = buildDisclosure(
    "Assumptions & limits",
    [
      buildNonClaimsBlock(result.truthBoundary),
      buildPairSourceNonClaimsBlock(result)
    ],
    false,
    { disclosure: "assumptions-limits" }
  );
  return details;
}

function buildRawEvidenceBlock(result: RuntimeProjectionResult): HTMLElement {
  const copy = document.createElement("p");
  copy.className = "v4-projection-side-panel__evidence-copy";
  copy.textContent =
    "Raw tables are not rendered here because they are verification material, not reading material. The report includes all rows in categorized tabs.";
  return buildEvidenceCard("Raw verification data", [
    buildEvidenceMetricGrid([
      ["Visibility rows", String(result.visibilityWindows.length)],
      ["Handover rows", String(result.handoverEvents.length)],
      ["Actor rows", String(result.dataCompleteness.actorProvenance.length)],
      [
        "Provenance rows",
        String(result.dataCompleteness.visibilityProvenance.length)
      ]
    ]),
    copy
  ]);
}

export function syncTleTelemetryChip(result: RuntimeProjectionResult): void {
  const chip = document.querySelector<HTMLElement>('[data-tle-telemetry-chip="true"]');
  if (!chip) {
    return;
  }
  const sources = result.dataCompleteness.tleSources;
  const acceptedCount = sources.reduce(
    (total, source) => total + source.acceptedRecordCount,
    0
  );
  const rejectedCount = sources.reduce(
    (total, source) => total + source.rejectedRecordCount,
    0
  );
  const parserFailureCount = sources.reduce(
    (total, source) => total + (source.parserFailureCount ?? 0),
    0
  );
  const healthSummary = sources.map((source) => source.health).join("/");
  const newestTimestamp = sources
    .map((source) => source.sourceTimestampUtc)
    .filter((timestamp): timestamp is string => timestamp !== null)
    .sort()
    .pop();

  chip.dataset.sourceCount = String(sources.length);
  chip.dataset.acceptedRecordCount = String(acceptedCount);
  chip.dataset.rejectedRecordCount = String(rejectedCount);
  chip.dataset.parserFailureCount = String(parserFailureCount);
  chip.dataset.sourceHealth = healthSummary;
  chip.dataset.stalenessState = healthSummary;
  if (newestTimestamp) {
    chip.dataset.sourceTimestampUtc = newestTimestamp;
  }
  chip.textContent = `${chip.textContent?.split(" · ")[0] ?? "TLE"} · ${healthSummary}`;
}

export function buildDisclosuresRow(
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number
): HTMLElement {
  const drawer = document.createElement("aside");
  drawer.className = "v4-projection-side-panel__evidence-drawer";
  drawer.id = PANEL_EVIDENCE_DRAWER_ID;
  drawer.hidden = true;
  drawer.dataset.evidenceDrawer = "true";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "false");
  drawer.setAttribute("aria-label", "Selected-pair details and sources");

  const header = document.createElement("div");
  header.className = "v4-projection-side-panel__evidence-header";
  const title = document.createElement("h3");
  title.className = "v4-projection-side-panel__evidence-title";
  title.textContent = "Details & sources";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "v4-projection-side-panel__evidence-close";
  close.setAttribute("aria-label", "Close details and sources");
  close.textContent = "Close";
  close.addEventListener("click", () => {
    drawer.hidden = true;
    drawer.dataset.open = "false";
    const trigger = document.querySelector<HTMLButtonElement>(
      `[aria-controls="${drawer.id}"]`
    );
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.textContent = "Details & sources";
      trigger.setAttribute("aria-label", "Open details and sources");
      trigger.focus();
    }
  });
  header.append(title, close);

  const intro = document.createElement("p");
  intro.className = "v4-projection-side-panel__evidence-intro";
  intro.textContent =
    "Readable validation summary. Download the evidence report for the full row-level tables.";

  const stack = document.createElement("div");
  stack.className = "v4-projection-side-panel__evidence-stack";

  stack.append(
    buildEvidenceSummaryBlock(result),
    buildCoverageDashboard(result),
    buildHandoverEventRail(result),
    buildPolicyThresholdDashboard(result),
    buildRainDeltaDashboard(result, rainRateMmPerHour),
    buildEvidenceReportBlock(result),
    buildSourceConfidenceDisclosure(result),
    buildAssumptionsDisclosure(result),
    buildRawEvidenceBlock(result)
  );

  drawer.append(header, intro, stack);
  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      drawer.hidden = true;
      drawer.dataset.open = "false";
      const trigger = document.querySelector<HTMLButtonElement>(
        `[aria-controls="${drawer.id}"]`
      );
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
        trigger.textContent = "Details & sources";
        trigger.setAttribute("aria-label", "Open details and sources");
        trigger.focus();
      }
    }
  });
  return drawer;
}
