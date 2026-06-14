import {
  computeLinkBudgetMetricsForOrbit,
  type LinkBudgetRainEndpoint,
  type RepresentativeLinkBudget,
  type RuntimeProjectionResult
} from "./runtime-projection";
import { SGP4_REFERENCE_VECTORS } from "./sgp4-reference-vectors";
import {
  SELECTED_PAIR_EXTERNAL_EVIDENCE,
  SELECTED_PAIR_MISSING_EVIDENCE,
  type SelectedPairEvidenceStatus
} from "./selected-pair-report-evidence-manifest";

type ReportCell = string | number | boolean | null | undefined | { html: string };
type ReportRow = ReadonlyArray<ReportCell>;
type TruthChipTone = "model" | "public" | "standard" | "external" | "display" | "gap";
type EvidenceDetailRow = readonly [string, string];
type FieldGuideRow = readonly [string, string, string, string];

interface ProvenanceLike {
  readonly truthClass?: string;
  readonly sourceId?: string;
  readonly modelId?: string;
  readonly nonClaim?: string;
}

interface LineageItem {
  readonly label: string;
  readonly chipHtml: string;
  readonly detail: string;
  readonly sourceRefs?: ReadonlyArray<string>;
  readonly howToRead?: string;
  readonly sourceBoundary?: string;
  readonly nonClaim?: string;
  readonly sourceIssue?: string;
}

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

function formatReportTitleStation(
  station: RuntimeProjectionResult["pair"]["stationA"]
): string {
  const countryCode = station.country.trim().toUpperCase();
  return countryCode ? `${countryCode} ${station.name}` : station.name;
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
    antennaModel: "Antenna Model",
    antennaParameterSource: "Antenna Source",
    antennaSourceClass: "Antenna Class",
    antennaAssumptionSet: "Antenna Assumptions",
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

function table(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReportRow>,
  attributes = ""
): string {
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
  return `<div class="table-wrap" data-row-count="${rows.length}"${
    attributes ? ` ${attributes}` : ""
  }><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
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

function sourceIssueMarker(label: string, title: string): string {
  return `<span class="source-issue-marker" data-source-issue-marker="true" tabindex="0" aria-label="${escapeHtml(
    `${label}: ${title}`
  )}" title="${escapeHtml(
    title
  )}">${escapeHtml(label)}</span>`;
}

function evidenceDetailPanel(
  rows: ReadonlyArray<EvidenceDetailRow>,
  className = ""
): string {
  const extraClass = className ? ` ${className}` : "";
  return `<dl class="evidence-detail-panel${extraClass} evidence-detail-only" data-evidence-detail-panel="true">${rows
    .map(
      ([term, detail]) =>
        `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(detail)}</dd></div>`
    )
    .join("")}</dl>`;
}

function truthChip(label: string, tone: TruthChipTone, title?: string): string {
  return `<span class="truth-chip" data-tone="${tone}"${
    title ? ` title="${escapeHtml(title)}"` : ""
  }>${escapeHtml(label)}</span>`;
}

function provenanceChipForTier(sourceTier: string, evidenceKind?: string): string {
  if (sourceTier === "public-disclosed") {
    return truthChip(
      "External evidence",
      "external",
      evidenceKind ? `${sourceTier}; ${evidenceKind}` : sourceTier
    );
  }
  if (sourceTier === "geometric-derived") {
    return truthChip(
      "Model-derived",
      "model",
      evidenceKind ? `${sourceTier}; ${evidenceKind}` : sourceTier
    );
  }
  return truthChip("Source gap", "gap", sourceTier);
}

function evidenceStatusChip(status: SelectedPairEvidenceStatus): { html: string } {
  if (status === "available") {
    return { html: truthChip("External evidence", "external", status) };
  }
  if (status === "partial") {
    return { html: `${truthChip("External evidence", "external", status)}${truthChip("Source gap", "gap", status)}` };
  }
  return { html: truthChip("Source gap", "gap", status) };
}

function joinEvidenceIds(values: ReadonlyArray<string>): string {
  return values.join(" | ");
}

function provenanceChipForTag(
  provenance: ProvenanceLike,
  standardsRef: ReadonlyArray<string> = []
): string {
  const truthClass = provenance.truthClass ?? "";
  const sourceId = provenance.sourceId ?? "";
  if (truthClass === "display-only" || sourceId.includes("display")) {
    return truthChip("Display transform", "display", sourceId || truthClass);
  }
  if (truthClass === "public-registry-derived" || truthClass === "tle-derived" || truthClass === "omm-derived") {
    return truthChip("Public source", "public", sourceId || truthClass);
  }
  if (truthClass === "modeled") {
    return standardsRef.length > 0
      ? truthChip("Standards-derived", "standard", standardsRef.join(" | "))
      : truthChip("Model-derived", "model", provenance.modelId ?? sourceId);
  }
  return truthChip("Source gap", "gap", provenance.nonClaim ?? sourceId ?? truthClass);
}

function lineagePanel(
  title: string,
  items: ReadonlyArray<LineageItem>,
  explainedText?: string
): string {
  const cards = items
    .map((item) => {
      const sources =
        item.sourceRefs && item.sourceRefs.length > 0
          ? `<span class="lineage-sources">${escapeHtml(item.sourceRefs.join(" | "))}</span>`
          : "";
      return `<div class="lineage-item">
        <div class="lineage-item__top">
          <span class="lineage-label">${escapeHtml(item.label)}</span>
          ${item.chipHtml}
        </div>
        ${item.sourceIssue ? sourceIssueMarker("Source gap", item.sourceIssue) : ""}
        <p>${escapeHtml(item.detail)}</p>
        ${sources}
        ${
          item.howToRead || item.sourceBoundary || item.nonClaim
            ? evidenceDetailPanel([
                ["解讀", item.howToRead ?? "把這個欄位當成本次報告的判讀脈絡。"],
                ["資料來源", item.sourceBoundary ?? "請對照 Sources 分頁中的來源帳本列。"],
                ["限制", item.nonClaim ?? "此欄位不能把資料可信度提高到標籤標示以外。"]
              ])
            : ""
        }
      </div>`;
    })
    .join("");
  const explained = explainedText
    ? `<p class="evidence-detail-only lineage-detail">${escapeHtml(explainedText)}</p>`
    : "";
  return `<aside class="lineage-panel" data-lineage-panel="true">
    <div class="lineage-panel__header">
      <span>Evidence lineage</span>
      <strong>${escapeHtml(title)}</strong>
    </div>
    <div class="lineage-grid">${cards}</div>
    ${explained}
  </aside>`;
}

function fieldGuide(title: string, rows: ReadonlyArray<FieldGuideRow>): string {
  return `<aside class="field-guide evidence-detail-only" data-field-guide="true">
    <h3 data-no-outline="true">${escapeHtml(title)}</h3>
    ${table(["欄位", "數據代表什麼", "怎麼解讀", "來源與限制"], rows)}
  </aside>`;
}

function stackedFieldGuide(title: string, rows: ReadonlyArray<FieldGuideRow>): string {
  return `<aside class="field-guide field-guide--stacked evidence-detail-only" data-field-guide="true">
    <h3 data-no-outline="true">${escapeHtml(title)}</h3>
    <div class="field-guide-table" role="table" aria-label="${escapeHtml(title)}">
      <div class="field-guide-table__head" role="row">
        <span role="columnheader">欄位</span>
        <span role="columnheader">數據代表什麼</span>
        <span role="columnheader">怎麼解讀</span>
        <span role="columnheader">來源與限制</span>
      </div>
      ${rows
        .map(
          ([field, meaning, howToRead, sourceLimit]) =>
            `<div class="field-guide-table__row" role="row">
              <strong role="cell">${escapeHtml(field)}</strong>
              <span role="cell" data-label="數據代表什麼">${escapeHtml(meaning)}</span>
              <span role="cell" data-label="怎麼解讀">${escapeHtml(howToRead)}</span>
              <span role="cell" data-label="來源與限制">${escapeHtml(sourceLimit)}</span>
            </div>`
        )
        .join("")}
    </div>
  </aside>`;
}

function evidenceCardDetailed(
  title: string,
  value: ReportCell,
  description: string,
  tone: "ok" | "warn" | "info",
  detailRows: ReadonlyArray<EvidenceDetailRow>
): string {
  return `<article class="evidence-card" data-tone="${tone}"><span>${escapeHtml(
    title
  )}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(description)}</p>${evidenceDetailPanel(
    detailRows
  )}</article>`;
}

function callout(title: string, body: string, tone: "info" | "warn" = "info"): string {
  return `<aside class="callout" data-tone="${tone}"><strong>${escapeHtml(
    title
  )}</strong><p>${escapeHtml(body)}</p></aside>`;
}

function sectionSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

function sectionAnchorTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function withSectionOutline(panelId: string, panelTitle: string, body: string): string {
  const seen = new Map<string, number>();
  const outlineItems: string[] = [];
  const anchoredBody = body.replace(/<h3>([^<]+)<\/h3>/g, (_match, rawTitle: string) => {
    const cleanTitle = sectionAnchorTitle(rawTitle);
    const baseSlug = sectionSlug(cleanTitle);
    const nextCount = (seen.get(baseSlug) ?? 0) + 1;
    seen.set(baseSlug, nextCount);
    const anchorId = `${panelId}-${baseSlug}${nextCount > 1 ? `-${nextCount}` : ""}`;
    outlineItems.push(
      `<a class="section-outline__link" data-section-outline-link="true" href="#${escapeHtml(anchorId)}"><span>${escapeHtml(cleanTitle)}</span></a>`
    );
    return `<h3 id="${escapeHtml(anchorId)}" data-section-heading="true">${escapeHtml(rawTitle)}</h3>`;
  });

  if (outlineItems.length === 0) {
    outlineItems.push(
      `<a class="section-outline__link" data-section-outline-link="true" href="#${escapeHtml(panelId)}"><span>${escapeHtml(panelTitle)}</span></a>`
    );
  }

  return `<div class="panel-layout">
    <nav class="section-outline" aria-label="${escapeHtml(panelTitle)} sections">
      <div class="section-outline__links">${outlineItems.join("")}</div>
    </nav>
    <div class="panel-content">${anchoredBody}</div>
  </div>`;
}

function section(id: string, title: string, body: string, active = false): string {
  const content = withSectionOutline(id, title, body);
  return `<section id="${id}" class="tab-panel" role="tabpanel" data-tab-panel="${id}"${
    active ? "" : " hidden"
  } aria-labelledby="tab-${id}">${content}</section>`;
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
      badgeHtml = `<span class="context-only badge-provenance badge-tier-2">Public disclosure (Tier 2)</span>`;
    } else if (station.sourceTier === "geometric-derived") {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-3">Geometric-derived (Tier 3)</span>`;
    } else if ((station.sourceTier as string) === "operator-validated" || (station.sourceTier as string) === "tier-1") {
      badgeHtml = `<span class="context-only badge-provenance badge-tier-1">Operator-validated (Tier 1)</span>`;
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

function stationRenderPositionCell(
  station: RuntimeProjectionResult["dataCompleteness"]["stationPrecision"][number]
): ReportCell {
  const label = station.renderPositionIsSourceTruth
    ? "source-coordinate"
    : "representative-coordinate";
  const chip = station.renderPositionIsSourceTruth
    ? truthChip("Public source", "public")
    : truthChip("Display transform", "display");
  return {
    html: `${escapeHtml(label)}${chip}`
  };
}

function stationElevationProvenanceCell(
  station: RuntimeProjectionResult["dataCompleteness"]["stationPrecision"][number]
): ReportCell {
  const gap =
    station.elevationProvenanceStatus === "dem-provenance-complete"
      ? ""
      : truthChip("Source gap", "gap", station.elevationNonClaim);
  return {
    html: `${escapeHtml(station.elevationProvenanceStatus)}${gap}`
  };
}

function stationTerrainSourceCell(
  sourceId: string,
  isDefault: boolean,
  note: string
): ReportCell {
  const gap = isDefault ? truthChip("Source gap", "gap", note) : "";
  return {
    html: `${escapeHtml(sourceId)}; default=${isDefault ? "yes" : "no"}${gap}`
  };
}

function stationRfSourceCell(
  value: string | number | null,
  sourceId: string,
  note: string
): ReportCell {
  const isGap = value === null || sourceId.startsWith("unavailable");
  return {
    html: `${escapeHtml(sourceId)}${isGap ? truthChip("Source gap", "gap", note) : ""}`
  };
}

function stationLineageRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.stationPrecision.map((station) => [
    station.stationId,
    { html: `${escapeHtml(station.provenance.truthClass)}${provenanceChipForTag(station.provenance)}` },
    station.coordinateSourceAuthority,
    station.coordinateSourceUrl ?? "",
    station.coordinateSourceNote,
    `${station.rawLat}, ${station.rawLon}`,
    station.coordinateUse,
    stationRenderPositionCell(station),
    station.elevationSourceId,
    stationElevationProvenanceCell(station),
    station.elevationDatasetVersion
      ? `${station.elevationDatasetId} / ${station.elevationDatasetVersion}`
      : station.elevationDatasetId,
    [
      `kind=${station.elevationSourceKind}`,
      `resolution=${station.elevationDatasetResolutionM ?? "n/a"}`,
      `datum=${station.elevationVerticalDatum ?? "n/a"}`,
      `tile=${station.elevationTileId ?? "n/a"}`,
      `cell=${station.elevationCellId ?? "n/a"}`,
      `sample=${station.elevationSampleLat ?? "n/a"},${station.elevationSampleLon ?? "n/a"}`,
      `method=${station.elevationSamplingMethod}`,
      `sampled=${formatIsoShort(station.elevationSampledAtUtc)}`,
      `cache=${formatIsoShort(station.elevationCacheGeneratedUtc)}`,
      `license=${station.elevationLicenseId}`
    ].join("; "),
    `${station.terrainMaskDeg} deg`,
    stationTerrainSourceCell(
      station.terrainMaskSourceId,
      station.terrainMaskIsDefault,
      station.terrainMaskNote
    ),
    station.effectiveElevationThresholdDeg
  ]);
}

function stationRfProfileRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.stationRfProfiles.map((profile) => [
    profile.stationId,
    { html: `${escapeHtml(profile.provenance.truthClass)}${provenanceChipForTag(profile.provenance)}` },
    profile.elevationSourceId,
    stationTerrainSourceCell(
      profile.terrainMaskSourceId,
      profile.terrainMaskIsDefault,
      profile.terrainMaskNote
    ),
    profile.antennaDiameterM ?? "unavailable",
    stationRfSourceCell(
      profile.antennaDiameterM,
      profile.antennaDiameterSourceId,
      "Selected-pair runtime payload has no station antenna diameter."
    ),
    profile.peakEirpDbm ?? "unavailable",
    stationRfSourceCell(
      profile.peakEirpDbm,
      profile.peakEirpSourceId,
      "Selected-pair runtime payload has no station EIRP."
    ),
    profile.txPolarization ?? "unavailable",
    stationRfSourceCell(
      profile.txPolarization,
      profile.txPolarizationSourceId,
      "Selected-pair runtime payload has no station Tx polarization."
    ),
    profile.provenance.nonClaim ?? "Station RF hardware profile is not available."
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

function tleSelectionPolicyRows(result: RuntimeProjectionResult): ReportRow[] {
  const inventory = result.dataCompleteness.runtimeInventoryDisclosure.perOrbit;
  const sourceByOrbit = new Map(
    result.dataCompleteness.tleSources.map((source) => [
      source.orbitClass,
      source
    ])
  );
  const sourceModes = [
    ...new Set(
      ORBIT_DISPLAY_ORDER.map((orbit) => inventory[orbit].inventorySourceMode)
    )
  ].join(" / ");
  const sourcePaths = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const source = sourceByOrbit.get(orbit);
    return `${orbit}: ${source?.sourcePath ?? "unavailable"}`;
  }).join(" | ");
  const parserSummary = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const source = sourceByOrbit.get(orbit);
    return `${orbit}：來源筆數 ${source?.recordCount ?? 0}，TLE 解析失敗 ${source?.parserFailureCount ?? 0}，後續 runtime 篩選排除 ${source?.rejectedRecordCount ?? 0}`;
  });
  const capSummary = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const row = inventory[orbit];
    const afterCapCount = Math.min(row.activeInventoryCount, row.runtimeCap);
    const excludedByCap = Math.max(0, row.activeInventoryCount - afterCapCount);
    return `${orbit}：解析後可用 ${row.activeInventoryCount} 筆，先依 selected-pair 的 TLE/SGP4 共同可見幾何分數排序，再最多取前 ${row.runtimeCap} 筆；實際進入後續流程 ${afterCapCount} 筆，因 cap 排除 ${excludedByCap} 筆`;
  });
  const pairGateSummary = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const row = inventory[orbit];
    const afterCapCount = Math.min(row.activeInventoryCount, row.runtimeCap);
    const excludedByPairGate = Math.max(0, afterCapCount - row.acceptedRecordCount);
    return `${orbit}：cap 後 ${afterCapCount} 筆，兩站 orbit support 篩選後留下 ${row.acceptedRecordCount} 筆，因 selected pair 不支援該 orbit class 排除 ${excludedByPairGate} 筆`;
  });
  const visibilitySummary = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const row = inventory[orbit];
    const notPairVisible = Math.max(0, row.acceptedRecordCount - row.visibleActorCount);
    return `${orbit}：accepted ${row.acceptedRecordCount} 筆，這個時間窗內兩站共同可見 ${row.visibleActorCount} 顆，沒有形成共同可見時間窗 ${notPairVisible} 筆`;
  });
  const communicationByOrbitSummary = ORBIT_DISPLAY_ORDER.map(
    (orbit) =>
      `${orbit} 通信時間：${formatDurationMs(result.communicationStats.byOrbit[orbit])}`
  );
  const capPolicySummary = ORBIT_DISPLAY_ORDER.map(
    (orbit) => `${orbit} 幾何排序後最多取前 ${inventory[orbit].runtimeCap} 筆`
  ).join(" / ");
  const healthSummary = result.dataCompleteness.tleSources
    .map(
      (source) =>
        `${source.orbitClass}：${source.health}，最新 epoch ${formatIsoShort(
          source.epochEndUtc
        )}`
    )
    .join(" | ");
  const thresholdSummary = result.dataCompleteness.tleSources
    .map((source) => `${source.orbitClass} ${source.healthThresholdDays}d`)
    .join(" / ");

  return [
    [
      "來源資料",
      `${sourceModes}; ${sourcePaths}`,
      "selected-pair 模式讀取專案內已打包的 CelesTrak GP/TLE 快照；瀏覽器端不即時下載 CelesTrak catalog。",
      "公開 TLE 只提供軌道元素來源，不代表衛星正在提供服務，也不是通訊品質量測。"
    ],
    [
      "TLE 解析",
      { html: list(parserSummary) },
      "系統先把 TLE 原始行組解析成 SGP4 可推算的軌道紀錄，之後才進入 selected-pair 可見性計算。",
      "解析成功的衛星只是軌道候選，不代表已經是可用通信鏈路。"
    ],
    [
      "幾何排序後的 runtime cap",
      { html: list(capSummary) },
      "系統先用較粗的 TLE/SGP4 取樣替完整候選排序；排序依據是兩站共同可見總時長、共同可見窗數量，以及兩站較低仰角的最大值。排序後再對 LEO/MEO/GEO 各自套用上限，讓瀏覽器端 selected-pair 計算保持可互動。",
      "cap 不是通訊品質排序（not a communication-quality sort）；前 N 筆代表本次 selected-pair 幾何分數較高的候選，不代表營運可用或 SLA 最佳。"
    ],
    [
      "selected-pair 軌道支援篩選",
      { html: list([`兩站共同支援 orbit classes：${result.sharedSupportedOrbits.join("/") || "none"}`, ...pairGateSummary]) },
      "cap 後只保留兩個地面站都支援的軌道類別。",
      "站點 orbit support 是情境限制，不是營運商實際路由證明。"
    ],
    [
      "兩站共同可見性",
      { html: list([`本次共有 ${result.visibilityWindows.length} 個兩站共同可見時間窗`, ...visibilitySummary]) },
      "篩選後留下的軌道紀錄會用 SGP4、站點座標、各站仰角門檻，以及兩站時間窗交集來計算共同可見。",
      "共同可見只表示本次時間範圍內的幾何候選，不是完整服務覆蓋證明。"
    ],
    [
      "handover 與通信模型",
      { html: list([`${result.handoverEvents.length} 個服務鏈路事件`, `${result.communicationStats.handoverCount} 次模型判定換手`, ...communicationByOrbitSummary]) },
      "共同可見時間窗產生後，handover policy 與 link-budget 模型才會選出不同時間點的服務候選。",
      "latency、jitter、speed、rain impact 是模型輸出，不是 TLE 欄位，也不是 iperf/ping 或實測 throughput。"
    ],
    [
      "為什麼排序後先取前 N 筆",
      capPolicySummary,
      "如果先對完整來源庫做正式可見性與 handover 計算，瀏覽器需要把所有來源衛星沿著整個時間網格做完整 SGP4 取樣與模型推算。這份 selected-pair report 改用互動式上限流程：先做粗略共同可見幾何排序，再套用 cap，最後才做正式 SGP4 可見性與 handover 計算。",
      "前 N 筆不被視為通訊品質最佳；若要完整來源庫的正式可見性與 handover 驗證，需要離線完整來源庫計算或提高 runtime cap。"
    ],
    [
      "資料新鮮度與更新",
      `${healthSummary}；健康門檻 ${thresholdSummary}`,
      "若已打包的 refresh artifact 過舊或不可用，runtime 會 fallback 到 local snapshot fixtures；更新 TLE artifacts 使用 npm run refresh:tle。",
      "refresh 只更新軌道快照，不會產生營運商驗證或 live service-quality evidence。"
    ]
  ];
}

function satellitePipelineRows(result: RuntimeProjectionResult): ReportRow[] {
  return ORBIT_DISPLAY_ORDER.map((orbitClass) => {
    const source = result.dataCompleteness.tleSources.find(
      (entry) => entry.orbitClass === orbitClass
    );
    const inventory =
      result.dataCompleteness.runtimeInventoryDisclosure.perOrbit[orbitClass];
    if (!source) {
      return [
        orbitClass,
        { html: truthChip("Source gap", "gap") },
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        inventory.runtimeCap,
        inventory.cappedAtRuntime ? "yes" : "no",
        inventory.visibleActorCount
      ];
    }
    return [
      orbitClass,
      {
        html: provenanceChipForTag({
          truthClass: source.format.includes("omm") ? "omm-derived" : "tle-derived",
          sourceId: source.sourceId
        })
      },
      source.sourceId,
      source.sourcePath,
      `${source.format} / ${source.apiClass}`,
      source.recordCount,
      source.acceptedRecordCount,
      source.rejectedRecordCount,
      source.parserFailureCount ?? "",
      source.excludedReasonCategories.join(" | "),
      inventory.runtimeCap,
      inventory.cappedAtRuntime ? "yes" : "no",
      inventory.visibleActorCount
    ];
  });
}

function tleFreshnessRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.tleFreshness.map((freshness) => [
    freshness.provenance.sourceId,
    { html: `${escapeHtml(freshness.provenance.truthClass)}${provenanceChipForTag(freshness.provenance)}` },
    freshness.sourceMode,
    freshness.snapshotPath,
    formatIsoShort(freshness.snapshotFetchedUtc),
    formatIsoShort(freshness.maxEpochUtc),
    freshness.sourcePolicy,
    JSON.stringify(freshness.constellationMembership)
  ]);
}

function displayTransformRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.displayTransforms.map((transform) => [
    transform.sourceId,
    { html: `${escapeHtml(transform.truthClass)}${provenanceChipForTag(transform)}` },
    JSON.stringify(transform.inputSummary),
    transform.nonClaim
  ]);
}

function atmosphericLookupRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.atmosphericLookups.map((lookup) => [
    lookup.source,
    { html: `${escapeHtml(lookup.provenance.truthClass)}${provenanceChipForTag(lookup.provenance)}` },
    lookup.midpointLatDeg ?? "",
    lookup.midpointLonDeg ?? "",
    lookup.cellLatDeg ?? "",
    lookup.cellLonDeg ?? "",
    lookup.lookupValue ?? "unavailable",
    lookup.lookupUnit ?? "",
    lookup.interpolation,
    lookup.provenance.sourceId ?? "",
    lookup.provenance.nonClaim ?? ""
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
    return `<p class="empty">No modeled output for this projection.</p>`;
  }

  return `<div class="model-cards-list">` + 
    result.dataCompleteness.modeledOutputs.map((output) => {
      const standards = output.standardsRef.map(s => `<li>${escapeHtml(s)}</li>`).join("");
      const formattedInputs = formatInputSummaryToHtml(output.inputSummary).html;
      const rainRateLabel = output.rainRateControlMode ? `
        <div class="meta-item">
          <span class="meta-label">Rain control</span>
          <span class="meta-val badge badge-info">${escapeHtml(output.rainRateControlMode)}</span>
        </div>` : "";

      const provenanceBadge = provenanceChipForTag(output.provenance, output.standardsRef);

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
                  <span class="meta-label">Source strength</span>
                  <span class="meta-val badge badge-ok">${escapeHtml(output.provenance.truthClass)}</span>
                  ${provenanceBadge}
                </div>
                ${rainRateLabel}
              </div>
              <div class="standards-section">
                <span class="section-label">Standards</span>
                <ul>${standards}</ul>
              </div>
              <div class="non-claim-section">
                <span class="section-label">Limit</span>
                <p>${escapeHtml(output.nonClaim)}</p>
              </div>
            </div>
            <div class="model-inputs-column">
              <span class="section-label">Model inputs</span>
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
    return `<p class="empty">No RF-chain breakdown terms for this projection.</p>`;
  }

  return `<div class="model-cards-list">` + 
    result.dataCompleteness.rfChainBreakdown.terms.map((term) => {
      const standards = term.standardsRef.map(s => `<li>${escapeHtml(s)}</li>`).join("");
      const formattedInputs = formatInputSummaryToHtml(term.inputSummary).html;
      const contributionSign = term.contributionSignedDb !== null && term.contributionSignedDb > 0 ? "+" : "";
      const contributionDisplay = term.contributionSignedDb !== null ? `${contributionSign}${escapeHtml(term.contributionSignedDb)} dB` : "—";

      const provenanceBadge = provenanceChipForTag(term.provenance, term.standardsRef);

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
                  <span class="meta-label">Source strength</span>
                  <span class="meta-val badge badge-ok">${escapeHtml(term.provenance.truthClass)}</span>
                  ${provenanceBadge}
                </div>
              </div>
              <div class="standards-section">
                <span class="section-label">Standards</span>
                <ul>${standards}</ul>
              </div>
              <div class="non-claim-section">
                <span class="section-label">Limit</span>
                <p>${escapeHtml(term.nonClaim)}</p>
              </div>
            </div>
            <div class="model-inputs-column">
              <span class="section-label">Model inputs</span>
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

function assumptionsAndLimitsRows(result: RuntimeProjectionResult): ReportRow[] {
  const truthBoundaryRows: ReportRow[] = result.truthBoundary.nonClaims.map((nonClaim, index) => [
    `Truth boundary ${index + 1}`,
    nonClaim,
    "Treat this as the upper bound for what the report can prove.",
    "Summary, Requirements, Sources, Models",
    "Measured operation, service-level guarantee, radio-layer switch trace, or real route."
  ]);
  return [
    ...truthBoundaryRows,
    [
      "Metric anchor",
      result.dataCompleteness.metricAnchorDisclosure.nonClaim,
      "Read communication metrics as model anchors tied to this payload.",
      "Summary, Requirements, Models",
      "Measured service KPI, packet trace, or customer acceptance evidence."
    ],
    [
      "Runtime inventory",
      result.dataCompleteness.runtimeInventoryDisclosure.note,
      "Separate accepted source records, runtime caps, and visible actors.",
      "Sources: Runtime inventory; Raw data: Actor provenance",
      "Complete satellite catalog, active service list, or operator assignment."
    ]
  ];
}

function standardsReferenceRows(result: RuntimeProjectionResult): ReportRow[] {
  const rows: ReportRow[] = [
    [
      "3GPP TR 38.821 \u00a77.3.2.2",
      `Handover policy gates (${result.dataCompleteness.policyDisclosure.activePolicyId})`,
      { html: truthChip("Standards-derived", "standard") },
      "Use as the policy reference for model-selected handover thresholds.",
      "Not an operator event log, RF handover trace, or live gateway record."
    ],
    [
      "ITU-R P.618-14 \u00a72.2.1.1",
      "Rain attenuation model",
      { html: truthChip("Standards-derived", "standard") },
      "Use as a formula reference for scenario rain-loss calculation.",
      "Not local measured weather or calibrated station rain history."
    ],
    [
      "ITU-R P.676-13",
      "Gas absorption model",
      { html: truthChip("Standards-derived", "standard") },
      "Use as a formula reference for atmospheric absorption calculation.",
      "Not measured link performance or service availability evidence."
    ],
    [
      "ITU-R S.1528-0 Annex 1",
      "Satellite antenna gain model with assumed Tier-B parameters",
      { html: truthChip("Standards-derived", "standard") },
      "Use as the satellite antenna-pattern reference for the selected-pair runtime model.",
      "Not operator beam assignment, measured antenna gain, or station RF hardware truth."
    ],
    [
      "ITU-R S.465-6",
      "Earth-station antenna gain model with assumed Tier-B parameters",
      { html: truthChip("Standards-derived", "standard") },
      "Use as the earth-station antenna-pattern reference for the selected-pair runtime model.",
      "Not real dish size, EIRP, polarization, or measured RF hardware truth."
    ]
  ];
  for (const output of result.dataCompleteness.modeledOutputs) {
    for (const ref of output.standardsRef) {
      rows.push([
        ref,
        `Modeled output: ${output.kind}`,
        { html: truthChip("Standards-derived", "standard") },
        "Use to trace which standards reference supports this model output.",
        "Does not turn the modeled output into measured service data."
      ]);
    }
  }
  return rows;
}

function sourceGapRows(result: RuntimeProjectionResult): ReportRow[] {
  const hasStationRfGap = result.dataCompleteness.stationRfProfiles.some(
    (profile) =>
      profile.antennaDiameterM === null ||
      profile.peakEirpDbm === null ||
      profile.txPolarization === null
  );
  const acceptedElevationStatuses = new Set([
    "dem-provenance-complete",
    "public-dem-derived-selected-pair",
    "operator-stated-altitude-with-public-dem-terrain"
  ]);
  const hasElevationGap = result.dataCompleteness.stationPrecision.some(
    (station) => !acceptedElevationStatuses.has(station.elevationProvenanceStatus)
  );
  const hasTerrainMaskDefault = result.dataCompleteness.stationPrecision.some(
    (station) => station.terrainMaskIsDefault
  );
  const hasAtmosphericLookupGap = result.dataCompleteness.atmosphericLookups.some(
    (lookup) => lookup.lookupValue === null
  );
  const gapChip = { html: truthChip("Source gap", "gap") };
  return [
    [
      "packet-test-trace",
      gapChip,
      "No iperf/ping packet-test trace.",
      "Communication time is calculated by the model, not measured by packet tests.",
      "Summary and Visibility expose model values; do not read them as packet-test output."
    ],
    [
      "operator-rf-hardware-truth",
      gapChip,
      "Selected-pair report uses assumed Tier-B antenna pattern parameters, but has no operator station RF hardware source.",
      "Antenna gain can be read only as standards-derived model output with assumed parameters.",
      "Do not read assumed antenna values as station dish size, EIRP, polarization, or measured RF hardware truth."
    ],
    [
      "local-rain-calibration",
      gapChip,
      "A retained public CWA station statistic supports a 5 mm/h demo preset, but no measured-for-link weather or long-term R0.01 calibration is attached.",
      "Rain impact is a standards-based model response to scenario input.",
      "Not measured-for-link weather."
    ],
    [
      "station-rf-profile",
      hasStationRfGap ? gapChip : { html: truthChip("Public source", "public") },
      "Current runtime payload has no station antenna diameter, EIRP, or Tx polarization.",
      "Model outputs do not become station-specific RF hardware facts.",
      "Missing station RF hardware sources remain visible."
    ],
    [
      "station-elevation-dem-metadata",
      hasElevationGap ? gapChip : { html: truthChip("Public source", "public") },
      "Elevation rows disclose dataset id, version, datum, tile/cell, license, and provenance status when available.",
      "Incomplete DEM metadata lowers station elevation evidence strength.",
      "Report does not fabricate upstream DEM details."
    ],
    [
      "terrain-mask-default",
      hasTerrainMaskDefault ? gapChip : { html: truthChip("Public source", "public") },
      hasTerrainMaskDefault
        ? "0 degree terrain mask means no site-specific horizon mask source is attached."
        : "Selected-pair stations use public Copernicus DEM-derived terrain masks.",
      hasTerrainMaskDefault
        ? "Visibility thresholds should be read as scenario settings with a default terrain boundary."
        : "Visibility thresholds include the retained DEM-derived selected-pair terrain screening mask.",
      "This is not a surveyed RF horizon."
    ],
    [
      "atmospheric-grid-lookup",
      hasAtmosphericLookupGap ? gapChip : { html: truthChip("Standards-derived", "standard") },
      "Atmospheric lookup rows disclose whether local grid values exist.",
      "When local grid values are unavailable, rain/atmospheric results remain in model space.",
      "Source gaps are explicit evidence boundaries."
    ]
  ];
}

function externalEvidenceRows(): ReportRow[] {
  return SELECTED_PAIR_EXTERNAL_EVIDENCE.map((entry) => [
    entry.evidenceId,
    joinEvidenceIds(entry.requirementIds),
    evidenceStatusChip(entry.status),
    joinEvidenceIds(entry.artifactRefs),
    entry.evidenceValue,
    entry.howToRead,
    entry.boundary
  ]);
}

function missingEvidenceRows(): ReportRow[] {
  return SELECTED_PAIR_MISSING_EVIDENCE.map((entry) => [
    entry.gapId,
    joinEvidenceIds(entry.requirementIds),
    { html: truthChip("Source gap", "gap") },
    entry.missingEvidence,
    entry.neededSource,
    entry.impact,
    entry.boundary
  ]);
}

function requirementCoverageRows(result: RuntimeProjectionResult): ReportRow[] {
  const windowMs = durationMs(result.timeWindow.startUtc, result.timeWindow.endUtc);
  const leoSource = result.dataCompleteness.tleSources.find(
    (source) => source.orbitClass === "LEO"
  );
  const leoInventory =
    result.dataCompleteness.runtimeInventoryDisclosure.perOrbit["LEO"];
  const sharedOrbits = result.sharedSupportedOrbits.join("/") || "none";
  const rainRateInput = result.dataCompleteness.modeledOutputs.find(
    (output) => output.inputSummary.rainRateMmPerHour !== undefined
  )?.inputSummary.rainRateMmPerHour;
  const rainRate =
    typeof rainRateInput === "number" || typeof rainRateInput === "string"
      ? rainRateInput
      : "n/a";
  const crossOrbitCount = result.handoverEvents.filter(
    (event) => event.reasonKind === "cross-orbit-migration"
  ).length;
  const chipCell = (label: string, tone: TruthChipTone, detail?: string): ReportCell => ({
    html: truthChip(label, tone, detail)
  });
  const row = (
    bucket: "A" | "B" | "C",
    id: string,
    requirement: string,
    value: ReportCell,
    interpretation: string,
    truthClass: ReportCell,
    evidenceLocation: string,
    gap: string
  ): ReportRow => [
    bucket,
    id,
    requirement,
    value,
    interpretation,
    truthClass,
    evidenceLocation,
    gap
  ];

  return [
    row("A", "R1-T1 / K-A1", "Integrate LEO/MEO/GEO orbit models and multi-orbit switching.", `Shared supported orbits: ${sharedOrbits}; modeled switches: ${result.communicationStats.handoverCount}.`, "This row shows orbit visibility and model-selected switching candidates for the selected station pair.", chipCell("Model-derived", "model"), "Summary; Handover; Sources; Models; Raw data.", "Not an RF handover log or operational route."),
    row("A", "R1-T2 / K-D1", "Integrate satellite orbit data.", `${result.dataCompleteness.tleSources.length} orbit manifest rows; ${result.dataCompleteness.actorProvenance.length} actor provenance rows.`, "Bundled public orbit snapshots are parsed, filtered, then reported here.", chipCell("Public source", "public"), "Sources: TLE source manifest; Satellite / TLE lineage; Raw data.", "Runtime cap and visible actor count are not total source inventory."),
    row("A", "R1-T3 / K-D2", "Present the scenario through an equivalent globe view.", "Retains selected-pair settings, sources, visibility, handovers, and raw payload.", "Interpretation is bound to report payload, not screenshot-only review.", chipCell("Display transform", "display"), "Summary: Projection setup; Sources: Display transforms.", "Camera framing and marker position do not create new source data."),
    row("A", "R1-T4 / K-D3", "Provide interactive UI.", "Report includes tabs, search, Evidence Detail, HTML download, and CSV export.", "Report records this selected projection; live controls remain application-surface evidence.", chipCell("Display transform", "display"), "Report toolbar; tabs; Summary; Raw data.", "Report is not a complete UI interaction trace."),
    row("A", "R1-T5 / K-D4", "Provide handover policy parameters.", `Active policy: ${result.dataCompleteness.policyDisclosure.activePolicyId}.`, "Policy thresholds decide model-selected links and are listed as model inputs.", chipCell("Model-derived", "model"), "Models: Handover policy gates; Handover: event rows.", "No latency/jitter packet trace."),
    row("A", "R1-T6 / K-D5", "Present communication-rate design.", `${result.dataCompleteness.modeledOutputs.length} modeled output disclosures; ${result.dataCompleteness.rfChainBreakdown.terms.length} RF-chain terms.`, "Rate-related rows are calculated model outputs, not measured service data.", chipCell("Standards-derived", "standard"), "Models: Modeled outputs; RF chain.", "Station RF hardware profile is unavailable, so model anchors are not station-specific RF hardware facts."),
    row("A", "R1-F1 / K-E1", "Support at least 500 LEO simulation actors.", `LEO records: ${leoSource?.recordCount ?? "n/a"}; accepted: ${leoSource?.acceptedRecordCount ?? "n/a"}; runtime cap: ${leoInventory.runtimeCap}; visible actors: ${leoInventory.visibleActorCount}.`, "Source inventory, accepted rows, runtime cap, and visible actors are separate count layers.", chipCell("Public source", "public"), "Sources: TLE source manifest; Runtime inventory; Satellite / TLE lineage; External evidence register: multi-orbit-scale-validation.", "Runtime cap limits interactive compute and does not rewrite source inventory truth."),
    row("A", "R1-F2 / K-E2", "Support adjustable simulation speed and real-time / prerecorded windows.", `Report window: ${formatDurationMs(windowMs)}, from ${formatIsoShort(result.timeWindow.startUtc)} to ${formatIsoShort(result.timeWindow.endUtc)}.`, "Report records the selected time window; playback presets are application UI evidence, not serialized row-level report values.", chipCell("External evidence", "external"), "Summary: Projection setup; Raw data: timeWindow; application HUD can serve as playback preset evidence.", "Playback speed is not currently a report row-level value."),
    row("A", "R1-F3 / K-E3", "Present communicable time while keeping the packet-test boundary visible.", formatDurationMs(result.communicationStats.totalCommunicatingMs), "This is model-calculated communication time from visibility windows and link-selection rules.", chipCell("Model-derived", "model"), "Summary: Available Time; Visibility; Raw data: communicationStats.", "No iperf/ping packet-test trace."),
    row("A", "R1-F4 / K-E4 / K-F4", "Switch by latency, jitter, and network-speed policy conditions.", `${result.communicationStats.handoverCount} model switches; cross-orbit migrations: ${crossOrbitCount}.`, "Handover rows show model-selected link changes produced by the active policy.", chipCell("Model-derived", "model"), "Handover; Models: policy gates; Raw data: handoverEvents.", "No operator event log or RF handover trace."),
    row("A", "R1-F5 / K-E5", "Export statistical reports.", "Downloadable standalone HTML report and row-level CSV export.", "HTML is the readable evidence summary; CSV is row-level data export.", chipCell("Public source", "public"), "Summary: Requirement evidence map; CSV export; Raw data; External evidence register: selected-pair-report-smoke.", "HTML report is not a final acceptance certificate."),
    row("A", "K-A4", "Input TLE data and track satellite motion.", `${result.dataCompleteness.tleSources.length} TLE/OMM manifest rows; ${result.dataCompleteness.actorProvenance.length} propagated actor rows.`, "The selected projection traces visible actors back to bundled orbit manifests.", chipCell("Public source", "public"), "Sources: TLE source manifest; Raw data: Actor provenance.", "Browser runtime has no live connection to an upstream catalog service."),
    row("A", "K-E6", "Model rain attenuation impact.", `${rainRate} mm/h scenario rain input.`, "Rain impact is calculated from scenario rain input and standards-based model metadata.", chipCell("Standards-derived", "standard"), "Summary; Models: Modeled outputs; Atmospheric / rain lineage.", "Not measured local weather."),
    row("A", "K-F7", "Provide multi-orbit visibility and handover interpretation.", `${result.visibilityWindows.length} mutual visibility windows.`, "Visibility and Handover must be read together; station orbit capability does not guarantee three-orbit handover in this time window.", chipCell("Model-derived", "model"), "Visibility; Handover; Sources.", "Does not promise every LEO/MEO/GEO orbit class appears in the selected window."),
    row("A", "R1-D1", "11/30 orbit model import milestone.", `${result.dataCompleteness.tleSources.length} orbit manifests, ${result.dataCompleteness.actorProvenance.length} propagated actor rows.`, "Selected-pair report discloses the imported orbit-source artifacts and propagated runtime actors used in this time window.", chipCell("Public source", "public"), "Sources: TLE source manifest; Runtime inventory; Satellite / TLE lineage; Raw data: Actor provenance.", "This row does not claim the full historical milestone package."),
    row("A", "R1-D2", "11/30 dynamic parameter UI milestone.", `Selected inputs: time window, rain rate ${rainRate} mm/h, policy ${result.dataCompleteness.policyDisclosure.activePolicyId}.`, "Report retains the parameters used to generate this projection; full UI control interaction evidence remains in the application surface.", chipCell("External evidence", "external"), "Summary: Projection setup; Models: policy gates and model outputs; application UI can serve as control interaction evidence.", "This report snapshot is not a complete interactive-control test log."),
    row("A", "R1-D3", "Disclose communication-time statistics.", formatDurationMs(result.communicationStats.totalCommunicatingMs), "Uses the same data as R1-F3 as repeated data-row evidence.", chipCell("Model-derived", "model"), "Summary; Visibility; Raw data.", "Not iperf, ping, or throughput measurement."),
    row("A", "R1-D4", "11/30 stable runtime screen for at least 24 hours.", "Retained 24-hour soak artifact: output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json.", "This is external run evidence; selected-pair report can reference it but does not recompute soak results.", chipCell("External evidence", "external"), "Sources: External evidence register: phase7-0-24h-soak.", "Selected-pair report is not the soak runner and does not prove a new 24-hour run."),
    row("A", "V-MO1", "Disclose cross-orbit handover behavior.", `${crossOrbitCount} cross-orbit migrations.`, "Cross-orbit migration is a model policy event based on visibility candidates.", chipCell("Model-derived", "model"), "Handover; Models: policy gates.", "Not RF handover."),
    row("B", "K-A2", "Use latency, jitter, and network-speed switching rules for link-quality policy.", `Policy: ${result.dataCompleteness.policyDisclosure.activePolicyId}; modeled output kinds: ${result.dataCompleteness.modeledOutputs.map((output) => output.kind).join(", ")}.`, "Report shows the public-standards substitute used by runtime policy and model disclosures.", chipCell("Standards-derived", "standard"), "Models: Modeled outputs; Handover policy gates; Handover events; Missing evidence register: packet-test-trace.", "No operator packet traces or private link-quality time series."),
    row("B", "K-A3-a", "Antenna parameters: peak gain, beamwidth, pattern.", "Runtime link budget applies ITU-R S.1528/S.465-6 antenna gain with disclosed assumed Tier-B per-orbit parameters.", "This supports modeled antenna-pattern behavior, not station-specific RF hardware truth.", { html: `${truthChip("Standards-derived", "standard")}${truthChip("Source gap", "gap", "operator RF hardware remains unavailable")}` }, "Models: Modeled outputs; RF chain; Metric anchors; Sources: Station RF profile gaps; Missing evidence register: operator-rf-hardware-truth.", "Assumed antenna values are not operator dish size, EIRP, polarization, or measured RF hardware."),
    row("B", "K-A3-b", "Rain attenuation model.", `${rainRate} mm/h scenario rain input; standards references include ITU-R P.618-14 and ITU-R P.676-13; retained CWA local statistic maps to a 5 mm/h demo preset.`, "Rain impact is driven by scenario input and model metadata as a public-standards substitute; the local CWA statistic is a bounded public sample, not link-measured weather.", { html: `${truthChip("Standards-derived", "standard")}${truthChip("External evidence", "external")}` }, "Summary: rain impact; Models: Modeled outputs; Sources: Atmospheric / rain lineage; External evidence register: selected-pair-dem-rain-repair-sources; Missing evidence register: local-rain-calibration.", "No measured-for-link weather, SANSA rain sample, scenario-window weather, or long-term R0.01 calibration."),
    row("B", "K-F2", "Integrate external simulation components: antenna, rain attenuation, and link rules.", "Antenna, rain/gas/link-budget, and handover policy are disclosed as standards-derived model components; antenna parameters are assumed Tier-B defaults.", "This is selected-pair model evidence for integrated antenna/rain/link rules, while operator station RF hardware remains a source gap.", { html: `${truthChip("Standards-derived", "standard")}${truthChip("Source gap", "gap", "operator RF hardware remains unavailable")}` }, "Models: Standards used; Modeled outputs; RF chain; Sources: Station RF profile gaps; Missing evidence register: operator-rf-hardware-truth.", "Standards and assumed defaults cannot prove real station RF hardware or measured link behavior."),
    row("B", "(irreducible-1)", "External packet trace for real latency/jitter time series.", "Packet trace is absent from the payload.", "This row separates packet-test requirements from modeled connectivity.", chipCell("Source gap", "gap"), "Sources: Source gaps; Missing evidence register: packet-test-trace.", "No iperf/ping packet-test trace."),
    row("B", "(irreducible-2)", "Acceptance scenario script and pass/fail thresholds.", "Report captures selected route and projection inputs; payload has no acceptance thresholds.", "Report can support evidence review, but is not an external acceptance script.", chipCell("Source gap", "gap"), "Summary: Projection setup; Sources: Source gaps; Missing evidence register: acceptance-threshold-script.", "No bundled pass/fail threshold script or external acceptance scenario package."),
    row("B", "(irreducible-3)", "Local rain calibration constants.", `${result.dataCompleteness.atmosphericLookups.length} atmospheric lookup rows; retained CWA local statistic supports only a 5 mm/h demo preset.`, "The public CWA sample narrows the local-rain source gap, but does not provide measured-for-link weather or long-term R0.01 constants.", { html: `${truthChip("External evidence", "external")}${truthChip("Source gap", "gap", "measured-for-link/R0.01 still missing")}` }, "Sources: Atmospheric / rain lineage; Source gaps; External evidence register: selected-pair-dem-rain-repair-sources; Missing evidence register: local-rain-calibration.", "No measured-for-link weather or long-term R0.01 calibration."),
    row("C", "K-F1", "Build physical network bridge through an external network simulator.", "External infrastructure evidence only; not in selected-pair runtime payload.", "This selected-pair report cannot validate a physical network bridge.", chipCell("External evidence", "external"), "Sources: External evidence register; Missing evidence register: external-network-bridge.", "Modeled visibility or handover rows cannot be read as physical network-bridge proof."),
    row("C", "K-A5", "Linux main environment and Windows/WSL backup.", "Environment evidence is outside the selected-pair report.", "Report can disclose runtime data, but cannot prove host-environment readiness.", chipCell("External evidence", "external"), "Sources: External evidence register: external-infra-validation-summary.", "Not a UI/runtime projection value."),
    row("C", "K-B1", "Windows tunneling scenario / real-traffic satellite bridge.", "Report has no tunnel, ping path, or traffic-bridge trace.", "This is an external topology item, not selected-pair report data.", chipCell("Source gap", "gap"), "Sources: External evidence register; Missing evidence register: external-network-bridge.", "No bundled tunnel interface, ping trace, or real-traffic bridge evidence."),
    row("C", "K-C1", "Network simulator NAT routing and veth bridge.", "Report has no NAT/veth bridge trace.", "This is external infrastructure evidence, not globe runtime evidence.", chipCell("External evidence", "external"), "Sources: External evidence register; Missing evidence register: external-network-bridge.", "Raw JSON payload cannot prove NAT routing."),
    row("C", "K-F5", "Virtual device-under-test testbench program.", "Selected-pair payload has no testbench artifact.", "Report cannot validate a virtual testbench deliverable.", chipCell("Source gap", "gap"), "Sources: External evidence register; Missing evidence register: dut-traffic-generator-run.", "Modeled projection data is not a testbench program."),
    row("C", "K-F6", "Physical device-under-test traffic-generator scenario.", "Selected-pair payload has no physical traffic-generator trace.", "Report cannot validate physical test-equipment evidence.", chipCell("Source gap", "gap"), "Sources: External evidence register; Missing evidence register: dut-traffic-generator-run.", "No throughput measurement or traffic-generator result is claimed."),
    row("C", "K-F8", "Final written report deliverable.", "This standalone HTML is an evidence page, not the final written report deliverable.", "It can support a written report as supporting evidence; it is not the report-layer submission itself.", chipCell("External evidence", "external"), "Sources: Missing evidence register: final-written-report-package; Header: Download HTML.", "Downloadable HTML is not the final written report."),
    row("C", "R1-D5", "Technical WP1 evaluation report deliverable.", "This standalone HTML is a selected-pair evidence appendix candidate, not a complete technical evaluation report.", "It can support the report deliverable, but cannot replace the formal report.", chipCell("External evidence", "external"), "Sources: Missing evidence register: final-written-report-package; Requirements tab.", "Selected-pair report does not produce a complete WP1 analysis report.")
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
    result.truthBoundary.nonClaims[0] ?? "See the Sources tab for source limits."
  }`;
  const hasStationSourceGap =
    result.dataCompleteness.stationPrecision.some(
      (station) =>
        station.elevationProvenanceStatus !== "dem-provenance-complete" ||
        station.terrainMaskIsDefault
    ) ||
    result.dataCompleteness.stationRfProfiles.some(
      (profile) =>
        profile.antennaDiameterM === null ||
        profile.peakEirpDbm === null ||
        profile.txPolarization === null
    );

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

  const pairSourceBadge = provenanceChipForTier(pairSource.sourceTier, pairSource.evidenceKind);
  const summaryLineage = lineagePanel(
      "Summary evidence map",
      [
        {
        label: "Runtime projection",
        chipHtml: truthChip("Model-derived", "model"),
        detail:
          "Available Time, Visibility Windows, and Handovers all come from the selected-pair runtime projection.",
        sourceRefs: ["communicationStats", "visibilityWindows", "handoverEvents"],
        howToRead:
          "這是系統依可見時間窗與連線選擇規則推算出的可通訊時間與事件摘要。",
        sourceBoundary:
          "資料來自本次 report 生成時使用的投影結果；可在 Raw data 對照原始欄位。",
        nonClaim:
          "不是 iperf/ping 測試、實測吞吐量，也不是實際連線紀錄。"
      },
      {
        label: "Station lineage",
        chipHtml: hasStationSourceGap
          ? truthChip("Source gap", "gap")
          : truthChip("Public source", "public"),
        detail:
          "Station metadata covers coordinate authority, elevation cache metadata, terrain-mask defaults, and RF profile gaps.",
        sourceRefs: result.dataCompleteness.stationPrecision.map(
          (station) => station.provenance.sourceId
        ),
        howToRead:
          "這裡用來確認站點座標、高程、地形遮罩與射頻資料是否有明確來源。",
        sourceBoundary:
          "Sources 分頁會分開列出座標來源、高程來源、地形遮罩來源與射頻硬體缺口。",
        nonClaim:
          "站點資料不等於完整硬體規格；天線直徑、EIRP、極化若沒有來源，不能視為已知。",
        sourceIssue: hasStationSourceGap
          ? "Station elevation, terrain mask, or RF profile still has source gaps."
          : undefined
      },
      {
        label: "Satellite manifests",
        chipHtml: truthChip("Public source", "public"),
        detail:
          "TLE/OMM manifests disclose records, accepted rows, rejected rows, parser failures, caps, and freshness.",
        sourceRefs: result.dataCompleteness.tleSources.map((source) => source.sourceId),
        howToRead:
          "來源清單、通過篩選的軌道資料，以及實際顯示的衛星數量需要分開判讀。",
        sourceBoundary:
          "Sources 分頁會保留每個軌道來源的解析結果、篩選限制與更新時間。",
        nonClaim:
          "公開軌道來源不代表實際服務中的衛星，也不代表真實網路路由。"
      },
      {
        label: "Known gaps",
        chipHtml: truthChip("Source gap", "gap"),
        detail:
          "Packet traces, measured-for-link rain, station RF hardware profile, and some local grid lookups are not sources in this payload.",
        sourceRefs: sourceGapRows(result).map((row) => String(row[0])),
        howToRead:
          "這些是目前缺少的證據，不能只靠模型計算補成真實資料。",
        sourceBoundary:
          "Source gaps table 逐列列出缺少什麼資料以及會影響哪些判讀。",
        nonClaim:
          "它不會補上缺少的 packet traces、link-local weather/R0.01 校準或射頻硬體來源。",
        sourceIssue: "Important source gaps exist and remain listed in the Sources tab."
      }
    ],
    "開啟 Evidence Detail 後會補充解讀、資料來源與限制；原始數值仍保持可見。"
  );

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
    evidenceCardDetailed(
      "R1-F3 / R1-D3",
      formatDurationMs(result.communicationStats.totalCommunicatingMs),
      "Communication-time statistics are calculated from visibility and serving-link rows.",
      "ok",
      [
        ["解讀", "這是模型判定兩站在選定時間窗內可通訊的總時間。"],
        ["資料來源", "由 communicationStats.totalCommunicatingMs 與可見時間窗計算。"],
        ["限制", "不是 iperf/ping 測試、實測吞吐量，也不是實際服務紀錄。"]
      ]
    ),
    evidenceCardDetailed(
      "R1-F4 / K-E4 / V-MO1",
      handoverRequirementValue,
      "Handover rows show modeled policy changes and cross-orbit migrations.",
      crossOrbitCount > 0 ? "ok" : "info",
      [
        ["解讀", "換手事件是模型依目前規則選出的連線切換結果。"],
        ["資料來源", "來自 handoverEvents、policyDisclosure 與 modeledOutputs。"],
        ["限制", "不是射頻層實際換手，也不是營運網路事件紀錄。"]
      ]
    ),
    evidenceCardDetailed(
      "K-E6",
      "Rain impact modeled",
      "Rain attenuation control changes link-budget metrics; model assumptions are listed in the Models tab.",
      "info",
      [
        ["解讀", "Rain Rate 是情境輸入，用來檢查模型對降雨衰減的反應。"],
        ["資料來源", "來自 Modeled outputs 與 Atmospheric / rain lineage。"],
        ["限制", "不是本地實測天氣，也不是商用品質保證。"]
      ]
    ),
    evidenceCardDetailed(
      "R1-F5",
      "HTML + CSV",
      "This readable report is the review surface; CSV export is the row-level data artifact.",
      "ok",
      [
        ["解讀", "Report 是可讀摘要；CSV 是逐列資料匯出。"],
        ["資料來源", "兩者使用同一份本次投影結果。"],
        ["限制", "CSV 不會提供 Report 中沒有的解讀或來源強度。"]
      ]
    )
  ].join("");

  const formulasHtml = `
    <div class="context-only context-formulas-block">
      <h3 data-no-outline="true">Citations and Physical Formulas</h3>
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">3GPP TR 38.811 §6.6.2</span>
          <h4>Free-Space Path Loss (FSPL)</h4>
        </div>
        <div class="formula-math">
          L<sub>fs</sub> = 92.45 + 20 log<sub>10</sub>(d<sub>km</sub>) + 20 log<sub>10</sub>(f<sub>GHz</sub>)
        </div>
        <p>Computes clear-sky geometric spreading loss between station and satellite. Loss increases logarithmically with distance d and carrier frequency f.</p>
      </div>
      
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">ITU-R P.618-14 §2.2.1.1</span>
          <h4>Rain Attenuation Estimate</h4>
        </div>
        <div class="formula-math">
          A<sub>p</sub> = A<sub>0.01</sub> (p / 0.01)<sup>-(&gamma; + &eta; ln(p))</sup> dB
        </div>
        <p>Estimates additional signal attenuation from rain rate (R<sub>0.01</sub>) and polarization. The dynamic rain control simulates how different rain-rate inputs reduce link availability.</p>
      </div>

      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">3GPP TR 38.821 §7.3.2.2</span>
          <h4>Ground-to-Satellite Handover Policy</h4>
        </div>
        <div class="formula-math">
          Serving Link = argmax<sub>s &isin; Vis</sub> { SNR(s) }, with &Delta;t &ge; T<sub>min</sub> and SNR hysteresis &ge; H<sub>dB</sub>
        </div>
        <p>Defines how the station selects a serving link among visible satellites. The V-MO1 policy limits excessive switching to avoid modeled refocus churn and signal oscillation.</p>
      </div>
      
      <div class="formula-card">
        <div class="formula-header">
          <span class="badge badge-standard">ITU-R S.1528</span>
          <h4>Asymmetric Satellite Antenna Gain Pattern</h4>
        </div>
        <div class="formula-math">
          G(&theta;) = G<sub>max</sub> - 2.5 &times; 10<sup>-3</sup> (D/&lambda; &middot; &theta;)<sup>2</sup> dB
        </div>
        <p>Directional gain model for LEO or non-geostationary satellite antennas, used to compute gain reduction at off-axis angle &theta;.</p>
      </div>
    </div>
  `;

  return [
    summaryLineage,
    `<div class="summary-dashboard">
      <div class="dashboard-card">
        <div class="card-content">
          <span class="card-title">Available Time</span>
          <strong class="card-value">${formatDurationMs(result.communicationStats.totalCommunicatingMs)}</strong>
          <p class="card-desc">Total communication time in the selected window.</p>
        </div>
        <div class="card-visual">
          ${availabilityGaugeHtml}
        </div>
        ${evidenceDetailPanel([
          ["解讀", "儀表顯示選定時間窗內，模型判定可通訊時間的比例。"],
          ["資料來源", "由 visibility windows 與連線選擇規則計算。"],
          ["限制", "不是 iperf/ping 測試、實測吞吐量，也不是實際連線紀錄。"]
        ], "evidence-detail-panel--stacked dashboard-detail-row")}
      </div>
      
      <div class="dashboard-card">
        <div class="card-content">
          <span class="card-title">Handovers</span>
          <strong class="card-value">${result.communicationStats.handoverCount}</strong>
          <p class="card-desc">${crossOrbitCount} cross-orbit migrations.</p>
        </div>
        <div class="card-visual flex-column">
          <div class="visual-label">Orbit Distribution</div>
          ${orbitDistributionHtml}
        </div>
        ${evidenceDetailPanel([
          ["解讀", "把軌道分布與換手數一起看，可判斷模型是否在 LEO/MEO/GEO 之間切換。"],
          ["資料來源", "來自 handoverEvents 與 communicationStats.byOrbit。"],
          ["限制", "不是射頻層實際換手，也不是營運網路事件時間。"]
        ], "evidence-detail-panel--stacked dashboard-detail-row")}
      </div>
    </div>`,
    `<div class="summary-grid">
      <div class="metric-card">
        <span>Visibility Windows</span>
        <strong>${result.visibilityWindows.length}</strong>
        <p>Mutual station-to-satellite windows.</p>
        ${evidenceDetailPanel([
          ["解讀", "每列 visibility window 是兩站對同一衛星可見時間窗的交集。"],
          ["資料來源", "visibilityWindows 與 visibilityProvenance。"],
          ["限制", "不是實測連線紀錄，也不保證通訊一定成功。"]
        ])}
      </div>
      <div class="metric-card">
        <span>Source limits</span>
        <strong>${escapeHtml(pairSource.badgeLabel)}${pairSourceBadge}${sourceIssueMarker(
          "Source limits",
          "Pair source tier only describes evidence strength."
        )}</strong>
        <p>${pairSource.evidenceKind.replace(/-/g, " ")}</p>
        ${evidenceDetailPanel([
          ["解讀", "這個等級只說明資料來源可信度，不代表需求已通過驗收。"],
          ["資料來源", "pairSourceAttribution 與 Sources 分頁。"],
          ["限制", "不是服務水準保證、實際路由，也不是配對專屬傳輸路徑。"]
        ])}
      </div>
    </div>`,
    fieldGuide("Summary 欄位解讀", [
      ["Available Time", "選定時間窗內由模型推得的可通訊時間。", "看比例與總時長，不要當成封包測試或吞吐量。", "模型值不是實測服務資料。"],
      ["Handovers", "換手政策選出的連線切換結果。", "與 Handover tab 的逐列事件一起看。", "不是射頻層實際換手。"],
      ["Source limits", "這組站點配對的資料來源可信度。", "用來判斷 report 能支持到哪一種說法。", "缺少來源的項目不能用模型自動補成真實資料。"]
    ]),
    `<div class="report-section">
      <h3>Projection setup</h3>
      ${stackedFieldGuide("Projection setup 欄位解讀", [
        ["Station A / B", "所選站點與 registry id。", "對照 Sources 的 station lineage。", "站點資料不代表完整硬體規格。"],
        ["Time window", "投影使用的 UTC 時間範圍。", "只代表本次情境輸入。", "不是實際營運觀測時間。"],
        ["Route mode", "本次投影使用的資料模式。", "確認 report 是用已匯入的 runtime source 生成。", "不是實際營運路由。"]
      ])}
      ${projectionSetup}
    </div>`,
    `<div class="report-section">
      <h3>Requirement evidence map</h3>
      <div class="evidence-grid">${requirementCards}</div>
    </div>`,
    `<div class="report-section">
      <h3>Communication by orbit</h3>
      ${stackedFieldGuide("Communication by orbit 欄位解讀", [
        ["Orbit", "LEO/MEO/GEO 軌道類別。", "只比較這個選定時間窗內的模型時間。", "共同支援三種軌道，不代表該時間窗一定會看到三軌換手。"],
        ["Duration", "該軌道類別累計的模型可通訊時間。", "與 Visibility/Handover tabs 交叉檢查。", "不是實測連線紀錄。"],
        ["Duration ms", "同一數值的毫秒版本。", "用於 CSV/Raw data 對照。", "不是服務水準指標。"]
      ])}
      ${table(["Orbit", "Duration", "Duration ms"], orbitDurationRows(result))}
    </div>`,
    callout(
      "Source limits",
      sourceBoundarySummary,
      pairSource.sourceTier === "geometric-derived" ? "warn" : "info"
    ),
    formulasHtml
  ].join("");
}

function buildVisibilityTab(result: RuntimeProjectionResult): string {
  const rows = visibilityRows(result);
  const stationIds = result.dataCompleteness.stationPrecision
    .map((station) => station.stationId)
    .join(" / ");
  return [
    lineagePanel(
      "Visibility lineage",
      [
        {
          label: "Station-side inputs",
          chipHtml: truthChip("Public source", "public"),
          detail: `Station-side inputs: ${stationIds}. Elevation thresholds and terrain-mask defaults are disclosed in Sources.`,
          sourceRefs: result.dataCompleteness.stationPrecision.map(
            (station) => station.provenance.sourceId
          ),
          howToRead:
            "每列代表兩個站點在同一顆衛星上同時可見的時間窗。",
          sourceBoundary:
            "站點座標、高程來源、地形遮蔽設定與顯示位置會分開列在 Sources。",
          nonClaim: "不能證明實際連線成功，也不是站點地平線實測。"
        },
        {
          label: "Display transform",
          chipHtml: truthChip("Display transform", "display"),
          detail:
            "Display transforms only affect camera, labels, mesh, or display lanes; computed visibility remains separate data.",
          sourceRefs: result.dataCompleteness.displayTransforms.map(
            (transform) => transform.sourceId
          ),
          howToRead:
            "用這列把來源幾何資料與純顯示用途的畫面調整分開。",
          sourceBoundary:
            "Display transforms 會列在 Sources 分頁，且不會改寫原始來源列。",
          nonClaim: "不是實測連線紀錄，也不是實際路由。"
        }
      ],
      "Visibility 表格只列模型計算出的兩站共同可見時間；來源缺口仍在 Sources，不會被表格隱藏。"
    ),
    `<h3>Visibility windows</h3>`,
    stackedFieldGuide("Visibility windows 欄位解讀", [
      ["Satellite", "這列使用的衛星識別碼。", "可到 Raw data 的可見性來源列比對。", "來源是公開軌道資料，不代表正在提供服務的衛星。"],
      ["Orbit", "LEO/MEO/GEO 軌道類別。", "與 Communication by orbit 比較。", "不是商用路由層級。"],
      ["Duration", "兩站共同可見時間。", "可視為模型候選時間窗。", "不是實測連線紀錄。"]
    ]),
    rows.length === 0
      ? `<p class="empty">No mutual visibility windows for this projection.</p>`
      : table(["Satellite", "Orbit", "Start UTC", "End UTC", "Duration"], rows)
  ].join("");
}

function buildRequirementsTab(result: RuntimeProjectionResult): string {
  return [
    lineagePanel(
      "Requirement evidence map",
      [
        {
          label: "Data",
          chipHtml: truthChip("Model-derived", "model"),
          detail:
            "Requirement rows separate answer/value, interpretation, and source strength.",
          sourceRefs: ["consolidated requirements", "runtime projection"],
          howToRead:
            "先看需求編號，再看目前可呈現的數據，最後確認來源與缺少的證據。",
          sourceBoundary:
            "數值來自本次 report 使用的匯出資料，不包含未接入的外部系統資料。",
          nonClaim: "這張對照表不是採購驗收決策。"
        },
        {
          label: "Interpretation",
          chipHtml: truthChip("Standards-derived", "standard"),
          detail:
            "Interpretation column explains how reviewers should read selected-pair evidence.",
          sourceRefs: ["Models", "Sources", "Raw data"],
          howToRead:
            "用這欄避免把模型計算值解讀成實測服務資料。",
          sourceBoundary:
            "解讀只綁定 report 內可見的資料與來源列。",
          nonClaim: "模型值不是實測服務資料。"
        },
        {
          label: "Source strength",
          chipHtml: truthChip("Source gap", "gap"),
          detail:
            "Source strength discloses whether a row is public source, model-derived, standards-derived, display transform, external evidence, or source gap.",
          sourceRefs: ["Sources: Source gaps"],
          howToRead:
            "標記為 Source gap 的列，代表目前缺少直接證據，不能用推論自動補齊。",
          sourceBoundary:
            "缺少來源的項目會保留在 Sources 分頁。",
          nonClaim: "標記處沒有 iperf/ping packet-test trace。"
        }
      ],
      "Requirement coverage table maps consolidated requirements to selected-pair report data, interpretation, and source boundaries."
    ),
    `<h3>Requirement coverage table</h3>`,
    stackedFieldGuide("Requirements 欄位解讀", [
      ["Answer / value", "目前 report 可以呈現的值。", "先確認數值是否存在，再看它是公開來源、模型計算，還是缺少來源。", "模型值不是實測服務資料。"],
      ["How to read", "使用者應如何閱讀該值。", "避免把模型輸出讀成驗收或營運事實。", "不是實測連線紀錄。"],
      ["Source strength", "該列來源強度。", "用 chip 分辨公開來源、模型計算、標準公式、畫面轉換、外部證據或缺少來源。", "缺少來源的項目不能用模型自動補成真實資料。"]
    ]),
    table(
      [
        "Bucket",
        "Requirement ID",
        "Requirement",
        "Answer / value",
        "How to read",
        "Source strength",
        "Evidence location",
        "Limit / source gap"
      ],
      requirementCoverageRows(result)
    )
  ].join("");
}

function buildHandoverTab(result: RuntimeProjectionResult): string {
  const rows = handoverRows(result);
  const stationIds = result.dataCompleteness.stationPrecision
    .map((station) => station.stationId)
    .join(" / ");
  return [
    lineagePanel(
      "Handover lineage",
      [
        {
          label: "Station-side inputs",
          chipHtml: truthChip("Public source", "public"),
          detail: `Station-side inputs: ${stationIds}. Policy uses selected-pair visibility candidates.`,
          sourceRefs: result.dataCompleteness.stationPrecision.map(
            (station) => station.provenance.sourceId
          ),
          howToRead:
            "把 From/To 當成模型在同一時間窗內改選服務衛星的前後變化。",
          sourceBoundary:
            "切換門檻與模型輸入列在 Models 分頁；站點來源列在 Sources 分頁。",
          nonClaim: "不能代表無線層原生換手，也不是實際網路事件紀錄。"
        },
        {
          label: "Missing packet trace",
          chipHtml: truthChip("Source gap", "gap"),
          detail:
            "Missing packet trace means there is no iperf/ping packet-test timing, throughput, jitter, or loss trace.",
          sourceRefs: ["packet-test-trace"],
          howToRead:
            "這些列只能說明模型何時依政策改選服務衛星。",
          sourceBoundary:
            "封包測試資料目前缺少，會在 Sources 的缺口清單中保留。",
          nonClaim: "沒有實測延遲、抖動或吞吐量資料。"
        }
      ],
      "Handover events are model policy outputs over visibility candidates."
    ),
    `<h3>Handover events</h3>`,
    stackedFieldGuide("Handover events 欄位解讀", [
      ["Time UTC", "模型換手事件時間。", "與 selected time window 一起讀。", "不是營運商事件時間。"],
      ["From / To", "模型選擇前後的衛星 id。", "用於檢查切換順序。", "不是實際閘道指派紀錄。"],
      ["Reason", "模型記錄的切換原因。", "cross-orbit-migration 表示模型跨軌道類別改選衛星。", "不能代表無線層原生換手。"]
    ]),
    rows.length === 0
      ? `<p class="empty">No handover events for this projection.</p>`
      : table(["Time UTC", "From", "To", "Reason"], rows)
  ].join("");
}

function buildSourcesTab(result: RuntimeProjectionResult): string {
  const pairSource = result.dataCompleteness.pairSourceAttribution;
  const hasStationRfGap = result.dataCompleteness.stationRfProfiles.some(
    (profile) =>
      profile.antennaDiameterM === null ||
      profile.peakEirpDbm === null ||
      profile.txPolarization === null
  );
  return [
    lineagePanel(
      "Source ledger",
      [
        {
          label: "Pair boundary",
          chipHtml: provenanceChipForTier(pairSource.sourceTier, pairSource.evidenceKind),
          detail: pairSource.badgeLabel,
          sourceRefs: [pairSource.sourceTier, pairSource.evidenceKind],
          howToRead:
            "這裡只說明這組站點配對的資料可信度。",
          sourceBoundary:
            "來源是站點配對的來源標記與限制說明，不是實際路由紀錄。",
          nonClaim:
            "沒有宣稱配對專屬傳輸路徑、主動閘道指派或實際路由。"
        },
        {
          label: "Station metadata",
          chipHtml: hasStationRfGap
            ? truthChip("Source gap", "gap")
            : truthChip("Public source", "public"),
          detail:
            "Station metadata lists coordinate authority, elevation cache metadata, terrain-mask defaults, and RF profile gaps.",
          sourceRefs: result.dataCompleteness.stationPrecision.map(
            (station) => station.provenance.sourceId
          ),
          howToRead:
            "用這裡判斷站點座標、高程、畫面位置與 RF 參數分別來自哪裡。",
          sourceBoundary:
            "站點來源、配對來源與座標來源是不同欄位，不能混在一起判讀。",
          nonClaim:
            "當 RF 參數不可用時，站點資料不會提供站點專屬 RF 硬體事實。",
          sourceIssue: hasStationRfGap
            ? "Station RF profile has unavailable antenna/EIRP/polarization fields."
            : undefined
        },
        {
          label: "Satellite source manifest",
          chipHtml: truthChip("Public source", "public"),
          detail:
            "TLE/OMM manifests disclose records, accepted rows, rejected rows, parser failures, caps, and freshness.",
          sourceRefs: result.dataCompleteness.tleSources.map((source) => source.sourceId),
          howToRead:
            "解讀衛星數量前，先分清楚原始資料筆數、篩選後筆數與畫面實際顯示數量。",
          sourceBoundary:
            "Accepted rows 與 visible actors 是公開軌道資料經 runtime 篩選後的不同層次。",
          nonClaim:
            "公開軌道資料不會識別實際服務中的衛星或實際路由。"
        },
        {
          label: "Atmospheric inputs",
          chipHtml: result.dataCompleteness.atmosphericLookups.some(
            (lookup) => lookup.lookupValue === null
          )
            ? truthChip("Source gap", "gap")
            : truthChip("Standards-derived", "standard"),
          detail:
            "Rain-rate control is scenario input; atmospheric lookup rows disclose whether local grid values exist.",
          sourceRefs: result.dataCompleteness.atmosphericLookups.map(
            (lookup) => lookup.provenance.sourceId ?? lookup.source
          ),
          howToRead:
            "這是根據情境輸入計算出的模型結果，不是當地實測天氣。",
          sourceBoundary:
            "Atmospheric / rain lineage 會列出查表值，以及目前不可用的本地網格或校準資料。",
          nonClaim:
            "不是本地實測天氣，也不是站點校準雨量紀錄。",
          sourceIssue: "This payload has no local atmospheric grid lookup values."
        },
        {
          label: "Gaps",
          chipHtml: truthChip("Source gap", "gap"),
          detail:
            "Missing or unwired sources are listed explicitly and are not implied by model output.",
          sourceRefs: sourceGapRows(result).map((row) => String(row[0])),
          howToRead:
            "要做更強的結論前，必須先確認這裡列出的缺口是否已補齊。",
          sourceBoundary:
            "Source gaps table 會列出缺少的證據、影響範圍與限制。",
          nonClaim:
            "缺少來源的項目，不會因為有模型數值就變成真實資料。"
        }
      ],
      "This tab reviews where values come from and separates public artifacts, model calculations, display-only transforms, and missing sources."
    ),
    `<h3>Source limits</h3>`,
    stackedFieldGuide("Source limits 欄位解讀", [
      ["Source tier", "這組站點配對的來源等級。", "用來判斷 report 可支持到哪種說法。", "不是實際路由、服務水準保證或配對專屬傳輸路徑。"],
      ["Evidence kind", "來源分類的細項。", "和 badge label 一起看，不要單獨當成驗收結果。", "來源分類不會補齊缺少的外部證據。"],
      ["Truth boundary", "本次 report 對資料真實性的界線。", "判斷哪些是公開來源、模型計算或缺口。", "不能把模型輸出提升成實測資料。"]
    ]),
    kvTable([
      ["Source tier", pairSource.sourceTier],
      ["Evidence kind", pairSource.evidenceKind],
      ["Badge label", pairSource.badgeLabel],
      ["Truth boundary", result.truthBoundary.sourceTier]
    ]),
    `<h3>Pair source limits</h3>`,
    list(pairSource.nonClaims),
    `<h3>Station coordinate and elevation sources</h3>`,
    stackedFieldGuide("Station coordinate and elevation sources 欄位解讀", [
      ["Station", "本列對應的地面站。", "先確認站點 id，再和 station lineage 對照。", "站點存在不代表完整硬體規格已知。"],
      ["Coordinate / elevation fields", "座標精度、來源等級、高程與地形遮罩。", "用來判斷幾何計算的站點輸入從哪裡來。", "高程與地形遮罩若是預設或快取，仍要看來源限制。"],
      ["Effective threshold", "模型用於可見性判定的仰角門檻。", "和 Visibility / Raw data 的可見性來源一起核對。", "不是站點實測地平線或 RF 可用性保證。"]
    ]),
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
    `<h3>Station lineage</h3>`,
    stackedFieldGuide("Station lineage 欄位解讀", [
      ["Station / source strength", "站點資料與來源強度。", "先看來源強度，再看座標、高程與顯示位置。", "站點來源、配對來源與座標來源是不同欄位。"],
      ["Coordinate / render position", "原始座標、座標用途與畫面位置。", "判斷哪些是來源座標，哪些只是畫面呈現用轉換。", "Display transform 不能當成新的真實座標來源。"],
      ["Elevation / terrain fields", "高程資料集、DEM 細節、地形遮罩與有效門檻。", "用來查幾何可見性計算的地面端輸入。", "預設地形遮罩或缺少 DEM provenance 時要保留限制。"]
    ]),
    table(
      [
        "Station",
        "Source strength",
        "Coordinate authority",
        "Coordinate URL",
        "Coordinate note",
        "Raw lat/lon",
        "Coordinate use",
        "Render position",
        "Elevation source",
        "Elevation provenance",
        "Elevation dataset",
        "DEM details",
        "Terrain mask",
        "Terrain source",
        "Effective threshold"
      ],
      stationLineageRows(result)
    ),
    `<h3>Station RF profile gaps</h3>`,
    stackedFieldGuide("Station RF profile gaps 欄位解讀", [
      ["Antenna / EIRP / polarization", "站點 RF 硬體參數與來源 id。", "不可用值必須保持可見，不能用模型值補掉。", "缺少來源時不能宣稱站點專屬 RF 硬體事實。"],
      ["Elevation / terrain source", "RF 計算可使用的地面幾何輸入來源。", "和 Station lineage 對照來源是否一致。", "幾何來源不等於完整 RF 硬體來源。"],
      ["Boundary", "本列不能支持的結論。", "看到 source gap 時，結論只能停在模型假設層級。", "不是實測服務資料。"]
    ]),
    table(
      [
        "Station",
        "Source strength",
        "Elevation source",
        "Terrain source",
        "Antenna diameter",
        "Antenna source",
        "Peak EIRP",
        "EIRP source",
        "Tx polarization",
        "Polarization source",
        "Boundary"
      ],
      stationRfProfileRows(result)
    ),
    `<h3>TLE selection policy</h3>`,
    stackedFieldGuide("TLE selection policy 欄位解讀", [
      ["Step", "TLE 來源進入 selected-pair runtime 的處理階段。", "依序看來源資料、TLE 解析、TLE/SGP4 共同可見幾何排序、runtime cap、兩站 orbit support、共同可見性、handover 與資料新鮮度。", "這不是驗收流程，也不是服務品質排名。"],
      ["Current value", "本次 report 實際使用的 source mode、path，以及 LEO/MEO/GEO 在各階段的數量變化。", "用「解析後可用筆數、cap 後筆數、兩站軌道支援篩選後筆數、兩站共同可見衛星數」確認篩選結果。", "公開 TLE 只提供軌道元素，不提供通訊品質欄位。"],
      ["Reason / condition", "每一步為什麼會篩選或限制候選衛星。", "特別看「為什麼排序後先取前 N 筆」：cap 是瀏覽器互動計算上限，排序是 TLE/SGP4 幾何分數，不是通訊品質排序。", "模型判定不能提升成實測 throughput 或營運路由。"]
    ]),
    table(
      [
        "Step",
        "Current value",
        "Reason / condition",
        "Boundary"
      ],
      tleSelectionPolicyRows(result)
    ),
    `<h3>TLE source manifest</h3>`,
    stackedFieldGuide("TLE source manifest 欄位解讀", [
      ["Source / orbit", "每個軌道來源與軌道類別。", "用它追溯衛星列來自哪個 bundled public orbit snapshot。", "公開軌道資料不代表衛星正在提供服務。"],
      ["Records / accepted / rejected", "原始筆數、採用筆數與拒絕筆數。", "先看篩選結果，再看 runtime 顯示數量。", "採用筆數不等於完整來源庫，也不等於營運衛星數。"],
      ["Cap / health / timestamp", "runtime 上限、來源健康狀態與時間戳。", "用來判斷本次匯出使用的快照狀態。", "時間戳不是服務觀測時間。"]
    ]),
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
    stackedFieldGuide("Runtime inventory 欄位解讀", [
      ["Orbit", "LEO/MEO/GEO 軌道類別。", "用來比較各軌道資料進入 runtime 的狀態。", "不是營運網路分層。"],
      ["Accepted / runtime cap", "來源篩選後筆數與 runtime 顯示上限。", "判斷畫面與計算是否只用了子集合。", "上限是 runtime 選取限制，不是來源資料總量。"],
      ["Visible actors", "本次畫面或投影實際使用的 actor 數。", "和 TLE manifest 的採用筆數分開讀。", "不是真實可服務衛星清單。"]
    ]),
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
    ),
    `<h3>Satellite / TLE lineage</h3>`,
    stackedFieldGuide("Satellite / TLE lineage 欄位解讀", [
      ["Source strength / source path", "衛星資料來源強度與檔案路徑。", "用來把 actor 追溯回來源快照。", "路徑存在不代表資料已驗證為營運狀態。"],
      ["Format / API / parser fields", "來源格式、解析器類別與解析結果。", "檢查資料進入 runtime 前是否被拒絕或排除。", "解析成功不等於服務可用。"],
      ["Runtime cap / visible actors", "runtime 上限與畫面使用數量。", "用來解釋為什麼來源筆數和畫面數量不同。", "畫面使用數量不是完整星座規模。"]
    ]),
    table(
      [
        "Orbit",
        "Source strength",
        "Source",
        "Source path",
        "Format / API",
        "Records",
        "Accepted",
        "Rejected",
        "Parser failures",
        "Excluded categories",
        "Runtime cap",
        "Capped",
        "Visible actors"
      ],
      satellitePipelineRows(result)
    ),
    `<h3>Orbit source freshness</h3>`,
    stackedFieldGuide("Orbit source freshness 欄位解讀", [
      ["Snapshot / fetched UTC", "本次使用的軌道快照與取得時間。", "用來查資料新鮮度。", "取得時間不是本次投影的觀測時間。"],
      ["Max epoch UTC", "來源資料中最新的軌道 epoch。", "和投影時間窗一起看，判斷來源是否可能過舊。", "epoch 新不代表服務狀態被驗證。"],
      ["Policy / membership", "來源政策與星座歸屬判定。", "用來理解篩選依據。", "不等於營運商 active assignment。"]
    ]),
    table(
      [
        "Source",
        "Source strength",
        "Source mode",
        "Snapshot path",
        "Fetched UTC",
        "Max epoch UTC",
        "Policy",
        "Constellation membership"
      ],
      tleFreshnessRows(result)
    ),
    `<h3>Display transforms</h3>`,
    stackedFieldGuide("Display transforms 欄位解讀", [
      ["Source", "畫面轉換或顯示用資料來源。", "只用來追蹤 UI 如何呈現資料。", "Display transform 不會改寫來源真實值。"],
      ["Input summary", "顯示轉換使用的輸入摘要。", "用它確認畫面標籤、位置或 lane 的調整原因。", "不是計算模型或實測來源。"],
      ["Limit", "顯示轉換不能支持的結論。", "看到 display-only 時，不要用它證明來源資料本身。", "不是實際路由或連線證據。"]
    ]),
    table(
      ["Source", "Source strength", "Input summary", "Limit"],
      displayTransformRows(result)
    ),
    `<h3>Atmospheric / rain lineage</h3>`,
    stackedFieldGuide("Atmospheric / rain lineage 欄位解讀", [
      ["Lookup value", "降雨或大氣查表值。", "Scenario rain rate 要和本地觀測或校準天氣分開讀。", "不可用的 grid lookup 與本地雨量校準仍是來源缺口。"],
      ["Midpoint / cell coordinates", "查表使用的位置與網格資訊。", "用來判斷模型採樣位置。", "不是站點本地實測天氣。"],
      ["Source id / limit", "查表來源與限制。", "看它是否為標準、模型或來源缺口。", "不能宣稱當地即時氣象。"]
    ]),
    table(
      [
        "Source",
        "Source strength",
        "Midpoint lat",
        "Midpoint lon",
        "Cell lat",
        "Cell lon",
        "Lookup value",
        "Unit",
        "Interpolation",
        "Source id",
        "Limit"
      ],
      atmosphericLookupRows(result)
    ),
    `<h3>External evidence register</h3>`,
    stackedFieldGuide("External evidence register 欄位解讀", [
      ["Evidence ID / requirement IDs", "外部 artifact 與需求列的對應。", "用來查哪個 requirement row 有外部證據可引用。", "外部 artifact 不會自動提高其他資料列的來源強度。"],
      ["Evidence value", "外部證據能支持的具體內容。", "只在該列描述範圍內使用。", "不能外推成未列出的實測或營運事實。"],
      ["Boundary", "該證據的使用界線。", "做結論前先確認 boundary 是否允許。", "超出 boundary 的說法仍是來源缺口。"]
    ]),
    table(
      [
        "Evidence ID",
        "Requirement IDs",
        "Status",
        "Artifact refs",
        "Evidence value",
        "How to read",
        "Boundary"
      ],
      externalEvidenceRows(),
      `data-external-evidence-table="true"`
    ),
    `<h3>Missing evidence register</h3>`,
    stackedFieldGuide("Missing evidence register 欄位解讀", [
      ["Gap ID / missing evidence", "目前 report/package 沒有的證據。", "用來判斷哪些結論仍不能成立。", "缺口不能被模型數值補掉。"],
      ["Needed source", "要補齊缺口所需的來源。", "把它當成後續驗證或接資料的清單。", "不是目前已存在的資料。"],
      ["Impact / boundary", "缺口會限制哪些需求或結論。", "優先看影響範圍大的列。", "不能把缺口列當成通過證明。"]
    ]),
    table(
      [
        "Gap ID",
        "Requirement IDs",
        "Source strength",
        "Missing evidence",
        "Needed source",
        "Impact",
        "Boundary"
      ],
      missingEvidenceRows(),
      `data-missing-evidence-table="true"`
    ),
    `<h3>Source gaps</h3>`,
    stackedFieldGuide("Source gaps 欄位解讀", [
      ["Field", "缺少來源或需要限制說明的資料項。", "看到這些列時，結論要停在已揭露的來源強度。", "不是隱含已驗證資料。"],
      ["Evidence status", "目前證據狀態。", "source gap 表示沒有直接證據支撐更強說法。", "不能用模型輸出自動補齊。"],
      ["How to read / boundary", "使用者應如何解讀及不能怎麼用。", "用來避免把合理計算講成真實營運資料。", "限制仍然有效，除非來源資料被接入並重新揭露。"]
    ]),
    table(
      ["Field", "Source strength", "Evidence status", "How to read", "Boundary"],
      sourceGapRows(result),
      `data-source-gap-table="true"`
    )
  ].join("");
}

function buildModelsTab(result: RuntimeProjectionResult): string {
  return [
    lineagePanel(
      "Model lineage",
      [
        {
          label: "Modeled outputs",
          chipHtml: truthChip("Standards-derived", "standard"),
          detail:
            "Modeled outputs use runtime inputs, policy thresholds, and standards references.",
          sourceRefs: result.dataCompleteness.modeledOutputs.map(
            (output) => output.modelId
          ),
          howToRead:
            "這些卡片說明連線預算、延遲、抖動、吞吐量、降雨影響與換手數值是怎麼算出來的。",
          sourceBoundary:
            "每張模型卡都列出引用標準、使用的輸入，以及不能用它證明的事情。",
          nonClaim:
            "模型輸出不是實測服務資料，也不是商用路由證據。"
        },
        {
          label: "Station inputs",
          chipHtml: truthChip("Source gap", "gap"),
          detail:
            "Station inputs currently retain elevation and terrain-mask source status; antenna diameter, EIRP, and polarization remain unavailable.",
          sourceRefs: result.dataCompleteness.stationRfProfiles.map(
            (profile) => profile.provenance.sourceId
          ),
          howToRead:
            "如果站點 RF 參數缺失，RF chain 只能當模型計算參考，不能當成站點硬體事實。",
          sourceBoundary:
            "Station RF profile gaps 列在 Sources 分頁。",
          nonClaim:
            "缺少站點 RF 來源時，模型卡不會產生站點專屬 RF 事實。",
          sourceIssue: "RF hardware fields have no station-specific RF hardware facts."
        }
      ],
      "Model lineage separates formulas, scenario inputs, station inputs, and missing sources."
    ),
    `<h3>Assumptions and limits</h3>`,
    stackedFieldGuide("Assumptions and limits 欄位解讀", [
      ["Item", "限制或假設的來源類別。", "先判斷它限制的是 truth boundary、metric anchor 還是 runtime inventory。", "限制不是錯誤；它定義 report 不能支持的結論。"],
      ["Limit / assumption", "這次 report 必須保留的限制文字。", "把這欄當成讀取數據前的上限條件。", "不能被模型輸出、圖表或 summary wording 覆蓋。"],
      ["Not evidence of", "這列明確不能證明的事情。", "做對外結論前先檢查這欄。", "避免把合理計算說成實測、服務水準保證或真實營運事件。"]
    ]),
    table(
      ["Item", "Limit / assumption", "How to read", "Applies to", "Not evidence of"],
      assumptionsAndLimitsRows(result),
      `data-assumptions-limits-table="true"`
    ),
    `<h3>Standards used</h3>`,
    stackedFieldGuide("Standards used 欄位解讀", [
      ["Standard / reference", "模型或政策引用的標準文件與章節。", "用來追溯公式或政策依據。", "引用標準不等於本次資料已被外部驗收。"],
      ["Used for", "該標準在本 report 裡支援的模型區塊。", "把標準和 Modeled outputs / policy gates 對照。", "不能外推到未列出的模型或資料來源。"],
      ["Boundary", "這個標準引用不能支持的結論。", "把它當成防止過度宣稱的界線。", "不是實測服務資料，也不是營運路由證據。"]
    ]),
    table(
      ["Standard / reference", "Used for", "Source role", "How to read", "Boundary"],
      standardsReferenceRows(result),
      `data-standards-reference-table="true"`
    ),
    `<h3>Modeled outputs</h3>`,
    stackedFieldGuide("Modeled outputs 欄位解讀", [
      ["Output kind", "模型輸出的類型，例如 link budget、latency 或 rain effect。", "先確認它是哪一種模型結果，再看數值和單位。", "模型值不是實測服務資料。"],
      ["Model / standards", "產生該輸出的模型 id 與引用標準。", "用來追溯計算依據。", "引用標準不代表本次資料已被外部驗收。"],
      ["Inputs / limit", "模型使用的輸入摘要與限制。", "確認結果是否依賴缺少來源或情境輸入。", "不能宣稱服務水準保證、實測吞吐或真實營運路由。"]
    ]),
    renderModeledOutputsCards(result),
    `<h3>Handover policy gates</h3>`,
    stackedFieldGuide("Handover policy gates 欄位解讀", [
      ["Policy", "本次換手判定使用的模型政策。", "和 Handover tab 的事件原因一起看。", "不是無線層原生換手或營運商事件。"],
      ["Threshold / value", "政策門檻與本次使用值。", "用來理解模型何時改選衛星。", "不是 RF 實測門檻。"],
      ["Source / model / limit", "門檻來源、模型 id 與限制。", "確認哪些是模型假設，哪些有標準或來源支撐。", "不能用來宣稱實際閘道指派紀錄。"]
    ]),
    table(
      [
        "Policy",
        "Threshold",
        "Value",
        "Source strength",
        "Source",
        "Model",
        "Limit"
      ],
      policyRows(result)
    ),
    `<h3>RF chain</h3>`,
    stackedFieldGuide("RF chain 欄位解讀", [
      ["RF item", "RF chain 中使用或缺少的項目。", "逐項看是否有來源或只是模型假設。", "不是站點專屬 RF 硬體清單。"],
      ["Unavailable fields", "目前沒有來源的 RF 參數。", "看到 unavailable/source gap 時，不要解讀成已知硬體規格。", "模型輸出不會補齊缺少來源。"],
      ["Limit", "RF chain 可支持與不能支持的結論。", "用它限制 link budget 或 handover 的判讀範圍。", "不是實測服務資料。"]
    ]),
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
    stackedFieldGuide("Actor provenance 欄位解讀", [
      ["Satellite / orbit", "每顆出現在本報告中的衛星與軌道類別。", "用來和 Sources 的衛星來源紀錄互相核對。", "不代表實際正在提供服務的衛星清單。"],
      ["Samples / cadence", "runtime 對該 actor 的取樣數與取樣間隔。", "用來判斷模型時間解析度。", "不是 telemetry 實測取樣。"],
      ["First / last UTC", "本次推算涵蓋的時間範圍。", "和 selected time window 一起看。", "不是實際服務觀測時間。"]
    ]),
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
        "Source strength"
      ],
      actorRows(result)
    ),
    `<h3>Visibility provenance</h3>`,
    stackedFieldGuide("Visibility provenance 欄位解讀", [
      ["Station windows", "同一衛星對兩站各自可見的時間窗。", "用來追查 Visibility 表格每一列怎麼算出來。", "不是實際連線紀錄。"],
      ["Pair intersection", "兩站可見時間窗的交集。", "交集存在代表模型候選窗口，不代表通訊成功。", "不含封包測試、吞吐或服務水準保證。"],
      ["Elevation threshold / source strength", "仰角門檻與來源強度。", "和 Sources 的站點高程、地形遮罩一起核對。", "不是站點實測地平線。"]
    ]),
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
        "Source strength"
      ],
      visibilityProvenanceRows(result)
    ),
    `<h3>Raw JSON payload</h3>`,
    stackedFieldGuide("Raw JSON payload 欄位解讀", [
      ["Payload root", "這次 report 使用的完整原始資料結構。", "用來查核表格與摘要中每個值的原始欄位。", "原始 JSON 只保存本次輸出。"],
      ["Arrays / objects", "runtime 匯出的巢狀資料。", "展開節點後可追溯到各 tab 的表格來源。", "不會補上缺少的外部證據。"],
      ["Null / unavailable values", "原始資料中缺少或不可用的欄位。", "缺值要保留為限制，不能用 UI 文字補成事實。", "不是已驗證資料。"]
    ]),
    `<p class="section-desc">Use this tree to verify the exact raw values exported in this report.</p>`,
    `<div class="json-explorer-actions">`,
    `  <button type="button" class="report-button report-button--secondary" data-json-expand-all>Expand all</button>`,
    `  <button type="button" class="report-button report-button--secondary" data-json-collapse-all>Collapse all</button>`,
    `</div>`,
    `<div class="json-explorer">${renderJsonTree(result)}</div>`
  ].join("");
}

// --- Audit & evidence tab (WS-C) --------------------------------------------
// Retained standards-document checksums. sha256 mirror deliverable/3gpp-itu-references/
// README.md "Retained PDF checksums" (verify with `sha256sum`). These ground the
// FORMULAS, not the magnitudes: a standard document is not a measurement.
interface StandardsConformanceEntry {
  readonly quantity: string;
  readonly formula: string;
  readonly standardSection: string;
  readonly retainedPdf: string;
  readonly pdfSha256: string;
}
const STANDARDS_CONFORMANCE: ReadonlyArray<StandardsConformanceEntry> = [
  {
    quantity: "Free-space path loss",
    formula: "FSPL = 20·log10(d_km) + 20·log10(f_GHz) + 92.45",
    standardSection: "3GPP TR 38.811 §6.6.2 (Eq 6.6-2)",
    retainedPdf: "38811-f40.pdf",
    pdfSha256: "824ea7d359a432778dec9ccdc3a796d801a0f5f881153ebb24f73b1c5b3346ea"
  },
  {
    quantity: "One-way propagation delay",
    formula: "tau = d_slant / c + fixed processing",
    standardSection: "3GPP TR 38.811 §6.6.2 + clause 5.3.1.1",
    retainedPdf: "38811-f40.pdf",
    pdfSha256: "824ea7d359a432778dec9ccdc3a796d801a0f5f881153ebb24f73b1c5b3346ea"
  },
  {
    quantity: "Rain attenuation",
    formula: "A = gammaR · L_E, gammaR = k·R^alpha, L_E = L_R·v0.01",
    standardSection: "ITU-R P.618-14 §2.2.1.1 (Steps 2-9); k/alpha via P.838-3",
    retainedPdf: "R-REC-P.618-14-202308-I!!PDF-E.pdf",
    pdfSha256: "9812e7f34bd8ca0fe71827c1a7ef389761eefe758d0e8862a1c8de4b7065b249"
  },
  {
    quantity: "Gas absorption",
    formula: "A_gas = (gamma_o + gamma_w) · slant path",
    standardSection: "ITU-R P.676-13 Annex 2",
    retainedPdf: "R-REC-P.676-13-202208-I!!PDF-E.pdf",
    pdfSha256: "8c09b2d2c120bdae33f60c2a7abff873374d54075ce0dc71060de8a5507bbe2f"
  },
  {
    quantity: "Satellite antenna pattern",
    formula: "G(theta) roll-off from assumed peak gain + beamwidth",
    standardSection: "ITU-R S.1528-0 Annex 1",
    retainedPdf: "R-REC-S.1528-0-200106-I!!PDF-E.pdf",
    pdfSha256: "a3b3d6b79ce267524594e3cb0d82d0300b1faa1c57f47a21ba90c761312f8d41"
  },
  {
    quantity: "Earth-station antenna pattern",
    formula: "G(phi) sidelobe envelope from assumed diameter",
    standardSection: "ITU-R S.465-6",
    retainedPdf: "R-REC-S.465-6-201001-I!!PDF-E.pdf",
    pdfSha256: "a813d82235c24ad52681634d5d8a1275da621317ddb1a6754cd983643024f98a"
  },
  {
    quantity: "Handover trigger",
    formula: "argmax(received-power proxy) + hysteresis + dwell gate",
    standardSection: "3GPP TR 38.821 §7.3.2.2 + V-MO1 cross-orbit-live",
    retainedPdf: "38821-g20.pdf",
    pdfSha256: "4ac0c498187d91c17b1a8cb900364e6c692d1ce29619bd243a678c2bfdc67378"
  }
];

// Recorded verification results. These are re-runnable via the named command;
// the date is when each was last recorded, not re-checked at report render time.
const VERIFICATION_STATUS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["Bucket-A coverage gate (g1)", "19 / 19 pass", "npm run verify:g1", "2026-06-15"],
  ["24-hour stability soak", "pass (retained run)", "acceptance soak", "2026-05-16"],
  ["Over-claim wording gate", "pass", "npm test (verify-phase0)", "continuous"],
  ["TLE completeness + baselines", "pass", "npm run verify:tle", "2026-06-15"],
  ["Runtime physics unit suite", "pass", "npm run test:unit", "2026-06-15"]
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(
          (value as Record<string, unknown>)[key]
        )}`
    );
  return `{${entries.join(",")}}`;
}

// FNV-1a 32-bit reproducibility checksum (a determinism marker, not a security
// hash): the same route + window + TLE snapshot reproduces the same value.
function fnv1aChecksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function pickRepresentativeLinkBudget(
  result: RuntimeProjectionResult
): RepresentativeLinkBudget | null {
  const byOrbit = result.representativeLinkBudgetByOrbit;
  for (const orbit of ["GEO", "MEO", "LEO"] as const) {
    const entry = byOrbit[orbit];
    if (entry) {
      return entry;
    }
  }
  return null;
}

function resolveProjectionRainRate(result: RuntimeProjectionResult): number | null {
  const rainRateInput = result.dataCompleteness.modeledOutputs.find(
    (output) => output.inputSummary.rainRateMmPerHour !== undefined
  )?.inputSummary.rainRateMmPerHour;
  return typeof rainRateInput === "number" ? rainRateInput : null;
}

function honestyGradingRows(): ReportRow[] {
  return [
    ["Satellite position / trajectory", "Real compute", "SGP4 propagation of public TLE -> ECI -> GMST -> ECEF -> geodetic", "Reproducible; see Raw data + the in-app provenance popover"],
    ["Visibility window / elevation", "Real compute", "Mutual-visibility geometry recomputed per route from the propagated track", "Gated by elevation geometry only"],
    ["Comm time / handover count", "Real compute", "Per-sample serving decision over the window", "Handover count excludes the initial acquisition"],
    ["Slant range / one-way delay", "Standard model", "TR 38.811 §6.6.2 spherical geometry from the SGP4-propagated satellite radius", "Representative geometry, not a ranging measurement"],
    ["FSPL / gas / rain attenuation", "Standard model", "TR 38.811 §6.6.2 / ITU-R P.676-13 / ITU-R P.618-14 at representative geometry", "Modeled, not measured propagation"],
    ["Throughput (Mbps)", "Illustrative proxy", "Clear-sky reference capacity de-rated by atmospheric fade + assumed antenna off-axis loss", "Not a packet-test rate; no EIRP / noise / bandwidth"],
    ["Received power (RSRP proxy)", "Illustrative proxy", "Combined assumed antenna gain minus total path loss", "Relative proxy, not a measured RSRP; EIRP is not available"],
    ["Packet latency / jitter / loss, RF hardware, link-local weather", "External gap", "Not produced by the viewer", "Disclosed pending; not invented"]
  ];
}

function modelBoundaryRows(): ReportRow[] {
  return [
    ["Slant range altitude (S1)", "Improved", "Uses the SGP4-propagated per-satellite geocentric radius (was a nominal class altitude)", "Still a spherical-earth representative geometry"],
    ["Representative elevation (S2)", "Improved", "Uses the instantaneous per-station elevation, binding the worse (lower-elevation) station (was the constant pass maximum)", "One representative leg, not a full two-hop budget"],
    ["Rain latitude (S3)", "Improved", "Rain is computed per station at its own latitude/height and binds the worse station (was the pair-midpoint latitude)", "Driven by the demo rain-rate input, not a measured rain field"],
    ["Throughput / RSRP (S4)", "Disclosed proxy", "Kept as proxies; a Shannon/SNR rate is not computed because EIRP, noise temperature, and bandwidth are not available", "Filling these would be false precision over an unmeasured stack"],
    ["Packet-test KPIs, native RF handover, station RF hardware, link-local weather, surveyed horizon, acceptance thresholds", "External gap", "Out of the viewer's scope; no measured value is produced or claimed", "Disclosed pending; not invented"]
  ];
}

function standardsConformanceRows(
  result: RuntimeProjectionResult
): ReportRow[] {
  const rep = pickRepresentativeLinkBudget(result);
  const rainRate = resolveProjectionRainRate(result);
  const sampleFor = (quantity: string): string => {
    if (!rep || rep.geometrySource !== "sgp4-propagated-representative") {
      return "representative geometry unavailable for this route";
    }
    const orbit = rep.orbitClass;
    if (quantity === "Free-space path loss") {
      return `${orbit}: d=${rep.slantRangeKm.toFixed(1)} km, f=${rep.carrierFrequencyGHz} GHz -> ${rep.freeSpacePathLossDb.toFixed(2)} dB`;
    }
    if (quantity === "One-way propagation delay") {
      return `${orbit}: d=${rep.slantRangeKm.toFixed(1)} km -> ${rep.latencyMs.toFixed(3)} ms (incl. fixed processing)`;
    }
    if (quantity === "Rain attenuation") {
      const binding = rep.rainEndpoints.find((endpoint) => endpoint.stationLabel === rep.rainBindingStation) ?? rep.rainEndpoints[0];
      const rateLabel = rainRate === null ? "n/a" : `${rainRate}`;
      const elevLabel = binding ? binding.elevationDeg.toFixed(1) : rep.representativeElevationDeg.toFixed(1);
      const latLabel = binding ? binding.latitudeDeg.toFixed(1) : "n/a";
      return `${orbit}: R=${rateLabel} mm/h, el=${elevLabel}°, lat=${latLabel}° -> ${rep.rainAttenuationDb.toFixed(2)} dB${rep.rainBindingStation ? ` (binding station ${rep.rainBindingStation})` : " (clear sky)"}`;
    }
    if (quantity === "Gas absorption") {
      return `${orbit}: f=${rep.carrierFrequencyGHz} GHz, el=${rep.representativeElevationDeg.toFixed(1)}° -> ${rep.gasAbsorptionDb.toFixed(3)} dB`;
    }
    if (quantity === "Satellite antenna pattern" || quantity === "Earth-station antenna pattern") {
      return `${orbit}: combined assumed antenna gain ${rep.combinedAntennaGainDb.toFixed(1)} dB`;
    }
    if (quantity === "Handover trigger") {
      return `${result.communicationStats.handoverCount} handovers across ${result.handoverEvents.length} serving events`;
    }
    return "";
  };
  return STANDARDS_CONFORMANCE.map((entry) => [
    entry.quantity,
    { html: `<code>${escapeHtml(entry.formula)}</code>` },
    entry.standardSection,
    sampleFor(entry.quantity)
  ]);
}

function standardsChecksumRows(): ReportRow[] {
  return STANDARDS_CONFORMANCE.filter(
    (entry, index, all) =>
      all.findIndex((other) => other.retainedPdf === entry.retainedPdf) === index
  ).map((entry) => [
    { html: `<code>${escapeHtml(entry.retainedPdf)}</code>` },
    entry.standardSection,
    { html: `<code>${escapeHtml(entry.pdfSha256)}</code>` }
  ]);
}

function rainSensitivityRows(result: RuntimeProjectionResult): {
  readonly rows: ReportRow[];
  readonly orbit: string | null;
} {
  const rep = pickRepresentativeLinkBudget(result);
  if (!rep || rep.geometrySource !== "sgp4-propagated-representative") {
    return { rows: [], orbit: null };
  }
  const endpoints: LinkBudgetRainEndpoint[] = rep.rainEndpoints.map((endpoint) => ({
    stationLabel: endpoint.stationLabel,
    latitudeDeg: endpoint.latitudeDeg,
    heightAboveSeaKm: endpoint.heightAboveSeaKm,
    elevationDeg: endpoint.elevationDeg
  }));
  const baseOptions = {
    representativeElevationDeg: rep.representativeElevationDeg,
    satelliteRadiusKm: rep.satelliteRadiusKm,
    rainEndpoints: endpoints
  };
  const clear = computeLinkBudgetMetricsForOrbit(rep.orbitClass, {
    ...baseOptions,
    rainRateMmPerHour: 0
  }).networkSpeedMbps;
  const rows = [0, 5, 10, 25, 50].map((rate) => {
    const metrics = computeLinkBudgetMetricsForOrbit(rep.orbitClass, {
      ...baseOptions,
      rainRateMmPerHour: rate
    });
    const dropPct =
      clear > 0 ? ((clear - metrics.networkSpeedMbps) / clear) * 100 : 0;
    return [
      `${rate} mm/h`,
      `${metrics.networkSpeedMbps.toFixed(1)} Mbps`,
      `${metrics.jitterMs.toFixed(1)} ms`,
      rate === 0 ? "reference" : `-${dropPct.toFixed(1)}%`
    ];
  });
  return { rows, orbit: rep.orbitClass };
}

function buildAuditTab(
  result: RuntimeProjectionResult,
  generatedAtUtc: string
): string {
  const rep = pickRepresentativeLinkBudget(result);
  const sensitivity = rainSensitivityRows(result);
  const payloadChecksum = fnv1aChecksum(stableStringify(result));
  const windowLabel = `${formatIsoShort(result.timeWindow.startUtc)} to ${formatIsoShort(result.timeWindow.endUtc)}`;
  const reference = SGP4_REFERENCE_VECTORS.reference;

  const gradingSection = `<h3>Honesty grading matrix</h3>
    ${callout(
      "How to read this report",
      "Every displayed value is tiered by how it is produced: real compute (recomputed geometry/timing), standard model (a published formula at representative geometry), illustrative proxy (a bounded stand-in, not a measured rate), or external gap (not produced, disclosed pending). A standard model is still a model; a proxy is not a measurement."
    )}
    ${table(["Displayed value", "Fidelity", "How it is produced", "Boundary"], honestyGradingRows())}`;

  const boundarySection = `<h3>Model-boundary disclosure</h3>
    <p>Current state of the link-budget geometry after the WS-F model-fidelity pass. S1-S3 were improved using geometry already in hand; S4 and the external gaps remain disclosed proxies / gaps and are not filled with invented numbers.</p>
    ${table(["Boundary", "State", "Current behaviour", "Remaining limit"], modelBoundaryRows())}`;

  const conformanceSection = `<h3>Standards conformance</h3>
    <p>Each modeled quantity, the published formula, its standard clause, and one sample input -> output taken from this route's representative geometry. The magnitudes are modeled / standard-derived, not measured.</p>
    ${table(["Quantity", "Formula", "Standard clause", "Sample input -> output (this route)"], standardsConformanceRows(result))}`;

  const sensitivitySection = `<h3>Rain sensitivity</h3>
    ${
      sensitivity.rows.length > 0
        ? `<p>Modeled throughput proxy and jitter at the route's ${escapeHtml(sensitivity.orbit ?? "")} representative geometry as the rain-rate input is swept. This is the same model the live rain slider drives; the rate is the demo input, not a measured rain field, and the rate -> throughput curve is illustrative (no packet test).</p>
    ${table(["Rain rate", "Throughput proxy", "Jitter", "Change vs clear sky"], sensitivity.rows)}`
        : `<p>No propagated representative geometry was available for this route, so the sensitivity sweep is omitted.</p>`
    }`;

  const reproSection = `<h3>Reproducibility imprint</h3>
    ${kvTable([
      ["Route", { html: `<code>${escapeHtml(result.dataCompleteness.routeMode ?? "tle-first-runtime")}</code>` }],
      ["Stations", `${formatReportTitleStation(result.pair.stationA)} / ${formatReportTitleStation(result.pair.stationB)}`],
      ["Time window", windowLabel],
      ["Shared orbits", result.sharedSupportedOrbits.join(" / ") || "none"],
      ["Visibility windows", result.visibilityWindows.length],
      ["Handover count", result.communicationStats.handoverCount],
      ["Payload checksum (FNV-1a)", { html: `<code>${escapeHtml(payloadChecksum)}</code>` }],
      ["Report generated", generatedAtUtc]
    ])}
    ${callout(
      "Determinism",
      "Re-running computeRuntimeProjection on the same route, time window, and TLE snapshot reproduces this payload checksum. The retained HTML and CSV sha256 are recorded in deliverable/selected-pair-source-evidence/evidence-manifest.json; the report's own generation timestamp is wall-clock and is excluded from the payload checksum."
    )}`;

  const repNote = rep
    ? `Representative geometry source: ${rep.geometrySource} (${rep.representativeSatelliteId} at ${formatIsoShort(rep.representativeSampleUtc)}).`
    : "No representative link budget available for this route.";

  const verificationSection = `<h3>Verification status</h3>
    ${table(["Check", "Result", "Re-run with", "As of"], VERIFICATION_STATUS.map((entry) => [entry[0], entry[1], { html: `<code>${escapeHtml(entry[2])}</code>` }, entry[3]]))}
    <p>SGP4 correctness is cross-checked against an independent ${escapeHtml(reference.generator)} ${escapeHtml(reference.generatorVersion)} (${escapeHtml(reference.algorithm)}, ${escapeHtml(reference.gravityModel)}): ${SGP4_REFERENCE_VECTORS.samples.length} reference vectors, agreement within ${SGP4_REFERENCE_VECTORS.toleranceKm} km. The in-app provenance popover renders the app value vs this reference side by side. ${escapeHtml(repNote)}</p>
    <h3>Retained standards documents</h3>
    <p>The formulas above are grounded in retained 3GPP / ITU-R PDFs (sha256 below; full set and section map in deliverable/3gpp-itu-references/README.md). A standard document grounds a formula; it is not a measurement of this link.</p>
    ${table(["Retained PDF", "Standard / clause", "SHA-256"], standardsChecksumRows())}`;

  return [
    gradingSection,
    boundarySection,
    conformanceSection,
    sensitivitySection,
    reproSection,
    verificationSection
  ].join("\n");
}

export function buildRuntimeProjectionEvidenceReportHtml(
  result: RuntimeProjectionResult
): string {
  const title = `${formatReportTitleStation(result.pair.stationA)} - ${formatReportTitleStation(result.pair.stationB)}`;
  const generatedAtUtc = new Date().toISOString();
  const filename = buildRuntimeProjectionEvidenceReportFilename(result);
  const tabs = [
    ["summary", "Summary"],
    ["requirements", "Requirements"],
    ["visibility", "Visibility"],
    ["handover", "Handover"],
    ["sources", "Sources"],
    ["models", "Models"],
    ["audit", "Audit & evidence"],
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
    section("requirements", "Requirements", buildRequirementsTab(result)),
    section("visibility", "Visibility windows", buildVisibilityTab(result)),
    section("handover", "Handover events", buildHandoverTab(result)),
    section("sources", "Sources", buildSourcesTab(result)),
    section("models", "Assumptions & models", buildModelsTab(result)),
    section("audit", "Audit & evidence", buildAuditTab(result, generatedAtUtc)),
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
      --tone-model: #60a5fa;
      --tone-model-bg: rgba(96, 165, 250, 0.085);
      --tone-public: #34d399;
      --tone-public-bg: rgba(52, 211, 153, 0.075);
      --tone-standard: #a78bfa;
      --tone-standard-bg: rgba(167, 139, 250, 0.075);
      --tone-display: #fbbf24;
      --tone-display-bg: rgba(251, 191, 36, 0.075);
      --tone-gap: #fb7185;
      --tone-gap-bg: rgba(251, 113, 133, 0.09);
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
      max-width: 1440px;
      margin: 0 auto;
      padding: 14px 24px 10px;
    }
    .header-top {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }
    .header-top > div:first-child {
      min-width: 0;
      flex: 1 1 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: Outfit, sans-serif;
      letter-spacing: 0;
    }
    h1 {
      max-width: none;
      margin: 0 0 6px;
      font-size: clamp(19px, 2vw, 24px);
      font-weight: 800;
      line-height: 1.16;
      letter-spacing: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-primary);
    }
    h2, h3 {
      margin: 28px 0 14px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: 0;
      color: var(--text-primary);
    }
    p { line-height: 1.6; }
    .meta {
      color: var(--text-muted);
      margin: 0;
      font-size: 15px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 12px;
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
      font-size: 16px;
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
    .truth-chip {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-default);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.4;
      vertical-align: middle;
      white-space: nowrap;
    }
    .truth-chip[data-tone="model"] {
      border-color: rgba(96, 165, 250, 0.45);
      background: var(--tone-model-bg);
      color: #bfdbfe;
    }
    .truth-chip[data-tone="public"],
    .truth-chip[data-tone="external"] {
      border-color: rgba(52, 211, 153, 0.45);
      background: var(--tone-public-bg);
      color: #a7f3d0;
    }
    .truth-chip[data-tone="standard"] {
      border-color: rgba(167, 139, 250, 0.45);
      background: var(--tone-standard-bg);
      color: #ddd6fe;
    }
    .truth-chip[data-tone="display"] {
      border-color: rgba(251, 191, 36, 0.45);
      background: var(--tone-display-bg);
      color: #fde68a;
    }
    .truth-chip[data-tone="gap"] {
      border-color: rgba(251, 113, 133, 0.55);
      background: var(--tone-gap-bg);
      color: #fecdd3;
    }
    .source-issue-marker {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin: 6px 8px 6px 0;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(248, 113, 113, 0.1);
      color: #fecaca;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.4;
      vertical-align: middle;
    }
    .source-issue-marker:focus-visible {
      outline: 2px solid rgba(248, 113, 113, 0.65);
      outline-offset: 2px;
    }
    .lineage-panel,
    .field-guide {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
      padding: 18px;
      margin: 0 0 22px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .lineage-panel__header {
      display: flex;
      gap: 10px;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .lineage-panel__header span {
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .lineage-panel__header strong {
      color: var(--text-primary);
      font-size: 19px;
    }
    .lineage-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      min-width: 0;
    }
    .lineage-item {
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.025);
      padding: 14px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .lineage-item:has(.truth-chip[data-tone="model"]) {
      border-left: 3px solid rgba(96, 165, 250, 0.62);
      background: linear-gradient(90deg, rgba(96, 165, 250, 0.045), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="public"]),
    .lineage-item:has(.truth-chip[data-tone="external"]) {
      border-left: 3px solid rgba(52, 211, 153, 0.62);
      background: linear-gradient(90deg, rgba(52, 211, 153, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="standard"]) {
      border-left: 3px solid rgba(167, 139, 250, 0.58);
      background: linear-gradient(90deg, rgba(167, 139, 250, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="display"]) {
      border-left: 3px solid rgba(251, 191, 36, 0.58);
      background: linear-gradient(90deg, rgba(251, 191, 36, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="gap"]) {
      border-left: 3px solid rgba(251, 113, 133, 0.7);
      background: linear-gradient(90deg, rgba(251, 113, 133, 0.055), rgba(255, 255, 255, 0.018));
    }
    .lineage-item__top {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    .lineage-label {
      font-weight: 800;
      color: var(--text-primary);
    }
    .lineage-item p {
      margin: 8px 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .lineage-sources {
      display: block;
      color: var(--text-muted);
      font-family: "IBM Plex Mono", monospace;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel {
      margin: 12px 0 0;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.76);
      box-shadow: inset 3px 0 0 rgba(56, 189, 248, 0.52);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel div {
      display: grid;
      grid-template-columns: minmax(118px, 0.26fr) minmax(0, 1fr);
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      min-width: 0;
    }
    .evidence-detail-panel div:last-child { border-bottom: 0; }
    .evidence-detail-panel dt {
      color: var(--text-primary);
      font-weight: 800;
      font-size: 15px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel dd {
      margin: 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.55;
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .evidence-detail-panel--stacked div,
    #handover .evidence-detail-panel div {
      display: block;
      padding: 10px 0 12px;
    }
    .evidence-detail-panel--stacked dt,
    #handover .evidence-detail-panel dt {
      display: block;
      margin-bottom: 3px;
      color: #7dd3fc;
    }
    .evidence-detail-panel--stacked dd,
    #handover .evidence-detail-panel dd {
      display: block;
    }
    .field-guide .table-wrap {
      margin-top: 10px;
      border-color: rgba(56, 189, 248, 0.22);
      background: rgba(15, 23, 42, 0.62);
    }
    .field-guide-table {
      margin-top: 12px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.62);
      overflow: hidden;
    }
    .field-guide-table__head,
    .field-guide-table__row {
      display: grid;
      grid-template-columns: minmax(150px, 0.75fr) repeat(3, minmax(0, 1fr));
      min-width: 0;
    }
    .field-guide-table__head {
      background: rgba(12, 26, 42, 0.97);
      border-bottom: 1px solid rgba(56, 189, 248, 0.18);
    }
    .field-guide-table__head span {
      color: var(--accent);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .field-guide-table__head span:nth-child(2),
    .field-guide-table__row span:nth-child(2) {
      background: rgba(96, 165, 250, 0.035);
    }
    .field-guide-table__head span:nth-child(3),
    .field-guide-table__row span:nth-child(3) {
      background: rgba(52, 211, 153, 0.035);
    }
    .field-guide-table__head span:nth-child(4),
    .field-guide-table__row span:nth-child(4) {
      background: rgba(245, 158, 11, 0.035);
    }
    .field-guide-table__row {
      border-top: 1px solid rgba(255, 255, 255, 0.075);
    }
    .field-guide-table__row:first-of-type {
      border-top: 0;
    }
    .field-guide-table__row:nth-child(odd) {
      background: rgba(255, 255, 255, 0.018);
    }
    .field-guide-table__head span,
    .field-guide-table__row strong,
    .field-guide-table__row span {
      padding: 13px 14px;
      border-left: 1px solid rgba(255, 255, 255, 0.055);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .field-guide-table__head span:first-child,
    .field-guide-table__row strong:first-child {
      border-left: 0;
    }
    .field-guide-table__row strong {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.45;
    }
    .field-guide-table__row span {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.55;
    }
    .toolbar-actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 10px;
    }
    .detail-toggle-control {
      display: inline-flex;
      min-height: 38px;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      border: 1px solid var(--border-default);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      user-select: none;
    }
    .detail-toggle-control:hover {
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    .detail-toggle-knob {
      width: 38px;
      height: 20px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      position: relative;
    }
    .detail-toggle-knob::after {
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      top: 3px;
      left: 3px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: transform 0.2s, background 0.2s;
    }
    .evidence-detail-label {
      font-size: 16px;
      font-weight: 700;
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
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: center;
      padding: 8px 24px;
    }
    [role="tablist"] {
      display: flex;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      gap: 6px;
      min-width: 0;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    [role="tab"] {
      flex: 0 0 auto;
      min-height: 38px;
      padding: 0 13px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      font: inherit;
      font-size: 16px;
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
      flex: 0 0 260px;
      min-height: 38px;
      min-width: 220px;
      margin-left: 0;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
      font-size: 16px;
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
      max-width: 1440px;
      margin: 0 auto;
      padding: 26px 24px 54px;
    }
    .panel-layout {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }
    .panel-content {
      min-width: 0;
    }
    .panel-content > h3 {
      scroll-margin-top: 112px;
    }
    .section-outline {
      position: sticky;
      top: 72px;
      align-self: start;
      max-height: calc(100vh - 92px);
      overflow: auto;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: rgba(12, 26, 42, 0.76);
      padding: 8px;
      backdrop-filter: blur(10px);
    }
    .section-outline__links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .section-outline__link {
      display: block;
      color: var(--text-secondary);
      text-decoration: none;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 9px 10px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.32;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .section-outline__link:hover,
    .section-outline__link:focus-visible,
    .section-outline__link.is-active,
    .section-outline__link[aria-current="location"] {
      color: var(--accent);
      border-color: var(--border-accent);
      background: var(--accent-glow);
      outline: none;
    }
    .section-outline__link.is-active,
    .section-outline__link[aria-current="location"] {
      box-shadow: inset 3px 0 0 var(--accent);
      font-weight: 750;
    }
    .section-outline__link span {
      display: block;
      overflow-wrap: anywhere;
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
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
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
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
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
      overflow-wrap: anywhere;
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
      font-size: 17px;
    }
    th,
    td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: rgba(12, 26, 42, 0.97);
      color: var(--accent);
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    td {
      color: var(--text-secondary);
      overflow-wrap: anywhere;
      line-height: 1.5;
    }
    tbody tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.018);
    }
    tbody tr:has(.truth-chip[data-tone="model"]) {
      box-shadow: inset 3px 0 0 rgba(96, 165, 250, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="public"]),
    tbody tr:has(.truth-chip[data-tone="external"]) {
      box-shadow: inset 3px 0 0 rgba(52, 211, 153, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="standard"]) {
      box-shadow: inset 3px 0 0 rgba(167, 139, 250, 0.48);
    }
    tbody tr:has(.truth-chip[data-tone="display"]) {
      box-shadow: inset 3px 0 0 rgba(251, 191, 36, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="gap"]) {
      background: linear-gradient(90deg, rgba(251, 113, 133, 0.045), rgba(255, 255, 255, 0.012));
      box-shadow: inset 3px 0 0 rgba(251, 113, 133, 0.68);
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
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
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
      font-size: 15px;
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
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--text-muted);
    }
    .meta-val.badge {
      font-size: 15px;
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
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
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
      font-size: 16px;
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
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
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
      font-size: 16px;
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
      font-size: 16px;
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
      font-size: 16px;
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
      font-size: 12px;
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
      font-size: 14px;
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
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 24px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      backdrop-filter: blur(8px);
      transition: all 0.2s;
    }
    .dashboard-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .dashboard-card .card-content {
      flex: 1;
      min-width: 0;
    }
    .dashboard-card .dashboard-detail-row {
      flex: 1 0 100%;
      width: 100%;
      margin-top: 4px;
    }
    .dashboard-card .card-title {
      display: block;
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
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
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.4;
      overflow-wrap: anywhere;
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
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
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
      font-size: 14px;
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
      font-size: 14px;
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

    /* Evidence Detail disclosure */
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
      font-size: 15px;
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

    .context-only,
    .evidence-detail-only {
      display: none !important;
    }
    #evidence-detail-toggle:checked ~ main .context-only,
    #evidence-detail-toggle:checked ~ header .context-only,
    #evidence-detail-toggle:checked ~ .toolbar .context-only,
    #evidence-detail-toggle:checked ~ main .evidence-detail-only,
    #evidence-detail-toggle:checked ~ header .evidence-detail-only,
    #evidence-detail-toggle:checked ~ .toolbar .evidence-detail-only {
      display: block !important;
    }
    #evidence-detail-toggle:checked ~ main span.context-only.badge-provenance {
      display: inline-block !important;
    }
    #evidence-detail-toggle:checked ~ .toolbar .detail-toggle-control {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-glow);
    }
    #evidence-detail-toggle:checked ~ .toolbar .detail-toggle-knob::after {
      transform: translateX(18px);
      background: var(--accent);
    }
    
    #evidence-detail-toggle:checked ~ main div.context-only.context-interpretation {
      display: block !important;
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid var(--tone-info);
      border-radius: 4px;
      font-size: 16px;
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
      font-size: 14px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .formula-math {
      font-family: "IBM Plex Mono", monospace;
      font-size: 16px;
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
      font-size: 16px;
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
      .toolbar-inner {
        flex-wrap: wrap;
      }
      [role="tablist"] {
        flex: 1 0 100%;
        order: 0;
      }
      input[type="search"],
      .toolbar-actions {
        order: 1;
      }
      .panel-layout {
        display: block;
      }
      .section-outline {
        position: sticky;
        top: 58px;
        z-index: 1;
        max-height: none;
        margin-bottom: 18px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 10px;
      }
      .section-outline__links {
        flex-direction: row;
        gap: 8px;
        min-width: max-content;
      }
      .section-outline__link {
        white-space: nowrap;
      }
      .header-top {
        flex-direction: column;
        gap: 16px;
      }
      .summary-grid,
      .evidence-grid {
        grid-template-columns: 1fr;
      }
      .lineage-grid {
        grid-template-columns: 1fr;
      }
      .dashboard-card {
        align-items: stretch;
        flex-direction: column;
      }
      .dashboard-card .card-visual,
      .dashboard-card .card-visual.flex-column {
        flex: 0 0 auto;
        width: 100%;
      }
      input[type="search"] {
        margin-left: 0;
        flex: 1 1 220px;
      }
    }
    @media (max-width: 720px) {
      .evidence-detail-panel div {
        grid-template-columns: 1fr;
        gap: 4px;
      }
      .evidence-detail-panel dt {
        color: #7dd3fc;
      }
      .field-guide-table__head {
        display: none;
      }
      .field-guide-table__row {
        display: block;
        padding: 10px 0;
      }
      .field-guide-table__row strong,
      .field-guide-table__row span {
        display: block;
        border-left: 0;
        padding: 7px 12px;
      }
      .field-guide-table__row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
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
  <input type="checkbox" id="evidence-detail-toggle" aria-label="Evidence Detail" hidden>
  <header>
    <div class="report-header">
      <div class="header-top">
        <div>
          <h1 title="${escapeHtml(title)}">${escapeHtml(title)}</h1>
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
      <div class="toolbar-actions">
        <label class="detail-toggle-control" for="evidence-detail-toggle" title="Show methods, assumptions, formulas, and limits">
          <span class="detail-toggle-knob" aria-hidden="true"></span>
          <span class="evidence-detail-label">Evidence Detail</span>
        </label>
      </div>
    </div>
  </div>
  <main>${panels}</main>
  <script>
    (() => {
      const tabs = Array.from(document.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const filter = document.querySelector("[data-report-filter]");
      const toolbar = document.querySelector(".toolbar");
      let activeTabId =
        panels.find((panel) => !panel.hidden)?.dataset.tabPanel ??
        tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.tabTarget ??
        "summary";
      const visitedTabs = new Set(activeTabId ? [activeTabId] : []);
      const scrollPositions = new Map();
      let outlineRaf = 0;
      const clearActiveOutlineLinks = () => {
        for (const link of document.querySelectorAll("[data-section-outline-link='true']")) {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        }
      };
      const targetIdFromOutlineLink = (link) => {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#")) return "";
        try {
          return decodeURIComponent(href.slice(1));
        } catch {
          return href.slice(1);
        }
      };
      const keepOutlineLinkVisible = (link) => {
        const outline = link.closest(".section-outline");
        if (!outline) return;
        const top = link.offsetTop;
        const bottom = top + link.offsetHeight;
        const viewTop = outline.scrollTop;
        const viewBottom = viewTop + outline.clientHeight;
        if (top < viewTop) {
          outline.scrollTop = Math.max(0, top - 8);
        } else if (bottom > viewBottom) {
          outline.scrollTop = bottom - outline.clientHeight + 8;
        }
        const left = link.offsetLeft;
        const right = left + link.offsetWidth;
        const viewLeft = outline.scrollLeft;
        const viewRight = viewLeft + outline.clientWidth;
        if (left < viewLeft) {
          outline.scrollLeft = Math.max(0, left - 8);
        } else if (right > viewRight) {
          outline.scrollLeft = right - outline.clientWidth + 8;
        }
      };
      const setActiveOutlineLink = (link) => {
        if (!link) return;
        clearActiveOutlineLinks();
        link.classList.add("is-active");
        link.setAttribute("aria-current", "location");
        keepOutlineLinkVisible(link);
      };
      const updateActiveOutline = () => {
        const activePanel = panels.find((panel) => !panel.hidden);
        if (!activePanel) return;
        const links = Array.from(
          activePanel.querySelectorAll("[data-section-outline-link='true']")
        );
        if (links.length === 0) return;
        const probeY = Math.max(
          (toolbar?.getBoundingClientRect().bottom ?? 0) + 72,
          window.innerHeight * 0.18
        );
        let activeLink = links[0];
        const atBottom =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 4;
        if (atBottom) {
          activeLink = links[links.length - 1];
        } else {
          for (const link of links) {
            const target = document.getElementById(targetIdFromOutlineLink(link));
            if (!target) continue;
            if (target.getBoundingClientRect().top <= probeY) {
              activeLink = link;
            } else {
              break;
            }
          }
        }
        setActiveOutlineLink(activeLink);
      };
      const scheduleActiveOutlineUpdate = () => {
        if (outlineRaf !== 0) return;
        outlineRaf = window.requestAnimationFrame(() => {
          outlineRaf = 0;
          updateActiveOutline();
        });
      };
      const activate = (id) => {
        if (!id || id === activeTabId) {
          return;
        }
        if (activeTabId) {
          scrollPositions.set(activeTabId, window.scrollY);
        }
        const hasVisited = visitedTabs.has(id);
        for (const tab of tabs) {
          const active = tab.dataset.tabTarget === id;
          tab.setAttribute("aria-selected", String(active));
          tab.setAttribute("tabindex", active ? "0" : "-1");
        }
        for (const panel of panels) panel.hidden = panel.dataset.tabPanel !== id;
        activeTabId = id;
        visitedTabs.add(id);
        if (filter) filter.value = "";
        applyFilter("");
        const targetScrollY = hasVisited ? scrollPositions.get(id) ?? 0 : 0;
        window.scrollTo({ top: Math.max(0, targetScrollY), left: 0, behavior: "auto" });
        window.requestAnimationFrame(scheduleActiveOutlineUpdate);
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
      for (const link of document.querySelectorAll("[data-section-outline-link='true']")) {
        link.addEventListener("click", () => {
          setActiveOutlineLink(link);
          window.setTimeout(scheduleActiveOutlineUpdate, 0);
        });
      }
      window.addEventListener("scroll", scheduleActiveOutlineUpdate, { passive: true });
      window.addEventListener("resize", scheduleActiveOutlineUpdate);
      updateActiveOutline();
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
