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

function metricCard(label: string, value: ReportCell, description?: string): string {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(
    value
  )}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div>`;
}

function evidenceCard(
  title: string,
  value: ReportCell,
  description: string,
  tone?: "ok" | "warn" | "info"
): string {
  return `<article class="evidence-card"${
    tone ? ` data-tone="${tone}"` : ""
  }><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(
    description
  )}</p></article>`;
}

function callout(title: string, body: string, tone: "info" | "warn" = "info"): string {
  return `<aside class="callout" data-tone="${tone}"><strong>${escapeHtml(
    title
  )}</strong><p>${escapeHtml(body)}</p></aside>`;
}

function section(id: string, title: string, body: string, active = false): string {
  return `<section id="${id}" class="tab-panel" role="tabpanel" data-tab-panel="${id}"${
    active ? "" : " hidden"
  } aria-labelledby="tab-${id}"><h2>${escapeHtml(title)}</h2>${body}</section>`;
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
  const crossOrbitCount = result.handoverEvents.filter(
    (event) => event.reasonKind === "cross-orbit-migration"
  ).length;
  const handoverRequirementValue = `${result.communicationStats.handoverCount} switches`;
  const sourceBoundarySummary = `${pairSource.badgeLabel}. ${
    result.truthBoundary.nonClaims[0] ?? "See Sources for non-claims and provenance."
  }`;
  const summaryCards = [
    metricCard(
      "Available",
      formatDurationMs(result.communicationStats.totalCommunicatingMs),
      "Total communicating time in the selected window."
    ),
    metricCard(
      "Handovers",
      result.communicationStats.handoverCount,
      `${crossOrbitCount} cross-orbit migrations.`
    ),
    metricCard(
      "Visibility windows",
      result.visibilityWindows.length,
      "Mutual station-to-satellite windows."
    ),
    metricCard(
      "Source boundary",
      pairSource.badgeLabel,
      pairSource.evidenceKind.replace(/-/g, " ")
    )
  ].join("");
  const projectionSetup = kvTable([
    ["Station A", `${result.pair.stationA.name} (${result.pair.stationA.id})`],
    ["Station B", `${result.pair.stationB.name} (${result.pair.stationB.id})`],
    [
      "Time window",
      `${formatIsoShort(result.timeWindow.startUtc)} to ${formatIsoShort(
        result.timeWindow.endUtc
      )}`
    ],
    ["Window duration", formatDurationMs(windowMs)],
    ["Shared supported orbits", result.sharedSupportedOrbits.join("/")],
    ["Source tier", pairSource.sourceTier],
    ["Evidence kind", pairSource.evidenceKind],
    ["Precision label", result.truthBoundary.precisionLabel],
    ["Route mode", result.dataCompleteness.routeMode],
    ["Empty reason", result.dataCompleteness.emptyReasonCode ?? ""]
  ]);
  const requirementCards = [
    evidenceCard(
      "R1-F3 / R1-D3",
      formatDurationMs(result.communicationStats.totalCommunicatingMs),
      "Communication-time statistics are computed from visibility and serving-link rows.",
      "ok"
    ),
    evidenceCard(
      "R1-F4 / K-E4 / V-MO1",
      handoverRequirementValue,
      "Handover rows show the active serving-link sequence and cross-orbit migrations.",
      crossOrbitCount > 0 ? "ok" : "info"
    ),
    evidenceCard(
      "K-E6",
      "Rain impact modeled",
      "The rain control changes link-budget metrics; model assumptions are listed under Models.",
      "info"
    ),
    evidenceCard(
      "R1-F5",
      "HTML + CSV",
      "This readable report is the review surface; CSV export is the data artifact.",
      "ok"
    )
  ].join("");
  return [
    `<div class="summary-grid">${summaryCards}</div>`,
    `<div class="report-section">
      <h3>Projection setup</h3>
      ${projectionSetup}
    </div>`,
    `<div class="report-section">
      <h3>Requirement coverage</h3>
      <div class="evidence-grid">${requirementCards}</div>
    </div>`,
    `<div class="report-section">
      <h3>Communication by orbit</h3>
      ${table(["Orbit", "Duration", "Duration ms"], orbitDurationRows(result))}
    </div>`,
    callout(
      "Source boundary",
      sourceBoundarySummary,
      pairSource.sourceTier === "geometric-derived" ? "warn" : "info"
    )
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
    `<h3>Source boundary</h3>`,
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
    `<h3>Handover policy gates</h3>`,
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

function renderJsonTree(val: unknown, keyName?: string): string {
  const displayKey = keyName !== undefined ? `<span class="json-key">${escapeHtml(keyName)}:</span> ` : "";
  
  if (val === null) {
    return `<div class="json-leaf">${displayKey}<span class="json-val json-null">null</span></div>`;
  }
  if (val === undefined) {
    return `<div class="json-leaf">${displayKey}<span class="json-val json-null">undefined</span></div>`;
  }
  
  if (typeof val === "object") {
    const isArr = Array.isArray(val);
    const typeStr = isArr ? `Array(${val.length})` : "Object";
    const keys = Object.keys(val);
    if (keys.length === 0) {
      return `<div class="json-leaf">${displayKey}<span class="json-val json-empty">${isArr ? "[]" : "{}"}</span></div>`;
    }
    
    const content = keys
      .map((k) => renderJsonTree((val as any)[k], k))
      .join("");
      
    return `
      <details class="json-node"${keyName === undefined ? " open" : ""}>
        <summary>
          ${displayKey}
          <span class="json-meta">${typeStr}</span>
        </summary>
        <div class="json-children">${content}</div>
      </details>
    `;
  }
  
  let valClass = "json-string";
  if (typeof val === "number") valClass = "json-number";
  if (typeof val === "boolean") valClass = "json-boolean";
  
  return `
    <div class="json-leaf">
      ${displayKey}
      <span class="json-val ${valClass}">${escapeHtml(JSON.stringify(val))}</span>
    </div>
  `;
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
    `<p class="section-desc">The raw JSON payload is presented below as an interactive, collapsible tree explorer for deep SRE/developer inspection.</p>`,
    `<div class="json-explorer">${renderJsonTree(result)}</div>`
  ].join("");
}

export function buildRuntimeProjectionEvidenceReportHtml(
  result: RuntimeProjectionResult
): string {
  const title = `Selected-pair evidence report - ${result.pair.stationA.name} to ${result.pair.stationB.name}`;
  const generatedAtUtc = new Date().toISOString();
  const filename = buildRuntimeProjectionEvidenceReportFilename(result);
  const tabs = [
    ["summary", "Summary"],
    ["visibility", `Visibility (${result.visibilityWindows.length})`],
    ["handover", `Handover (${result.handoverEvents.length})`],
    ["sources", "Sources"],
    ["models", "Models"],
    ["runtime", "Raw data"]
  ] as const;
  const tabButtons = tabs
    .map(
      ([id, label], index) =>
        `<button type="button" id="tab-${id}" role="tab" data-tab-target="${id}" aria-controls="${id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}">${escapeHtml(label)}</button>`
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
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    :root {
      color-scheme: dark;
      --bg-base: #060e18;
      --bg-surface: rgba(12, 26, 42, 0.88);
      --bg-card: rgba(16, 32, 52, 0.72);
      --bg-elevated: rgba(22, 42, 66, 0.65);
      --border-subtle: rgba(126, 226, 184, 0.12);
      --border-default: rgba(126, 226, 184, 0.18);
      --border-accent: rgba(52, 211, 153, 0.4);
      --text-primary: #ffffff;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --accent: #34d399;
      --accent-dim: #059669;
      --accent-glow: rgba(52, 211, 153, 0.15);
      --tone-ok: #34d399;
      --tone-warn: #f59e0b;
      --tone-info: #3b82f6;
      --tone-ok-bg: rgba(52, 211, 153, 0.08);
      --tone-warn-bg: rgba(245, 158, 11, 0.08);
      --tone-info-bg: rgba(59, 130, 246, 0.08);
      font-family: "IBM Plex Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      font-size: 16px;
    }
    header {
      background: linear-gradient(180deg, rgba(52, 211, 153, 0.06) 0%, transparent 100%);
      border-bottom: 1px solid var(--border-subtle);
    }
    .report-header {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 24px;
    }
    .header-top {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      justify-content: space-between;
    }
    h1 {
      max-width: 820px;
      margin: 0 0 10px;
      font-size: clamp(26px, 4vw, 36px);
      font-weight: 700;
      line-height: 1.16;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }
    h2 {
      margin: 0 0 18px;
      font-size: 24px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }
    h3 {
      margin: 28px 0 14px;
      font-size: 18px;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: 0;
      color: var(--accent);
    }
    p { line-height: 1.6; }
    .meta {
      color: var(--text-secondary);
      margin: 0;
      font-size: 15px;
    }
    .report-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 8px;
      align-items: center;
    }
    .report-button {
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--accent-dim);
      border-radius: 8px;
      background: var(--accent-dim);
      color: #ffffff;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .report-button:hover {
      background: var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(6, 14, 24, 0.92);
      border-bottom: 1px solid var(--border-subtle);
      backdrop-filter: blur(12px);
    }
    .toolbar-inner {
      max-width: 1180px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      padding: 12px 24px;
    }
    [role="tablist"] {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    [role="tab"] {
      min-height: 36px;
      padding: 0 14px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      letter-spacing: 0;
      transition: all 0.15s;
    }
    [role="tab"]:hover {
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    [role="tab"][aria-selected="true"] {
      border-color: var(--accent);
      background: var(--accent-glow);
      color: var(--accent);
      font-weight: 600;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    input[type="search"] {
      min-height: 36px;
      min-width: min(320px, 100%);
      margin-left: auto;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
      font-size: 14px;
      letter-spacing: 0;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="search"]::placeholder {
      color: var(--text-muted);
    }
    input[type="search"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 26px 24px 54px;
    }
    .summary-grid,
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .metric-card,
    .evidence-card,
    .report-section,
    .callout {
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      padding: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .metric-card:hover,
    .evidence-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .metric-card span,
    .evidence-card span {
      display: block;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .metric-card strong,
    .evidence-card strong {
      display: block;
      margin-top: 8px;
      color: var(--text-primary);
      font-size: 32px;
      font-weight: 700;
      line-height: 1.18;
      overflow-wrap: anywhere;
    }
    .metric-card p,
    .evidence-card p,
    .callout p {
      margin: 8px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.55;
    }
    .evidence-card[data-tone="ok"] {
      border-left: 3px solid var(--tone-ok);
      background: var(--tone-ok-bg);
    }
    .evidence-card[data-tone="ok"] strong {
      color: var(--tone-ok);
    }
    .evidence-card[data-tone="warn"],
    .callout[data-tone="warn"] {
      border-left: 3px solid var(--tone-warn);
      background: var(--tone-warn-bg);
    }
    .evidence-card[data-tone="warn"] strong {
      color: var(--tone-warn);
    }
    .evidence-card[data-tone="info"],
    .callout[data-tone="info"] {
      border-left: 3px solid var(--tone-info);
      background: var(--tone-info-bg);
    }
    .evidence-card[data-tone="info"] strong {
      color: var(--tone-info);
    }
    .callout strong {
      color: var(--text-primary);
      font-size: 15px;
    }
    .report-section,
    .callout {
      margin-top: 18px;
    }
    .report-section h3 {
      margin-top: 0;
    }
    .table-wrap {
      width: 100%;
      overflow: auto;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      background: var(--bg-card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th,
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      text-align: left;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 61px;
      background: rgba(12, 26, 42, 0.95);
      color: var(--accent);
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      z-index: 1;
      white-space: nowrap;
      backdrop-filter: blur(6px);
    }
    td {
      color: var(--text-secondary);
      overflow-wrap: anywhere;
      line-height: 1.55;
    }
    tbody tr {
      transition: background 0.12s;
    }
    tbody tr:hover {
      background: rgba(52, 211, 153, 0.04);
    }
    tr[hidden] { display: none; }
    ul {
      margin-top: 8px;
      line-height: 1.6;
      color: var(--text-secondary);
      padding-left: 20px;
    }
    ul li {
      margin-bottom: 4px;
      font-size: 15px;
    }
    ul li::marker {
      color: var(--accent-dim);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 16px;
      background: rgba(4, 10, 18, 0.9);
      color: #a5f3c4;
      font-family: "IBM Plex Mono", "Fira Code", monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .section-desc {
      color: var(--text-secondary);
      font-size: 14px;
      margin-top: -6px;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .json-explorer {
      font-family: "IBM Plex Mono", "Fira Code", monospace;
      font-size: 13px;
      line-height: 1.6;
      background: rgba(4, 10, 18, 0.95);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 18px;
      color: #cbd5e1;
    }
    .json-node {
      margin-left: 12px;
    }
    .json-node > summary {
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      list-style: none;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .json-node > summary::before {
      content: "▶";
      display: inline-block;
      font-size: 9px;
      color: var(--accent-dim);
      transition: transform 0.15s;
    }
    .json-node[open] > summary::before {
      transform: rotate(90deg);
    }
    .json-node > summary:hover {
      background: rgba(52, 211, 153, 0.06);
    }
    .json-children {
      border-left: 1px dashed rgba(126, 226, 184, 0.15);
      margin-left: 10px;
      padding-left: 14px;
      margin-top: 2px;
      margin-bottom: 2px;
    }
    .json-leaf {
      margin-left: 20px;
      padding: 3px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .json-key {
      color: #818cf8; /* lavender/blue */
      font-weight: 500;
    }
    .json-meta {
      color: var(--text-muted);
      font-size: 11px;
      background: rgba(255, 255, 255, 0.04);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .json-val {
      overflow-wrap: anywhere;
    }
    .json-string { color: #34d399; }
    .json-number { color: #f59e0b; }
    .json-boolean { color: #3b82f6; }
    .json-null { color: #ef4444; }
    .json-empty { color: var(--text-muted); }
    .empty { color: var(--text-muted); font-style: italic; }
    /* scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-dim); }
    @media (max-width: 900px) {
      .report-header,
      .toolbar-inner,
      main {
        padding-left: 16px;
        padding-right: 16px;
      }
      .header-top {
        flex-direction: column;
      }
      .summary-grid,
      .evidence-grid {
        grid-template-columns: 1fr 1fr;
      }
      input[type="search"] {
        margin-left: 0;
        flex: 1 1 100%;
      }
    }
    @media (max-width: 560px) {
      .summary-grid,
      .evidence-grid {
        grid-template-columns: 1fr;
      }
      [role="tab"] {
        flex: 1 1 auto;
      }
    }
  </style>
</head>
<body data-report-filename="${escapeHtml(filename)}">
  <header>
    <div class="report-header">
      <div class="header-top">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">Generated ${escapeHtml(generatedAtUtc)} · ${escapeHtml(formatIsoShort(result.timeWindow.startUtc))} to ${escapeHtml(formatIsoShort(result.timeWindow.endUtc))}</p>
        </div>
        <div class="report-actions">
          <button type="button" class="report-button" data-download-html>Download HTML</button>
        </div>
      </div>
    </div>
  </header>
  <div class="toolbar">
    <div class="toolbar-inner">
      <div role="tablist" aria-label="Evidence report sections">${tabButtons}</div>
      <input type="search" data-report-filter aria-label="Filter active section" placeholder="Filter active section">
    </div>
  </div>
  <main>${panels}</main>
  <script>
    (() => {
      const tabs = Array.from(document.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const filter = document.querySelector("[data-report-filter]");
      const activate = (id) => {
        for (const tab of tabs) {
          const active = tab.dataset.tabTarget === id;
          tab.setAttribute("aria-selected", String(active));
          tab.setAttribute("tabindex", active ? "0" : "-1");
        }
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
      const downloadHtml = () => {
        const filename = document.body.dataset.reportFilename || "selected-pair-evidence-report.html";
        const blob = new Blob(["<!doctype html>\\n" + document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      };
      for (const tab of tabs) {
        tab.addEventListener("click", () => activate(tab.dataset.tabTarget));
        tab.addEventListener("keydown", (event) => {
          const current = tabs.indexOf(tab);
          const previous = (current - 1 + tabs.length) % tabs.length;
          const next = (current + 1) % tabs.length;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            activate(tabs[previous].dataset.tabTarget);
            tabs[previous].focus();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            activate(tabs[next].dataset.tabTarget);
            tabs[next].focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            activate(tabs[0].dataset.tabTarget);
            tabs[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            activate(tabs[tabs.length - 1].dataset.tabTarget);
            tabs[tabs.length - 1].focus();
          }
        });
      }
      document.querySelector("[data-download-html]")?.addEventListener("click", downloadHtml);
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
