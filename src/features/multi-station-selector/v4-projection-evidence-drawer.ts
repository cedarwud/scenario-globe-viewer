import { getLocalTimezoneLabel } from "./v4-projection-formatters";
import {
  computeLinkBudgetMetricsForOrbit,
  type RuntimeProjectionResult
} from "./runtime-projection";
import {
  buildDownloadCsvButton,
  buildOpenEvidenceReportButton
} from "./v4-projection-report-actions";
import {
  PANEL_EVIDENCE_DRAWER_ID,
  setSelectedPairEvidenceDrawerOpen
} from "./selected-pair-overlay-state";
import type { OrbitClass } from "./visibility-utils";

export { PANEL_EVIDENCE_DRAWER_ID } from "./selected-pair-overlay-state";

const PANEL_EVIDENCE_EVENT_ROW_LIMIT = 3;
const ORBIT_DISPLAY_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

interface EvidenceDefinitionRow {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
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

function formatUtcClockWithSeconds(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const d = new Date(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
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
      "Handover policy gates",
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

function buildTleSourceSummaryBlock(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "TLE source summary";
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const source of result.dataCompleteness.tleSources) {
    const li = document.createElement("li");
    li.textContent =
      `${source.sourceId} · ${source.orbitClass} · ${source.health} · ` +
      `${source.acceptedRecordCount} accepted / ${source.rejectedRecordCount} rejected`;
    list.append(li);
  }
  wrapper.append(heading, list);
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
    )
  );
  return strip;
}

function buildEvidenceDefinitionList(
  rows: ReadonlyArray<EvidenceDefinitionRow>,
  ariaLabel: string
): HTMLElement {
  const list = document.createElement("dl");
  list.className = "v4-projection-side-panel__evidence-definition-list";
  list.setAttribute("aria-label", ariaLabel);
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "v4-projection-side-panel__evidence-definition-row";
    const term = document.createElement("dt");
    term.className = "v4-projection-side-panel__evidence-definition-label";
    term.textContent = row.label;
    const detail = document.createElement("dd");
    detail.className = "v4-projection-side-panel__evidence-definition-detail";
    const value = document.createElement("span");
    value.className = "v4-projection-side-panel__evidence-definition-value";
    value.textContent = row.value;
    detail.append(value);
    if (row.description) {
      const description = document.createElement("span");
      description.className = "v4-projection-side-panel__evidence-definition-description";
      description.textContent = row.description;
      detail.append(description);
    }
    item.append(term, detail);
    list.append(item);
  }
  return list;
}

function buildHandoverEventList(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "v4-projection-side-panel__evidence-list-block";
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

  const copy = document.createElement("p");
  copy.className = "v4-projection-side-panel__evidence-copy";
  copy.textContent =
    "Chronological handover evidence for this projection window. The report contains the full row set.";

  const window = resolveEvidenceTimeWindow(result);
  const events = result.handoverEvents
    .slice()
    .filter((event) => {
      const eventMs = Date.parse(event.handoverAtUtc);
      return (
        Number.isFinite(eventMs) &&
        window.durationMs > 0 &&
        eventMs >= window.startMs &&
        eventMs <= window.endMs
      );
    })
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc));

  const list = document.createElement("ol");
  list.className = "v4-projection-side-panel__evidence-row-list";
  list.setAttribute("aria-label", "Handover events in chronological order");
  for (const event of events.slice(0, PANEL_EVIDENCE_EVENT_ROW_LIMIT)) {
    const fromOrbit = event.fromSatelliteId
      ? resolveSatelliteOrbitClass(result, event.fromSatelliteId)
      : null;
    const toOrbit = resolveSatelliteOrbitClass(result, event.toSatelliteId);
    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__evidence-row-item";
    if (event.reasonKind === "cross-orbit-migration") {
      li.dataset.modifier = "cross-orbit";
    }
    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__evidence-row-primary";
    primary.textContent =
      event.fromSatelliteId === null
        ? `${formatUtcClockWithSeconds(event.handoverAtUtc)} ${getLocalTimezoneLabel(event.handoverAtUtc)} · acquire ${formatSatelliteShort(event.toSatelliteId)}`
        : `${formatUtcClockWithSeconds(event.handoverAtUtc)} ${getLocalTimezoneLabel(event.handoverAtUtc)} · ${formatSatelliteShort(event.fromSatelliteId)} -> ${formatSatelliteShort(event.toSatelliteId)}`;
    const secondary = document.createElement("span");
    secondary.className = "v4-projection-side-panel__evidence-row-secondary";
    secondary.textContent =
      `${fromOrbit ? `${fromOrbit} -> ${toOrbit}` : toOrbit} · ` +
      formatReasonLabel(event.reasonKind, event.fromSatelliteId);
    li.append(primary, secondary);
    list.append(li);
  }

  wrapper.append(summary, copy);
  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No handover events inside this projection window.";
    wrapper.append(empty);
  } else {
    wrapper.append(list);
  }
  if (events.length > PANEL_EVIDENCE_EVENT_ROW_LIMIT) {
    const note = document.createElement("p");
    note.className = "v4-projection-side-panel__evidence-copy";
    note.textContent = `Showing first ${PANEL_EVIDENCE_EVENT_ROW_LIMIT} of ${events.length} events; use the evidence report for every row.`;
    wrapper.append(note);
  }

  return buildEvidenceCard("Handover events", [wrapper]);
}

function buildPolicyThresholdDashboard(
  result: RuntimeProjectionResult
): HTMLElement {
  const disclosure = result.dataCompleteness.policyDisclosure;
  const thresholds = disclosure.thresholds;
  const copy = document.createElement("p");
  copy.className = "v4-projection-side-panel__evidence-copy";
  copy.textContent =
    "Configured gates used by the handover policy. These are decision rules for the demo projection, not measured operator limits.";
  const rows: EvidenceDefinitionRow[] = [
    {
      label: "Policy preset",
      value: disclosure.activePolicyId,
      description: "Selects the handover rule set used for this projection."
    },
    {
      label: "Minimum elevation",
      value: `${thresholds.elevationThresholdDeg}°`,
      description: "Ignore visibility below this look angle."
    },
    {
      label: "Hysteresis",
      value: `${thresholds.hysteresisDb} dB`,
      description: "A candidate must beat the current link by this margin before switching."
    },
    {
      label: "Minimum usable window",
      value: formatEvidenceDurationMs(thresholds.minVisibilityWindowMs),
      description: "A candidate must remain usable at least this long."
    },
    {
      label: "Latency budget",
      value:
        thresholds.latencyBudgetMs === null
          ? "Not capped"
          : `${thresholds.latencyBudgetMs} ms`,
      description: "Latency target used while scoring candidate links."
    }
  ];
  const card = buildEvidenceCard("Handover policy gates", [
    copy,
    buildEvidenceDefinitionList(rows, "Handover policy gates")
  ]);
  card.dataset.policyThresholds = "true";
  return card;
}

function buildRainDeltaDashboard(
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number
): HTMLElement {
  const allowedOrbits = new Set(result.sharedSupportedOrbits);
  const stationHeightAboveSeaKm =
    computeProjectionPairMidpointHeightAboveSeaKm(result);
  const rows: EvidenceDefinitionRow[] = [];

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
    rows.push({
      label: orbit,
      value:
        rainRateMmPerHour <= 0
          ? `${formatSpeedMbps(clear.networkSpeedMbps)} clear baseline`
          : `${formatSpeedMbps(clear.networkSpeedMbps)} clear -> ${formatSpeedMbps(wet.networkSpeedMbps)} current`,
      description:
        rainRateMmPerHour <= 0
          ? `Jitter ${clear.jitterMs.toFixed(1)} ms at clear-sky baseline.`
          : `${formatSignedPercent(-dropFraction)} throughput; jitter ${clear.jitterMs.toFixed(1)} -> ${wet.jitterMs.toFixed(1)} ms.`
    });
  }

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__evidence-copy";
    empty.textContent = "No shared orbit class is available for rain comparison.";
    return buildEvidenceCard("Rain impact evidence", [empty]);
  }

  const copy = document.createElement("p");
  copy.className = "v4-projection-side-panel__evidence-copy";
  copy.textContent =
    rainRateMmPerHour <= 0
      ? "Current rain setting is clear sky; rows show the baseline values."
      : `Current rain setting is ${rainRateMmPerHour} mm/h; rows compare clear sky against the active rain setting.`;
  return buildEvidenceCard("Rain impact evidence", [
    copy,
    buildEvidenceDefinitionList(rows, "Rain impact by orbit")
  ]);
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
    "Open the full HTML report for readable tables, sources, assumptions, and raw JSON. Use CSV only when you need spreadsheet data.";
  const actions = document.createElement("div");
  actions.className = "v4-projection-side-panel__report-action-row";
  actions.append(
    buildOpenEvidenceReportButton(result, "Open report"),
    buildDownloadCsvButton(result, "CSV")
  );
  return buildEvidenceCard(
    "Evidence package",
    [copy, actions]
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
    `${pairSource.badgeLabel}. Full source tables, inventory rows, station coordinate metadata, and model IDs are in the report.`;
  const details = buildDisclosure(
    "Source boundary",
    [
      intro,
      buildTleSourceSummaryBlock(result),
      buildStandardsReferences(result)
    ],
    false,
    { disclosure: "sources-non-claims" }
  );
  return details;
}

function buildHiddenMachineEvidenceBlock(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "v4-projection-side-panel__evidence-machine-hooks";
  wrapper.hidden = true;
  wrapper.append(
    buildAssumptionsDisclosure(result),
    buildPolicyDisclosureBlock(result),
    buildCapDisclosureBlock(result),
    buildMetricAnchorDisclosureBlock(result),
    buildStationCoordinateSourceBlock(result)
  );
  return wrapper;
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
    setSelectedPairEvidenceDrawerOpen(drawer, false, {
      focusTarget: "trigger"
    });
  });
  header.append(title, close);

  const intro = document.createElement("p");
  intro.className = "v4-projection-side-panel__evidence-intro";
  intro.textContent =
    "Readable validation summary. Open the evidence report for full row-level tables.";

  const stack = document.createElement("div");
  stack.className = "v4-projection-side-panel__evidence-stack";

  stack.append(
    buildEvidenceSummaryBlock(result),
    buildHandoverEventList(result),
    buildPolicyThresholdDashboard(result),
    buildRainDeltaDashboard(result, rainRateMmPerHour),
    buildEvidenceReportBlock(result),
    buildSourceConfidenceDisclosure(result),
    buildHiddenMachineEvidenceBlock(result)
  );

  drawer.append(header, intro, stack);
  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSelectedPairEvidenceDrawerOpen(drawer, false, {
        focusTarget: "trigger"
      });
    }
  });
  return drawer;
}
