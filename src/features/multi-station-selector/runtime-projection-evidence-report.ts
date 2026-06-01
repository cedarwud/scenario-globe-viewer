import type { RuntimeProjectionResult } from "./runtime-projection";

type ReportCell = string | number | boolean | null | undefined | { html: string };
type ReportRow = ReadonlyArray<ReportCell>;

const ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"] as const;
const POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
] as const;

function escapeHtml(value: ReportCell): string {
  if (value && typeof value === "object" && "html" in value) {
    return value.html;
  }
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInputSummaryToHtml(summary: Record<string, string | number | boolean | null | undefined> | undefined | null): { html: string } {
  if (!summary || Object.keys(summary).length === 0) {
    return { html: `<span style="color: var(--text-muted);">None</span>` };
  }

  const keyMap: Record<string, string> = {
    rainRateMmPerHour: "Rain Rate",
    handoverSampleStepSeconds: "Sample Step",
    activePolicyId: "Active Policy",
    policyLatencyBudgetMs: "Latency Budget",
    policyHysteresisDb: "Hysteresis",
    policyMinVisibilityWindowMs: "Min Vis Window",
    leoCadenceSeconds: "LEO Cadence",
    meoCadenceSeconds: "MEO Cadence",
    geoCadenceSeconds: "GEO Cadence",
    baseElevationThresholdDeg: "Base Elevation",
    stationAEffectiveElevationThresholdDeg: "Station A Elev",
    stationBEffectiveElevationThresholdDeg: "Station B Elev",
    elevationThresholdDeg: "Elev Threshold",
    outputKind: "Output Kind",
    eventCount: "Event Count",
    carrierSelection: "Carrier Selection",
    capacityModel: "Capacity Model",
  };

  const formatValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return `—`;
    
    if (key.endsWith("Ms")) {
      return `${val} ms`;
    }
    if (key.endsWith("Seconds") || key.endsWith("s")) {
      return `${val} s`;
    }
    if (key.endsWith("Deg")) {
      return `${val}°`;
    }
    if (key === "rainRateMmPerHour") {
      return `${val} mm/h`;
    }
    if (key === "policyHysteresisDb") {
      return `${val} dB`;
    }
    
    if (typeof val === "boolean") {
      return val ? `<span style="color: var(--accent); font-weight: 600;">true</span>` : `<span style="color: var(--text-muted);">false</span>`;
    }
    
    return String(val);
  };

  const items = Object.entries(summary)
    .map(([key, val]) => {
      const label = keyMap[key] || key;
      const formattedVal = formatValue(key, val);
      const escapedLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedVal = typeof formattedVal === "string" && formattedVal.includes("<span") 
        ? formattedVal 
        : String(formattedVal).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      return `<div class="inputs-item">
        <span class="inputs-label" title="${escapedLabel}">${escapedLabel}</span>
        <span class="inputs-value" title="${escapedVal.replace(/<[^>]*>/g, '')}">${escapedVal}</span>
      </div>`;
    })
    .join("");

  return {
    html: `<div class="inputs-grid">${items}</div>`
  };
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
  return result.dataCompleteness.stationPrecision.map((station) => {
    let badgeHtml = "";
    if (station.sourceTier === "public-disclosed") {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-2">公開披露宣告 (Tier 2)</span>`;
    } else if (station.sourceTier === "geometric-derived") {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-3">幾何極限推算 (Tier 3)</span>`;
    } else if ((station.sourceTier as string) === "operator-validated" || (station.sourceTier as string) === "tier-1") {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-1">實測/營運資料 (Tier 1)</span>`;
    } else {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-3">${escapeHtml(station.sourceTier)}</span>`;
    }
    return [
      station.stationId,
      station.disclosurePrecision,
      { html: `${escapeHtml(station.sourceTier)}${badgeHtml}` },
      station.coordinateSourceAuthority,
      station.coordinateSourceNote,
      station.elevationM,
      station.terrainMaskDeg,
      station.effectiveElevationThresholdDeg
    ];
  });
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

function renderModeledOutputsCards(result: RuntimeProjectionResult): string {
  if (result.dataCompleteness.modeledOutputs.length === 0) {
    return `<p class="empty">No modeled outputs.</p>`;
  }

  return `<div class="model-cards-list">` + 
    result.dataCompleteness.modeledOutputs.map((output) => {
      const standards = output.standardsRef.map(s => `<li>${escapeHtml(s)}</li>`).join("");
      const formattedInputs = formatInputSummaryToHtml(output.inputSummary).html;
      const rainRateLabel = output.rainRateControlMode ? `
        <div class="meta-item">
          <span class="meta-label">Rain Control</span>
          <span class="meta-val badge badge-info">${escapeHtml(output.rainRateControlMode)}</span>
        </div>` : "";

      const truthClass = output.provenance.truthClass;
      let provenanceBadge = "";
      if (truthClass.includes("formula") || truthClass.includes("standard")) {
        provenanceBadge = `<span class="context-only badge-provenance badge-formula">標準公式衍生</span>`;
      } else if (truthClass.includes("simulation") || truthClass.includes("empirical") || output.modelId.includes("rain")) {
        provenanceBadge = `<span class="context-only badge-provenance badge-simulation">模擬假設估算</span>`;
      }

      return `
        <div class="model-card">
          <div class="model-card-header">
            <div class="model-title-group">
              <span class="model-kind-badge">${escapeHtml(output.kind)}</span>
              <h4 class="model-name">${escapeHtml(output.modelId)}</h4>
            </div>
            <div class="model-unit-badge">${escapeHtml(output.outputUnit)}</div>
          </div>
          <div class="model-card-body">
            <div class="model-info-column">
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Truth Class</span>
                  <span class="meta-val badge badge-ok">${escapeHtml(output.provenance.truthClass)}</span>
                  ${provenanceBadge}
                </div>
                ${rainRateLabel}
              </div>
              <div class="standards-section">
                <span class="section-label">Applicable Standards</span>
                <ul>${standards}</ul>
              </div>
              <div class="non-claim-section">
                <span class="section-label">Non-claim Disclosure</span>
                <p>${escapeHtml(output.nonClaim)}</p>
              </div>
            </div>
            <div class="model-inputs-column">
              <span class="section-label">Model Inputs</span>
              ${formattedInputs}
            </div>
          </div>
        </div>
      `;
    }).join("") + 
    `</div>`;
}

function renderRfChainCards(result: RuntimeProjectionResult): string {
  if (result.dataCompleteness.rfChainBreakdown.terms.length === 0) {
    return `<p class="empty">No RF chain breakdown terms.</p>`;
  }

  return `<div class="model-cards-list">` + 
    result.dataCompleteness.rfChainBreakdown.terms.map((term) => {
      const standards = term.standardsRef.map(s => `<li>${escapeHtml(s)}</li>`).join("");
      const formattedInputs = formatInputSummaryToHtml(term.inputSummary).html;
      const contributionSign = term.contributionSignedDb !== null && term.contributionSignedDb > 0 ? "+" : "";
      const contributionDisplay = term.contributionSignedDb !== null ? `${contributionSign}${escapeHtml(term.contributionSignedDb)} dB` : "—";

      const truthClass = term.provenance.truthClass;
      let provenanceBadge = "";
      if (truthClass.includes("formula") || truthClass.includes("standard")) {
        provenanceBadge = `<span class="context-only badge-provenance badge-formula">標準公式衍生</span>`;
      } else if (truthClass.includes("simulation") || truthClass.includes("empirical") || term.modelId.includes("rain")) {
        provenanceBadge = `<span class="context-only badge-provenance badge-simulation">模擬假設估算</span>`;
      }

      return `
        <div class="model-card">
          <div class="model-card-header">
            <div class="model-title-group">
              <span class="model-kind-badge">${escapeHtml(term.kind)}</span>
              <h4 class="model-name">${escapeHtml(term.modelId)}</h4>
            </div>
            <div class="model-unit-badge term-contribution">${contributionDisplay}</div>
          </div>
          <div class="model-card-body">
            <div class="model-info-column">
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Truth Class</span>
                  <span class="meta-val badge badge-ok">${escapeHtml(term.provenance.truthClass)}</span>
                  ${provenanceBadge}
                </div>
              </div>
              <div class="standards-section">
                <span class="section-label">Applicable Standards</span>
                <ul>${standards}</ul>
              </div>
              <div class="non-claim-section">
                <span class="section-label">Non-claim Disclosure</span>
                <p>${escapeHtml(term.nonClaim)}</p>
              </div>
            </div>
            <div class="model-inputs-column">
              <span class="section-label">Model Inputs</span>
              ${formattedInputs}
            </div>
          </div>
        </div>
      `;
    }).join("") + 
    `</div>`;
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

  // Availability Gauge calculation
  const availabilityPercent = (windowMs && windowMs > 0)
    ? Math.min(100, (result.communicationStats.totalCommunicatingMs / windowMs) * 100)
    : 0;

  const availabilityGaugeHtml = `
    <div class="availability-gauge-container">
      <svg class="availability-gauge" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34d399" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255, 255, 255, 0.05)" stroke-width="8" />
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#gauge-grad)" stroke-width="8"
                stroke-dasharray="251.327"
                stroke-dashoffset="${251.327 - (251.327 * availabilityPercent) / 100}"
                stroke-linecap="round"
                transform="rotate(-90 50 50)" />
        <text x="50" y="56" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="700" font-family="Outfit, sans-serif">${availabilityPercent.toFixed(1)}%</text>
      </svg>
    </div>
  `;

  // Orbit percentages calculation
  const leoMs = result.communicationStats.byOrbit["LEO"] || 0;
  const meoMs = result.communicationStats.byOrbit["MEO"] || 0;
  const geoMs = result.communicationStats.byOrbit["GEO"] || 0;
  const totalOrbitsMs = leoMs + meoMs + geoMs;

  const leoPct = totalOrbitsMs > 0 ? (leoMs / totalOrbitsMs) * 100 : 0;
  const meoPct = totalOrbitsMs > 0 ? (meoMs / totalOrbitsMs) * 100 : 0;
  const geoPct = totalOrbitsMs > 0 ? (geoMs / totalOrbitsMs) * 100 : 0;

  const orbitDistributionHtml = `
    <div class="orbit-distribution-container">
      <div class="orbit-bar">
        ${leoPct > 0 ? `<div class="orbit-bar-segment segment-leo" style="width: ${leoPct}%;" title="LEO: ${leoPct.toFixed(1)}% (${formatDurationMs(leoMs)})"></div>` : ""}
        ${meoPct > 0 ? `<div class="orbit-bar-segment segment-meo" style="width: ${meoPct}%;" title="MEO: ${meoPct.toFixed(1)}% (${formatDurationMs(meoMs)})"></div>` : ""}
        ${geoPct > 0 ? `<div class="orbit-bar-segment segment-geo" style="width: ${geoPct}%;" title="GEO: ${geoPct.toFixed(1)}% (${formatDurationMs(geoMs)})"></div>` : ""}
        ${totalOrbitsMs === 0 ? `<div class="orbit-bar-segment segment-empty" style="width: 100%;"></div>` : ""}
      </div>
      <div class="orbit-legend">
        <span class="legend-item"><span class="dot dot-leo"></span> LEO: ${leoPct.toFixed(1)}%</span>
        <span class="legend-item"><span class="dot dot-meo"></span> MEO: ${meoPct.toFixed(1)}%</span>
        <span class="legend-item"><span class="dot dot-geo"></span> GEO: ${geoPct.toFixed(1)}%</span>
      </div>
    </div>
  `;

  let pairSourceBadge = "";
  if (pairSource.sourceTier === "public-disclosed") {
    pairSourceBadge = `<span class="context-only badge-provenance badge-tier-2">公開披露宣告 (Tier 2)</span>`;
  } else if (pairSource.sourceTier === "geometric-derived") {
    if (pairSource.evidenceKind === "same-operator-family-inferred") {
      pairSourceBadge = `<span class="context-only badge-provenance badge-tier-3">幾何極限推算 (Tier 3 · 運營家族)</span>`;
    } else {
      pairSourceBadge = `<span class="context-only badge-provenance badge-tier-3">幾何極限推算 (Tier 3)</span>`;
    }
  } else if (pairSource.sourceTier === "operator-validated" || pairSource.sourceTier === "tier-1") {
    pairSourceBadge = `<span class="context-only badge-provenance badge-tier-1">實測/營運資料 (Tier 1)</span>`;
  }

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

  const formulasHtml = `
    <div class="context-only context-formulas-block">
      <h3>物理鏈路計算與標準引用 (Citations & Physical Formulas)</h3>
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">ITU-R P.525</span>
          <h4>自由空間路徑損耗 (FSPL)</h4>
        </div>
        <div class="formula-math">
          L<sub>fs</sub> = 32.44 + 20 log<sub>10</sub>(d<sub>km</sub>) + 20 log<sub>10</sub>(f<sub>GHz</sub>)
        </div>
        <p>計算測站到衛星之間在晴空無阻擋下的幾何擴散損耗。隨距離 d 與電磁波頻率 f 呈對數增長。</p>
      </div>
      
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">ITU-R P.618-14 §2.2.1</span>
          <h4>降雨衰減估算 (Rain Attenuation)</h4>
        </div>
        <div class="formula-math">
          A<sub>p</sub> = A<sub>0.01</sub> (p / 0.01)<sup>-(&gamma; + &eta; ln(p))</sup> dB
        </div>
        <p>根據測站當地降雨率（Rain Rate, R<sub>0.01</sub>）與極化方向，估算降雨帶來的額外訊號衰減。此處使用動態雨衰滑桿模擬不同降雨率對鏈路可用度的折損。</p>
      </div>

      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">3GPP TR 38.821 §7.3</span>
          <h4>星地切換決策 (Handover Policy)</h4>
        </div>
        <div class="formula-math">
          Serving Link = argmax<sub>s &isin; Vis</sub> { SNR(s) } 限制條件：&Delta;t &ge; T<sub>min</sub> 且 SNR 遲滯 &ge; H<sub>dB</sub>
        </div>
        <p>定義地面站如何在一組可見衛星中切換服務鏈路。V-MO1 策略限制了頻繁切換，避免頻繁天線重對焦帶來的切換損耗與信號震盪。</p>
      </div>
      
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">ITU-R S.1528</span>
          <h4>非對稱衛星天線增益 (Antenna Gain Pattern)</h4>
        </div>
        <div class="formula-math">
          G(&theta;) = G<sub>max</sub> - 2.5 &times; 10<sup>-3</sup> (D/&lambda; &middot; &theta;)<sup>2</sup> dB
        </div>
        <p>適用於低地球軌道（LEO）或非地球靜止軌道衛星的天線指向性增益模型，計算離軸角 &theta; 處的增益衰減。</p>
      </div>
    </div>
  `;

  return [
    `<div class="summary-dashboard">
      <div class="dashboard-card">
        <div class="card-content">
          <span class="card-title">Available Time</span>
          <strong class="card-value">${formatDurationMs(result.communicationStats.totalCommunicatingMs)}</strong>
          <p class="card-desc">Total communicating time in the selected window.</p>
          <div class="context-only context-interpretation">
            此數值代表在選定時間視窗內，測站對之間可維持雙向鏈路暢通的累計時間。低於 90% 將增加通訊延遲，可能影響即時命令與遙測傳輸。
          </div>
        </div>
        <div class="card-visual">
          ${availabilityGaugeHtml}
        </div>
      </div>
      
      <div class="dashboard-card">
        <div class="card-content">
          <span class="card-title">Handovers</span>
          <strong class="card-value">${result.communicationStats.handoverCount}</strong>
          <p class="card-desc">${crossOrbitCount} cross-orbit migrations.</p>
          <div class="context-only context-interpretation">
            頻繁切換（例如大於 5 次）可能意味著鏈路頻繁跨軌道遷移。在低軌（LEO）或中軌（MEO）場景中，頻繁切換將增加地面站跟蹤天線的對準開銷與重入延遲。
          </div>
        </div>
        <div class="card-visual flex-column">
          <div class="visual-label">Orbit Distribution</div>
          ${orbitDistributionHtml}
        </div>
      </div>
    </div>`,
    `<div class="summary-grid">
      <div class="metric-card">
        <span>Visibility Windows</span>
        <strong>${result.visibilityWindows.length}</strong>
        <p>Mutual station-to-satellite windows.</p>
      </div>
      <div class="metric-card">
        <span>Source Boundary</span>
        <strong>${{ html: `${escapeHtml(pairSource.badgeLabel)}${pairSourceBadge}` }}</strong>
        <p>${pairSource.evidenceKind.replace(/-/g, " ")}</p>
      </div>
    </div>`,
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
    ),
    formulasHtml
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
    renderModeledOutputsCards(result),
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
    renderRfChainCards(result)
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
    `<div class="json-explorer-actions">`,
    `  <button type="button" class="report-button report-button--secondary" data-json-expand-all>Expand All</button>`,
    `  <button type="button" class="report-button report-button--secondary" data-json-collapse-all>Collapse All</button>`,
    `</div>`,
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
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    :root {
      color-scheme: dark;
      --bg-base: #060e18;
      --bg-gradient: linear-gradient(135deg, #060e18 0%, #0c1a2c 100%);
      --bg-surface: rgba(12, 26, 42, 0.85);
      --bg-card: rgba(16, 32, 52, 0.6);
      --bg-elevated: rgba(22, 42, 66, 0.7);
      --border-subtle: rgba(157, 196, 232, 0.12);
      --border-default: rgba(157, 196, 232, 0.18);
      --border-accent: rgba(52, 211, 153, 0.4);
      --text-primary: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-muted: #8ba2bd;
      --accent: #34d399;
      --accent-dim: #059669;
      --accent-glow: rgba(52, 211, 153, 0.15);
      --tone-ok: #34d399;
      --tone-warn: #f59e0b;
      --tone-info: #3b82f6;
      --tone-ok-bg: rgba(52, 211, 153, 0.08);
      --tone-warn-bg: rgba(245, 158, 11, 0.08);
      --tone-info-bg: rgba(59, 130, 246, 0.08);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      font-size: 19px;
      line-height: 1.6;
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
    h1, h2, h3, h4, h5, h6 {
      font-family: Outfit, sans-serif;
      letter-spacing: -0.015em;
    }
    h1 {
      max-width: 820px;
      margin: 0 0 10px;
      font-size: clamp(22px, 3.2vw, 30px);
      font-weight: 800;
      line-height: 1.16;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 0%, #a5f3c4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 24px rgba(52, 211, 153, 0.1);
    }
    h2, h3 {
      margin: 28px 0 14px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.01em;
      background: linear-gradient(135deg, #ffffff 40%, #a5f3c4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p { line-height: 1.6; }
    .meta {
      color: var(--text-muted);
      margin: 0;
      font-size: 16px;
      line-height: 1.5;
    }
    .report-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 12px;
      align-items: center;
    }
    .report-button {
      min-height: 44px;
      padding: 0 20px;
      border: 1px solid var(--accent-dim);
      border-radius: 8px;
      background: var(--accent-dim);
      color: #ffffff;
      font: inherit;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: 0;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .report-button:hover {
      background: var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .report-button--secondary {
      background: var(--bg-card);
      border-color: var(--border-default);
      color: var(--text-secondary);
    }
    .report-button--secondary:hover {
      background: var(--bg-elevated);
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    .json-explorer-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
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
      min-height: 44px;
      padding: 0 16px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      font: inherit;
      font-size: 17px;
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
      min-height: 44px;
      min-width: min(320px, 100%);
      margin-left: auto;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
      font-size: 17px;
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card,
    .evidence-card,
    .report-section,
    .callout {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      padding: 20px;
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
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .metric-card strong,
    .evidence-card strong {
      display: block;
      margin-top: 8px;
      color: #ffffff;
      font-size: clamp(24px, 2.5vw, 30px);
      font-weight: 700;
      line-height: 1.18;
      overflow-wrap: anywhere;
    }
    .metric-card p,
    .evidence-card p,
    .callout p {
      margin: 10px 0 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.5;
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
      color: #ffffff;
      font-size: 18px;
    }
    .report-section,
    .callout {
      margin-top: 24px;
    }
    .report-section h3 {
      margin-top: 0;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
    }
    th,
    td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: rgba(12, 26, 42, 0.97);
      color: var(--accent);
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    td {
      color: var(--text-secondary);
      overflow-wrap: anywhere;
      line-height: 1.5;
    }
    .model-cards-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-top: 16px;
      margin-bottom: 32px;
    }
    .model-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .model-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .model-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .model-kind-badge {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      color: var(--accent);
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.2);
      padding: 4px 8px;
      border-radius: 6px;
    }
    .model-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
    }
    .model-unit-badge {
      font-size: 14px;
      font-weight: 600;
      color: var(--accent);
      background: rgba(52, 211, 153, 0.06);
      border: 1px solid rgba(52, 211, 153, 0.15);
      padding: 6px 12px;
      border-radius: 8px;
      font-family: var(--font-mono, monospace);
    }
    .model-unit-badge.term-contribution {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.06);
      border-color: rgba(56, 189, 248, 0.15);
    }
    .model-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      padding: 24px;
    }
    @media (max-width: 900px) {
      .model-card-body {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
    .model-info-column {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .meta-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .meta-val.badge {
      font-size: 13px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .badge-ok {
      color: #34d399;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.15);
    }
    .badge-info {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.15);
    }
    .badge-warn {
      color: #fb7185;
      background: rgba(251, 113, 133, 0.08);
      border: 1px solid rgba(251, 113, 133, 0.15);
    }
    .section-label {
      display: block;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
      border-left: 3px solid var(--accent);
      padding-left: 8px;
    }
    .standards-section ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text-secondary);
    }
    .standards-section li {
      font-size: 16px;
      margin-bottom: 4px;
    }
    .non-claim-section p {
      margin: 0;
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .model-inputs-column {
      display: flex;
      flex-direction: column;
    }
    .inputs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 10px 12px;
      font-size: 16px;
      line-height: 1.4;
      margin: 6px 0;
    }
    .inputs-item {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.025);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s, border-color 0.15s;
    }
    .inputs-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(52, 211, 153, 0.15);
    }
    .inputs-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .inputs-value {
      font-weight: 600;
      color: var(--text-secondary);
      font-family: var(--font-mono, monospace);
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      margin-bottom: 6px;
      font-size: 17px;
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
      font-size: 15px;
      line-height: 1.5;
    }
    .section-desc {
      color: var(--text-secondary);
      font-size: 16px;
      margin-top: -4px;
      margin-bottom: 16px;
      line-height: 1.55;
    }
    .json-explorer {
      font-family: "IBM Plex Mono", "Fira Code", monospace;
      font-size: 15px;
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
      font-size: 11px;
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
      font-size: 13px;
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

    /* Summary Dashboard styling */
    .summary-dashboard {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .summary-dashboard {
        grid-template-columns: 1fr;
      }
    }
    .dashboard-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 24px;
      backdrop-filter: blur(8px);
      transition: all 0.2s;
    }
    .dashboard-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .dashboard-card .card-content {
      flex: 1;
      padding-right: 16px;
    }
    .dashboard-card .card-title {
      display: block;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .dashboard-card .card-value {
      display: block;
      margin-top: 8px;
      font-size: clamp(28px, 3vw, 36px);
      font-weight: 800;
      color: #ffffff;
      font-family: Outfit, sans-serif;
    }
    .dashboard-card .card-desc {
      margin: 8px 0 0;
      font-size: 15px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .dashboard-card .card-visual {
      flex: 0 0 130px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .dashboard-card .card-visual.flex-column {
      flex-direction: column;
      align-items: stretch;
      flex: 0 0 220px;
    }
    .visual-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: 600;
      text-align: right;
    }
    
    /* Availability Gauge */
    .availability-gauge-container {
      position: relative;
      width: 120px;
      height: 120px;
    }
    .availability-gauge {
      width: 120px;
      height: 120px;
    }
    
    /* Orbit Distribution Bar */
    .orbit-distribution-container {
      width: 100%;
    }
    .orbit-bar {
      display: flex;
      height: 16px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 12px;
    }
    .orbit-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }
    .segment-leo {
      background: #fbbf24;
      box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
    }
    .segment-meo {
      background: #5eead4;
      box-shadow: 0 0 8px rgba(94, 234, 212, 0.3);
    }
    .segment-geo {
      background: #38bdf8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
    }
    .segment-empty {
      background: rgba(255, 255, 255, 0.05);
    }
    .orbit-legend {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .legend-item .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .dot-leo { background: #fbbf24; }
    .dot-meo { background: #5eead4; }
    .dot-geo { background: #38bdf8; }

    /* Provenance Badges */
    .badge-provenance {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      margin-left: 8px;
      vertical-align: middle;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .badge-tier-1 {
      color: #34d399;
      background: rgba(52, 211, 153, 0.08);
      border-color: rgba(52, 211, 153, 0.2);
    }
    .badge-tier-2 {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      border-color: rgba(56, 189, 248, 0.2);
    }
    .badge-tier-3 {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.08);
      border-color: rgba(148, 163, 184, 0.2);
    }
    .badge-formula {
      color: #fb923c;
      background: rgba(251, 146, 60, 0.08);
      border-color: rgba(251, 146, 60, 0.2);
    }
    .badge-simulation {
      color: #c084fc;
      background: rgba(192, 132, 252, 0.08);
      border-color: rgba(192, 132, 252, 0.2);
    }

    /* Double modes: Data vs Context */
    .mode-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--border-subtle);
    }
    .mode-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      user-select: none;
      transition: color 0.2s;
    }
    .toggle-switch-wrapper {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle-switch-slider {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: var(--text-muted);
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }

    /* CSS-only behavior mapping from #mode-toggle */
    .context-only {
      display: none !important;
    }
    #mode-toggle:checked ~ main .context-only,
    #mode-toggle:checked ~ header .context-only,
    #mode-toggle:checked ~ .toolbar .context-only {
      display: block !important;
    }
    #mode-toggle:checked ~ main span.context-only.badge-provenance {
      display: inline-block !important;
    }
    #mode-toggle:checked ~ header .mode-label-context {
      color: var(--accent);
    }
    #mode-toggle:not(:checked) ~ header .mode-label-data {
      color: var(--accent);
    }
    #mode-toggle:checked ~ header .toggle-switch-wrapper {
      background: var(--accent-dim);
    }
    #mode-toggle:checked ~ header .toggle-switch-slider {
      transform: translateX(22px);
      background: #ffffff;
    }
    
    #mode-toggle:checked ~ main div.context-only.context-interpretation {
      display: block !important;
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid var(--tone-info);
      border-radius: 4px;
      font-size: 15px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    /* Formulas styling */
    .context-formulas-block {
      margin-top: 24px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 24px;
    }
    .formula-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .formula-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .formula-header h4 {
      margin: 0;
      font-size: 17px;
      color: #ffffff;
    }
    .badge-standard {
      font-size: 11px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .formula-math {
      font-family: "IBM Plex Mono", monospace;
      font-size: 15px;
      background: rgba(0,0,0,0.2);
      padding: 10px 14px;
      border-radius: 6px;
      border-left: 3px solid var(--accent);
      color: #a5f3c4;
      margin-bottom: 10px;
      overflow-x: auto;
    }
    .formula-card p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .report-header,
      .toolbar-inner,
      main {
        padding-left: 16px;
        padding-right: 16px;
      }
      .header-top {
        flex-direction: column;
        gap: 16px;
      }
      .summary-grid,
      .evidence-grid {
        grid-template-columns: 1fr;
      }
      input[type="search"] {
        margin-left: 0;
        flex: 1 1 100%;
      }
    }
    @media (max-width: 560px) {
      [role="tab"] {
        flex: 1 1 auto;
      }
    }
    .back-to-top-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1px solid var(--accent);
      background: var(--bg-surface);
      color: var(--accent);
      backdrop-filter: blur(12px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px);
      transition: opacity 0.25s, transform 0.25s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
      z-index: 99;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .back-to-top-btn:hover {
      background: var(--accent);
      color: #ffffff;
      box-shadow: 0 0 16px var(--accent-glow);
      transform: translateY(-2px);
    }
    .back-to-top-btn:active {
      transform: translateY(0);
    }
    .back-to-top-btn.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
  </style>
</head>
<body data-report-filename="${escapeHtml(filename)}">
  <input type="checkbox" id="mode-toggle" class="mode-toggle-checkbox" hidden>
  <header>
    <div class="report-header">
      <div class="header-top">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">Generated ${escapeHtml(generatedAtUtc)} · ${escapeHtml(formatIsoShort(result.timeWindow.startUtc))} to ${escapeHtml(formatIsoShort(result.timeWindow.endUtc))}</p>
        </div>
        <div class="report-actions">
          <div class="mode-selector">
            <span class="mode-label mode-label-data">Data Mode</span>
            <label for="mode-toggle" class="toggle-switch-wrapper" title="切換簡明數據與深度導讀模式">
              <span class="toggle-switch-slider"></span>
            </label>
            <span class="mode-label mode-label-context">Context Mode</span>
          </div>
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
      document.querySelector("[data-json-expand-all]")?.addEventListener("click", () => {
        for (const details of document.querySelectorAll(".json-explorer details")) {
          details.open = true;
        }
      });
      document.querySelector("[data-json-collapse-all]")?.addEventListener("click", () => {
        for (const details of document.querySelectorAll(".json-explorer details")) {
          details.open = false;
        }
      });
      const backToTopBtn = document.querySelector("[data-back-to-top]");
      if (backToTopBtn) {
        const handleScroll = () => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          if (scrollTop > 100) {
            backToTopBtn.classList.add("visible");
          } else {
            backToTopBtn.classList.remove("visible");
          }
        };
        window.addEventListener("scroll", handleScroll);
        // Initialize once to guarantee correct state on load/reload
        handleScroll();

        backToTopBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    })();
  </script>
  <button type="button" class="back-to-top-btn" data-back-to-top aria-label="Scroll to top" title="Scroll to top">
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>
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
