// Evidence-report data rows — the *Rows / render*Cards builders that turn a
// RuntimeProjectionResult into table rows and card HTML. Leaf layer above the
// html-helpers; consumed by the tab assemblers. Behavior guarded by the byte-
// exact golden (runtime-projection-evidence-report-golden.test.mjs).
import { type RuntimeProjectionResult } from "./runtime-projection";
import {
  SELECTED_PAIR_EXTERNAL_EVIDENCE,
  SELECTED_PAIR_MISSING_EVIDENCE
} from "./selected-pair-report-evidence-manifest";
import {
  type ReportCell,
  type ReportRow,
  type TruthChipTone,
  ORBIT_DISPLAY_ORDER,
  POLICY_DISCLOSURE_THRESHOLD_ORDER,
  escapeHtml,
  formatInputSummaryToHtml,
  durationMs,
  formatDurationMs,
  formatIsoShort,
  list,
  truthChip,
  evidenceStatusChip,
  joinEvidenceIds,
  provenanceChipForTag
} from "./runtime-projection-evidence-report-html-helpers";

export function orbitDurationRows(result: RuntimeProjectionResult): ReportRow[] {
  return ORBIT_DISPLAY_ORDER.map((orbitClass) => [
    orbitClass,
    formatDurationMs(result.communicationStats.byOrbit[orbitClass]),
    result.communicationStats.byOrbit[orbitClass]
  ]);
}

export function visibilityRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function handoverRows(result: RuntimeProjectionResult): ReportRow[] {
  return [...result.handoverEvents]
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc))
    .map((event) => [
      formatIsoShort(event.handoverAtUtc),
      event.fromSatelliteId ?? "initial acquisition",
      event.toSatelliteId,
      event.reasonKind
    ]);
}

export function stationSourceRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function stationRenderPositionCell(
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

export function stationElevationProvenanceCell(
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

export function stationTerrainSourceCell(
  sourceId: string,
  isDefault: boolean,
  note: string
): ReportCell {
  const gap = isDefault ? truthChip("Source gap", "gap", note) : "";
  return {
    html: `${escapeHtml(sourceId)}; default=${isDefault ? "yes" : "no"}${gap}`
  };
}

export function stationRfSourceCell(
  value: string | number | null,
  sourceId: string,
  note: string
): ReportCell {
  const isGap = value === null || sourceId.startsWith("unavailable");
  return {
    html: `${escapeHtml(sourceId)}${isGap ? truthChip("Source gap", "gap", note) : ""}`
  };
}

export function stationLineageRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function stationRfProfileRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function tleSourceRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function tleSelectionPolicyRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function satellitePipelineRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function tleFreshnessRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function displayTransformRows(result: RuntimeProjectionResult): ReportRow[] {
  return result.dataCompleteness.displayTransforms.map((transform) => [
    transform.sourceId,
    { html: `${escapeHtml(transform.truthClass)}${provenanceChipForTag(transform)}` },
    JSON.stringify(transform.inputSummary),
    transform.nonClaim
  ]);
}

export function atmosphericLookupRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function inventoryRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function renderModeledOutputsCards(result: RuntimeProjectionResult): string {
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

export function renderRfChainCards(result: RuntimeProjectionResult): string {
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

export function policyRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function actorRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function visibilityProvenanceRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function assumptionsAndLimitsRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function standardsReferenceRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function sourceGapRows(result: RuntimeProjectionResult): ReportRow[] {
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

export function externalEvidenceRows(): ReportRow[] {
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

export function missingEvidenceRows(): ReportRow[] {
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

export function requirementCoverageRows(result: RuntimeProjectionResult): ReportRow[] {
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
