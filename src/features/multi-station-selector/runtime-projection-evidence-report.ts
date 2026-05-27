import type { RuntimeProjectionResult } from "./runtime-projection";

type ReportCell = string | number | boolean | null | undefined;
type ReportRow = ReadonlyArray<ReportCell>;

const ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"] as const;
const POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
] as const;

function escapeHtml(value: ReportCell): string {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForHtml(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function durationMs(startUtc: string, endUtc: string): number | null {
  const startMs = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }
  return Math.max(0, endMs - startMs);
}

function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return "n/a";
  }
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatIsoShort(utc: string | null | undefined): string {
  if (!utc) {
    return "n/a";
  }
  const parsedMs = Date.parse(utc);
  if (!Number.isFinite(parsedMs)) {
    return utc;
  }
  return new Date(parsedMs).toISOString().replace(".000Z", "Z");
}

function sanitizeFilenameSegment(segment: string): string {
  const sanitized = segment.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "unknown";
}

function compactUtcForFilename(utc: string): string {
  const parsedMs = Date.parse(utc);
  const normalized = Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : utc;
  return sanitizeFilenameSegment(
    normalized.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  );
}

function table(headers: ReadonlyArray<string>, rows: ReadonlyArray<ReportRow>): string {
  const head = headers
    .map((header) => `<th scope="col">${escapeHtml(header)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((_, index) => `<td>${escapeHtml(row[index])}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<div class="table-wrap" data-row-count="${rows.length}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function kvTable(rows: ReadonlyArray<readonly [string, ReportCell]>): string {
  return table(["Field", "Value"], rows);
}

function list(items: ReadonlyArray<ReportCell>): string {
  if (items.length === 0) {
    return `<p class="empty">No entries.</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function section(id: string, title: string, body: string, active = false): string {
  return `<section id="${id}" class="tab-panel" role="tabpanel" data-tab-panel="${id}"${
    active ? "" : " hidden"
  }><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function orbitDurationRows(result: RuntimeProjectionResult): ReportRow[] {
  return ORBIT_DISPLAY_ORDER.map((orbitClass) => [
    orbitClass,
    formatDurationMs(result.communicationStats.byOrbit[orbitClass]),
    result.communicationStats.byOrbit[orbitClass]
  ]);
}

function visibilityRows(result: RuntimeProjectionResult): ReportRow[] {
  return [...result.visibilityWindows]
    .sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) - Date.parse(b.intersectionStartUtc)
    )
    .map((window) => [
      window.satelliteId,
      window.orbitClass,
      formatIsoShort(window.intersectionStartUtc),
      formatIsoShort(window.intersectionEndUtc),
      formatDurationMs(
        durationMs(window.intersectionStartUtc, window.intersectionEndUtc)
      )
    ]);
}

function handoverRows(result: RuntimeProjectionResult): ReportRow[] {
  return [...result.handoverEvents]
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc))
    .map((event) => [
      formatIsoShort(event.handoverAtUtc),
      event.fromSatelliteId ?? "initial acquisition",
      event.toSatelliteId,
      event.reasonKind
    ]);
}

function stationSourceRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.stationPrecision.map((station) => [
    station.stationId,
    station.disclosurePrecision,
    station.sourceTier,
    station.coordinateSourceAuthority,
    station.coordinateSourceNote,
    station.elevationM,
    station.terrainMaskDeg,
    station.effectiveElevationThresholdDeg
  ]);
}

function tleSourceRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.tleSources.map((source) => [
    source.sourceId,
    source.orbitClass,
    source.sourcePolicy,
    source.recordCount,
    source.acceptedRecordCount,
    source.rejectedRecordCount,
    source.parserFailureCount,
    source.capApplied,
    source.health,
    formatIsoShort(source.sourceTimestampUtc)
  ]);
}

function inventoryRows(result: RuntimeProjectionResult): ReportRow[] {
  return ORBIT_DISPLAY_ORDER.map((orbitClass) => {
    const inventory =
      result.dataCompleteness.runtimeInventoryDisclosure.perOrbit[orbitClass];
    return [
      orbitClass,
      inventory.inventorySourceMode,
      inventory.activeInventoryCount,
      inventory.acceptedRecordCount,
      inventory.runtimeCap,
      inventory.cappedAtRuntime,
      inventory.visibleActorCount
    ];
  });
}

function modeledOutputRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.modeledOutputs.map((output) => [
    output.kind,
    output.modelId,
    output.standardsRef.join(" | "),
    JSON.stringify(output.inputSummary),
    output.outputUnit,
    output.rainRateControlMode,
    output.provenance.truthClass,
    output.nonClaim
  ]);
}

function rfChainRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.rfChainBreakdown.terms.map((term) => [
    term.kind,
    term.contributionSignedDb,
    term.modelId,
    term.standardsRef.join(" | "),
    JSON.stringify(term.inputSummary),
    term.provenance.truthClass,
    term.nonClaim
  ]);
}

function policyRows(result: RuntimeProjectionResult): ReportRow[] {
  const disclosure = result.dataCompleteness.policyDisclosure;
  return POLICY_DISCLOSURE_THRESHOLD_ORDER.map((key) => {
    const source = disclosure.thresholdSources[key];
    return [
      disclosure.activePolicyId,
      key,
      disclosure.thresholds[key],
      source.truthClass,
      source.sourceId,
      source.modelId ?? "",
      source.nonClaim ?? ""
    ];
  });
}

function actorRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.actorProvenance.map((actor) => [
    actor.satelliteId,
    actor.orbitClass,
    actor.sourceId,
    actor.propagatedSampleCount,
    actor.sampleCadenceSeconds,
    formatIsoShort(actor.firstPropagatedUtc),
    formatIsoShort(actor.lastPropagatedUtc),
    actor.visibilityWindowCount,
    actor.provenance.truthClass
  ]);
}

function visibilityProvenanceRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.visibilityProvenance.map((row) => [
    row.satelliteId,
    row.orbitClass,
    row.sourceId,
    row.stationAWindowSource,
    row.stationBWindowSource,
    row.pairIntersectionSource,
    row.elevationThresholdDeg,
    row.sampleCadenceSeconds,
    formatIsoShort(row.intersectionStartUtc),
    formatIsoShort(row.intersectionEndUtc),
    row.provenance.truthClass
  ]);
}

function standardsList(result: RuntimeProjectionResult): string[] {
  return [
    `Handover policy: TR 38.821 \u00a77.3 (${result.dataCompleteness.policyDisclosure.activePolicyId})`,
    "Rain attenuation: ITU-R P.618-14 \u00a72.2.1",
    "Gas absorption: ITU-R P.676-13",
    ...result.dataCompleteness.modeledOutputs.flatMap((output) =>
      output.standardsRef.map((ref) => `${output.kind}: ${ref}`)
    )
  ];
}

function buildSummaryTab(result: RuntimeProjectionResult): string {
  const windowMs = durationMs(result.timeWindow.startUtc, result.timeWindow.endUtc);
  const pairSource = result.dataCompleteness.pairSourceAttribution;
  return [
    `<div class="metric-grid">
      <div><span>Available</span><strong>${escapeHtml(formatDurationMs(result.communicationStats.totalCommunicatingMs))}</strong></div>
      <div><span>Switches</span><strong>${escapeHtml(result.communicationStats.handoverCount)}</strong></div>
      <div><span>Visibility windows</span><strong>${escapeHtml(result.visibilityWindows.length)}</strong></div>
      <div><span>Link events</span><strong>${escapeHtml(result.handoverEvents.length)}</strong></div>
    </div>`,
    kvTable([
      ["Station A", `${result.pair.stationA.name} (${result.pair.stationA.id})`],
      ["Station B", `${result.pair.stationB.name} (${result.pair.stationB.id})`],
      ["Time window", `${formatIsoShort(result.timeWindow.startUtc)} to ${formatIsoShort(result.timeWindow.endUtc)}`],
      ["Window duration", formatDurationMs(windowMs)],
      ["Shared supported orbits", result.sharedSupportedOrbits.join("/")],
      ["Source tier", pairSource.sourceTier],
      ["Evidence kind", pairSource.evidenceKind],
      ["Badge label", pairSource.badgeLabel],
      ["Precision label", result.truthBoundary.precisionLabel],
      ["Route mode", result.dataCompleteness.routeMode],
      ["Empty reason", result.dataCompleteness.emptyReasonCode ?? ""]
    ]),
    `<h3>Communication by orbit</h3>`,
    table(["Orbit", "Duration", "Duration ms"], orbitDurationRows(result))
  ].join("");
}

function buildVisibilityTab(result: RuntimeProjectionResult): string {
  const rows = visibilityRows(result);
  return rows.length === 0
    ? `<p class="empty">No mutual visibility windows in this projection.</p>`
    : table(["Satellite", "Orbit", "Start UTC", "End UTC", "Duration"], rows);
}

function buildHandoverTab(result: RuntimeProjectionResult): string {
  const rows = handoverRows(result);
  return rows.length === 0
    ? `<p class="empty">No handover events in this projection.</p>`
    : table(["Time UTC", "From", "To", "Reason"], rows);
}

function buildSourcesTab(result: RuntimeProjectionResult): string {
  const pairSource = result.dataCompleteness.pairSourceAttribution;
  return [
    `<h3>Source confidence</h3>`,
    kvTable([
      ["Source tier", pairSource.sourceTier],
      ["Evidence kind", pairSource.evidenceKind],
      ["Badge label", pairSource.badgeLabel],
      ["Truth boundary", result.truthBoundary.sourceTier]
    ]),
    `<h3>Pair source non-claims</h3>`,
    list(pairSource.nonClaims),
    `<h3>Station coordinate and elevation sources</h3>`,
    table(
      [
        "Station",
        "Coordinate precision",
        "Source tier",
        "Coordinate authority",
        "Coordinate note",
        "Elevation m",
        "Terrain mask deg",
        "Effective threshold deg"
      ],
      stationSourceRows(result)
    ),
    `<h3>TLE source manifest</h3>`,
    table(
      [
        "Source",
        "Orbit",
        "Policy",
        "Records",
        "Accepted",
        "Rejected",
        "Parser failures",
        "Cap",
        "Health",
        "Timestamp"
      ],
      tleSourceRows(result)
    ),
    `<h3>Runtime inventory</h3>`,
    table(
      [
        "Orbit",
        "Source mode",
        "Active",
        "Accepted",
        "Runtime cap",
        "Capped",
        "Visible actors"
      ],
      inventoryRows(result)
    )
  ].join("");
}

function buildModelsTab(result: RuntimeProjectionResult): string {
  const metric = result.dataCompleteness.metricAnchorDisclosure;
  return [
    `<h3>Assumptions and limits</h3>`,
    list([
      ...result.truthBoundary.nonClaims,
      metric.nonClaim,
      result.dataCompleteness.runtimeInventoryDisclosure.note
    ]),
    `<h3>Standards used</h3>`,
    list(standardsList(result)),
    `<h3>Modeled outputs</h3>`,
    table(
      [
        "Kind",
        "Model",
        "Standards",
        "Inputs",
        "Unit",
        "Rain control",
        "Truth class",
        "Non-claim"
      ],
      modeledOutputRows(result)
    ),
    `<h3>Policy thresholds</h3>`,
    table(
      [
        "Policy",
        "Threshold",
        "Value",
        "Truth class",
        "Source",
        "Model",
        "Non-claim"
      ],
      policyRows(result)
    ),
    `<h3>RF chain</h3>`,
    table(
      [
        "Term",
        "Contribution dB",
        "Model",
        "Standards",
        "Inputs",
        "Truth class",
        "Non-claim"
      ],
      rfChainRows(result)
    )
  ].join("");
}

function buildRuntimeTab(result: RuntimeProjectionResult): string {
  return [
    `<h3>Actor provenance</h3>`,
    table(
      [
        "Satellite",
        "Orbit",
        "Source",
        "Samples",
        "Cadence s",
        "First UTC",
        "Last UTC",
        "Window count",
        "Truth class"
      ],
      actorRows(result)
    ),
    `<h3>Visibility provenance</h3>`,
    table(
      [
        "Satellite",
        "Orbit",
        "Source",
        "Station A windows",
        "Station B windows",
        "Pair intersection",
        "Elevation threshold",
        "Cadence s",
        "Start UTC",
        "End UTC",
        "Truth class"
      ],
      visibilityProvenanceRows(result)
    ),
    `<h3>Raw JSON payload</h3>`,
    `<pre>${escapeJsonForHtml(result)}</pre>`
  ].join("");
}

export function buildRuntimeProjectionEvidenceReportHtml(
  result: RuntimeProjectionResult
): string {
  const title = `Selected-pair evidence report - ${result.pair.stationA.name} to ${result.pair.stationB.name}`;
  const generatedAtUtc = new Date().toISOString();
  const tabs = [
    ["summary", "Summary"],
    ["visibility", `Visibility (${result.visibilityWindows.length})`],
    ["handover", `Handover (${result.handoverEvents.length})`],
    ["sources", "Sources"],
    ["models", "Assumptions & models"],
    ["runtime", "Runtime data"]
  ] as const;
  const tabButtons = tabs
    .map(
      ([id, label], index) =>
        `<button type="button" role="tab" data-tab-target="${id}" aria-selected="${index === 0 ? "true" : "false"}">${escapeHtml(label)}</button>`
    )
    .join("");
  const panels = [
    section("summary", "Summary", buildSummaryTab(result), true),
    section("visibility", "Visibility windows", buildVisibilityTab(result)),
    section("handover", "Handover events", buildHandoverTab(result)),
    section("sources", "Sources", buildSourcesTab(result)),
    section("models", "Assumptions & models", buildModelsTab(result)),
    section("runtime", "Runtime data", buildRuntimeTab(result))
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, "IBM Plex Sans", system-ui, sans-serif; background: #07111c; color: #e7eef5; }
    body { margin: 0; background: #07111c; color: #e7eef5; }
    header { padding: 28px 32px 18px; border-bottom: 1px solid #243448; background: #0b1724; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
    h2 { margin: 0 0 16px; font-size: 22px; }
    h3 { margin: 24px 0 10px; font-size: 17px; color: #9bd8ff; }
    p { line-height: 1.55; }
    .meta { color: #a7b8ca; margin: 0; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 32px; background: rgba(7, 17, 28, 0.96); border-bottom: 1px solid #243448; }
    [role="tab"] { min-height: 38px; padding: 0 14px; border: 1px solid #31465e; border-radius: 6px; background: #111f2f; color: #dbe8f4; font: inherit; cursor: pointer; }
    [role="tab"][aria-selected="true"] { border-color: #6ee7b7; background: #123526; color: #effff8; }
    input[type="search"] { min-height: 38px; min-width: min(340px, 100%); margin-left: auto; padding: 0 12px; border-radius: 6px; border: 1px solid #31465e; background: #0b1724; color: #e7eef5; font: inherit; }
    main { padding: 24px 32px 44px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .metric-grid div { border: 1px solid #243448; border-radius: 8px; background: #0d1b2a; padding: 14px; }
    .metric-grid span { display: block; color: #9fb3c8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
    .metric-grid strong { display: block; margin-top: 6px; font-size: 22px; }
    .table-wrap { width: 100%; overflow: auto; border: 1px solid #243448; border-radius: 8px; background: #081421; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 9px 10px; border-bottom: 1px solid #1d2b3d; text-align: left; vertical-align: top; }
    th { position: sticky; top: 63px; background: #102033; color: #bfe6ff; z-index: 1; white-space: nowrap; }
    td { color: #dbe8f4; }
    tr[hidden] { display: none; }
    ul { margin-top: 8px; line-height: 1.55; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid #243448; border-radius: 8px; padding: 14px; background: #06101b; color: #d8e8f5; font-size: 13px; line-height: 1.45; }
    .empty { color: #9fb3c8; }
    @media (max-width: 840px) {
      header, .toolbar, main { padding-left: 18px; padding-right: 18px; }
      .metric-grid { grid-template-columns: 1fr 1fr; }
      input[type="search"] { margin-left: 0; flex: 1 1 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Generated ${escapeHtml(generatedAtUtc)} · ${escapeHtml(formatIsoShort(result.timeWindow.startUtc))} to ${escapeHtml(formatIsoShort(result.timeWindow.endUtc))}</p>
  </header>
  <div class="toolbar">
    <div role="tablist" aria-label="Evidence report sections">${tabButtons}</div>
    <input type="search" data-report-filter aria-label="Filter active section" placeholder="Filter active section">
  </div>
  <main>${panels}</main>
  <script>
    (() => {
      const tabs = Array.from(document.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const filter = document.querySelector("[data-report-filter]");
      const activate = (id) => {
        for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.tabTarget === id));
        for (const panel of panels) panel.hidden = panel.dataset.tabPanel !== id;
        if (filter) filter.value = "";
        applyFilter("");
      };
      const applyFilter = (value) => {
        const query = value.trim().toLowerCase();
        const activePanel = panels.find((panel) => !panel.hidden);
        if (!activePanel) return;
        for (const row of activePanel.querySelectorAll("tbody tr")) {
          row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
        }
      };
      for (const tab of tabs) tab.addEventListener("click", () => activate(tab.dataset.tabTarget));
      filter?.addEventListener("input", () => applyFilter(filter.value));
    })();
  </script>
</body>
</html>`;
}

export function buildRuntimeProjectionEvidenceReportFilename(
  result: RuntimeProjectionResult
): string {
  const stationAId = sanitizeFilenameSegment(result.pair.stationA.id);
  const stationBId = sanitizeFilenameSegment(result.pair.stationB.id);
  const startUtc = compactUtcForFilename(result.timeWindow.startUtc);
  const windowMs = durationMs(result.timeWindow.startUtc, result.timeWindow.endUtc);
  const durationMinutes =
    windowMs === null ? "unknown" : Math.round(windowMs / 60_000);
  return `runtime-projection-evidence-${stationAId}-${stationBId}-${startUtc}-${durationMinutes}m.html`;
}
