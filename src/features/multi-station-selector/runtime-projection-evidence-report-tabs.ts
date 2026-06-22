// Evidence-report tab assemblers — the seven non-audit per-tab HTML builders
// (summary / visibility / requirements / handover / sources / models / runtime).
// Composes the data rows + html-helpers; the Audit tab lives in -audit.ts.
// Behavior guarded by the byte-exact golden.
import { type RuntimeProjectionResult } from "./runtime-projection";
import {
  escapeHtml,
  durationMs,
  formatDurationMs,
  formatIsoShort,
  table,
  kvTable,
  list,
  sourceIssueMarker,
  evidenceDetailPanel,
  truthChip,
  provenanceChipForTier,
  lineagePanel,
  fieldGuide,
  stackedFieldGuide,
  evidenceCardDetailed,
  callout
} from "./runtime-projection-evidence-report-html-helpers";
import {
  orbitDurationRows,
  visibilityRows,
  handoverRows,
  stationSourceRows,
  stationLineageRows,
  stationRfProfileRows,
  tleSourceRows,
  tleSelectionPolicyRows,
  satellitePipelineRows,
  tleFreshnessRows,
  displayTransformRows,
  atmosphericLookupRows,
  inventoryRows,
  renderModeledOutputsCards,
  renderRfChainCards,
  policyRows,
  actorRows,
  visibilityProvenanceRows,
  assumptionsAndLimitsRows,
  standardsReferenceRows,
  sourceGapRows,
  externalEvidenceRows,
  missingEvidenceRows,
  requirementCoverageRows
} from "./runtime-projection-evidence-report-rows";

export function buildSummaryTab(result: RuntimeProjectionResult): string {
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

export function buildVisibilityTab(result: RuntimeProjectionResult): string {
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

export function buildRequirementsTab(result: RuntimeProjectionResult): string {
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

export function buildHandoverTab(result: RuntimeProjectionResult): string {
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

export function buildSourcesTab(result: RuntimeProjectionResult): string {
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

export function buildModelsTab(result: RuntimeProjectionResult): string {
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

export function buildRuntimeTab(result: RuntimeProjectionResult): string {
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
