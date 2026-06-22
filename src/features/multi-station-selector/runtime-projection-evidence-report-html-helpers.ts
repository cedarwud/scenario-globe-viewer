// Evidence-report HTML helpers — generic formatters, the table/section/chip/
// panel builders, and the shared Report* types. Extracted leaf layer of the
// evidence renderer; depends only on projection + manifest types. The byte-
// exact golden (runtime-projection-evidence-report-golden.test.mjs) guards
// that this move left the delivered report unchanged.
import { type RuntimeProjectionResult } from "./runtime-projection";
import { type SelectedPairEvidenceStatus } from "./selected-pair-report-evidence-manifest";

export type ReportCell = string | number | boolean | null | undefined | { html: string };
export type ReportRow = ReadonlyArray<ReportCell>;
export type TruthChipTone = "model" | "public" | "standard" | "external" | "display" | "gap";
export type EvidenceDetailRow = readonly [string, string];
export type FieldGuideRow = readonly [string, string, string, string];

export interface ProvenanceLike {
  readonly truthClass?: string;
  readonly sourceId?: string;
  readonly modelId?: string;
  readonly nonClaim?: string;
}

export interface LineageItem {
  readonly label: string;
  readonly chipHtml: string;
  readonly detail: string;
  readonly sourceRefs?: ReadonlyArray<string>;
  readonly howToRead?: string;
  readonly sourceBoundary?: string;
  readonly nonClaim?: string;
  readonly sourceIssue?: string;
}

export const ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"] as const;
export const POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
] as const;

export function escapeHtml(value: ReportCell): string {
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

export function formatReportTitleStation(
  station: RuntimeProjectionResult["pair"]["stationA"]
): string {
  const countryCode = station.country.trim().toUpperCase();
  return countryCode ? `${countryCode} ${station.name}` : station.name;
}

export function formatInputSummaryToHtml(summary: Record<string, string | number | boolean | null | undefined> | undefined | null): { html: string } {
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


export function durationMs(startUtc: string, endUtc: string): number | null {
  const startMs = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }
  return Math.max(0, endMs - startMs);
}

export function formatDurationMs(ms: number | null | undefined): string {
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

export function formatIsoShort(utc: string | null | undefined): string {
  if (!utc) {
    return "n/a";
  }
  const parsedMs = Date.parse(utc);
  if (!Number.isFinite(parsedMs)) {
    return utc;
  }
  return new Date(parsedMs).toISOString().replace(".000Z", "Z");
}

export function sanitizeFilenameSegment(segment: string): string {
  const sanitized = segment.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "unknown";
}

export function compactUtcForFilename(utc: string): string {
  const parsedMs = Date.parse(utc);
  const normalized = Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : utc;
  return sanitizeFilenameSegment(
    normalized.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  );
}

export function table(
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

export function kvTable(rows: ReadonlyArray<readonly [string, ReportCell]>): string {
  return table(["Field", "Value"], rows);
}

export function list(items: ReadonlyArray<ReportCell>): string {
  if (items.length === 0) {
    return `<p class="empty">No entries.</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function sourceIssueMarker(label: string, title: string): string {
  return `<span class="source-issue-marker" data-source-issue-marker="true" tabindex="0" aria-label="${escapeHtml(
    `${label}: ${title}`
  )}" title="${escapeHtml(
    title
  )}">${escapeHtml(label)}</span>`;
}

export function evidenceDetailPanel(
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

export function truthChip(label: string, tone: TruthChipTone, title?: string): string {
  return `<span class="truth-chip" data-tone="${tone}"${
    title ? ` title="${escapeHtml(title)}"` : ""
  }>${escapeHtml(label)}</span>`;
}

export function provenanceChipForTier(sourceTier: string, evidenceKind?: string): string {
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

export function evidenceStatusChip(status: SelectedPairEvidenceStatus): { html: string } {
  if (status === "available") {
    return { html: truthChip("External evidence", "external", status) };
  }
  if (status === "partial") {
    return { html: `${truthChip("External evidence", "external", status)}${truthChip("Source gap", "gap", status)}` };
  }
  return { html: truthChip("Source gap", "gap", status) };
}

export function joinEvidenceIds(values: ReadonlyArray<string>): string {
  return values.join(" | ");
}

export function provenanceChipForTag(
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

export function lineagePanel(
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

export function fieldGuide(title: string, rows: ReadonlyArray<FieldGuideRow>): string {
  return `<aside class="field-guide evidence-detail-only" data-field-guide="true">
    <h3 data-no-outline="true">${escapeHtml(title)}</h3>
    ${table(["欄位", "數據代表什麼", "怎麼解讀", "來源與限制"], rows)}
  </aside>`;
}

export function stackedFieldGuide(title: string, rows: ReadonlyArray<FieldGuideRow>): string {
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

export function evidenceCardDetailed(
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

export function callout(title: string, body: string, tone: "info" | "warn" = "info"): string {
  return `<aside class="callout" data-tone="${tone}"><strong>${escapeHtml(
    title
  )}</strong><p>${escapeHtml(body)}</p></aside>`;
}

export function sectionSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

export function sectionAnchorTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

export function withSectionOutline(panelId: string, panelTitle: string, body: string): string {
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

export function section(id: string, title: string, body: string, active = false): string {
  const content = withSectionOutline(id, title, body);
  return `<section id="${id}" class="tab-panel" role="tabpanel" data-tab-panel="${id}"${
    active ? "" : " hidden"
  } aria-labelledby="tab-${id}">${content}</section>`;
}
