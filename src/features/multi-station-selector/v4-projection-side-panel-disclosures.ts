import type { RuntimeProjectionResult } from "./runtime-projection";
import type { OrbitClass } from "./visibility-utils";

const ORBIT_DISPLAY_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

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

function buildPairSourceNonClaimsBlock(
  result: RuntimeProjectionResult
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className =
    "v4-projection-side-panel__section v4-projection-side-panel__section--non-claims";
  wrapper.dataset.stationPairNonClaim = "true";
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "Pair non-claims";
  wrapper.append(heading);
  if (result.dataCompleteness.pairSourceAttribution.nonClaims.length === 0) {
    return wrapper;
  }
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const note of result.dataCompleteness.pairSourceAttribution.nonClaims) {
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

export function buildPolicyDisclosure(result: RuntimeProjectionResult): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "v4-projection-side-panel__details";
  details.dataset.policyDisclosure = "true";
  
  const disclosure = result.dataCompleteness.policyDisclosure;
  details.dataset.activePolicyId = disclosure.activePolicyId;
  const thresholds = disclosure.thresholds;
  details.dataset.latencyBudgetMs = String(thresholds.latencyBudgetMs ?? "");
  details.dataset.hysteresisDb = String(thresholds.hysteresisDb);
  details.dataset.minVisibilityWindowMs = String(
    thresholds.minVisibilityWindowMs
  );
  details.dataset.elevationThresholdDeg = String(
    thresholds.elevationThresholdDeg
  );

  const summary = document.createElement("summary");
  summary.className = "v4-projection-side-panel__details-summary";
  summary.textContent = "Handover policy";

  const content = document.createElement("div");
  content.className = "v4-projection-side-panel__details-body";
  
  const p = document.createElement("p");
  p.className = "v4-projection-side-panel__empty";
  p.textContent = `${disclosure.activePolicyId} · elevation ${thresholds.elevationThresholdDeg}° · hysteresis ${thresholds.hysteresisDb} dB · min window ${Math.round(thresholds.minVisibilityWindowMs / 1000)}s · latency ${thresholds.latencyBudgetMs ?? "n/a"} ms`;
  
  content.append(p);
  details.append(summary, content);
  return details;
}

export function buildSourceConfidenceDisclosure(
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

export function buildHiddenMachineEvidenceBlock(result: RuntimeProjectionResult): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "v4-projection-side-panel__evidence-machine-hooks";
  wrapper.style.display = "none";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.append(
    buildAssumptionsDisclosure(result),
    buildCapDisclosureBlock(result),
    buildMetricAnchorDisclosureBlock(result),
    buildStationCoordinateSourceBlock(result)
  );
  return wrapper;
}
