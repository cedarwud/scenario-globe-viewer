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
    `Handover policy: TR 38.821 §7.3.2.2 + V-MO1 (${result.dataCompleteness.policyDisclosure.activePolicyId})`,
    "Rain attenuation: ITU-R P.618-14 §2.2.1.1",
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
  wrapper.dataset.tleSelectionPolicy = "true";

  const titleRow = document.createElement("div");
  titleRow.className = "v4-projection-side-panel__section-title-row";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = "TLE source summary";

  const inventory = result.dataCompleteness.runtimeInventoryDisclosure.perOrbit;
  const sourceByOrbit = new Map(
    result.dataCompleteness.tleSources.map((source) => [
      source.orbitClass,
      source
    ])
  );
  const countSummaryText = ORBIT_DISPLAY_ORDER.map((orbit) => {
    const row = inventory[orbit];
    const source = sourceByOrbit.get(orbit);
    const afterCapCount = Math.min(row.activeInventoryCount, row.runtimeCap);
    const excludedByCap = Math.max(0, row.activeInventoryCount - afterCapCount);
    const excludedByOrbitGate = Math.max(0, afterCapCount - row.acceptedRecordCount);
    const notPairVisible = Math.max(0, row.acceptedRecordCount - row.visibleActorCount);
    return `
      <p>
        <strong>${orbit}</strong>：解析後可用 ${row.activeInventoryCount} 筆；解析失敗 ${source?.parserFailureCount ?? 0} 筆。幾何排序後 cap 上限為 ${row.runtimeCap} 筆，實際進入後續流程 ${afterCapCount} 筆，因 cap 排除 ${excludedByCap} 筆。兩站軌道支援篩選後留下 ${row.acceptedRecordCount} 筆，因兩站不共同支援該軌道類別排除 ${excludedByOrbitGate} 筆。正式共同可見計算後，在目前時間窗內有 ${row.visibleActorCount} 顆衛星曾經同時可見，另有 ${notPairVisible} 筆沒有形成共同可見時間窗。來源健康狀態：${source?.health ?? "unavailable"}。
      </p>
    `;
  }).join("");
  const capPolicySummary = ORBIT_DISPLAY_ORDER.map(
    (orbit) => `${orbit} 排序後最多 ${inventory[orbit].runtimeCap} 筆`
  ).join("、");
  const sharedSupportedOrbitSummary =
    result.sharedSupportedOrbits.join("/") || "none";

  const helpPopoverId = "v4-tle-selection-policy-help";
  const helpTrigger = document.createElement("button");
  helpTrigger.type = "button";
  helpTrigger.className = "v4-projection-side-panel__source-help-trigger";
  helpTrigger.setAttribute("aria-label", "開啟 TLE 篩選條件說明");
  helpTrigger.setAttribute("aria-controls", helpPopoverId);
  helpTrigger.setAttribute("aria-expanded", "false");
  helpTrigger.title = "TLE 篩選條件說明";
  helpTrigger.textContent = "?";

  const helpPopover = document.createElement("div");
  helpPopover.id = helpPopoverId;
  helpPopover.className = "v4-projection-side-panel__source-help-popover";
  helpPopover.hidden = true;
  helpPopover.setAttribute("role", "dialog");
  helpPopover.setAttribute("aria-label", "TLE 篩選條件說明");
  helpPopover.innerHTML = `
    <header class="v4-projection-side-panel__source-help-header">
      <h4>TLE selection policy（TLE 篩選說明）</h4>
      <button type="button" class="v4-projection-side-panel__source-help-close" aria-label="關閉">&times;</button>
    </header>
    <div class="v4-projection-side-panel__source-help-body">
      <h5>資料來源</h5>
      <p>
        selected-pair 模式使用專案內已打包的 CelesTrak GP/TLE 快照。系統先把 TLE 原始行組解析成 SGP4 可以推算的軌道紀錄，再用兩站座標、仰角門檻與本次時間窗計算候選衛星。瀏覽器執行時不即時下載新的 CelesTrak catalog。
      </p>
      <h5>篩選順序</h5>
      <ol>
        <li><strong>讀取快照：</strong>讀取已打包的 CelesTrak GP/TLE snapshot。</li>
        <li><strong>解析 TLE：</strong>把 TLE 原始行組轉成 SGP4 軌道紀錄。</li>
        <li><strong>做幾何排序：</strong>針對兩站共同支援的軌道類別，先做粗略 SGP4 計算。排序依據依序是：共同可見總時長、共同可見窗數量、兩站較低仰角的最大值、單站可見總時長；仍相同時保留來源順序作為最後 tie-breaker。</li>
        <li><strong>排序後套用 cap：</strong>${capPolicySummary}。</li>
        <li><strong>保留共同支援軌道：</strong>本次兩站共同支援 ${sharedSupportedOrbitSummary}。</li>
        <li><strong>正式 runtime 計算：</strong>對排序且 capped 的候選做正式 SGP4 可見性、兩站共同可見時間窗、handover 與 link-budget 模型。本次共有 ${result.visibilityWindows.length} 個共同可見時間窗、${result.handoverEvents.length} 個服務鏈路事件、${result.communicationStats.handoverCount} 次模型判定換手。</li>
      </ol>
      <h5>本次數量</h5>
      ${countSummaryText}
      <h5>排序邊界</h5>
      <p>
        這個排序是 TLE/SGP4 共同可見幾何分數，不是通訊品質排序。TLE 本身只提供軌道元素，沒有 latency、throughput、SLA 或服務品質排名；cap 不是品質排序，前 N 筆不代表營運可用候選。若要驗證完整來源庫的正式可見性與 handover 結果，需要另外跑離線完整來源庫計算，或提高 runtime cap 後重新產生 report。
      </p>
      <p class="v4-projection-side-panel__source-help-source">
        資料過舊時，使用 npm run refresh:tle 更新 bundled TLE artifacts。完整來源表格在 Report > Sources > TLE selection policy。
      </p>
    </div>
  `;

  const returnHelpPopoverToSection = (): void => {
    if (helpPopover.parentElement !== wrapper) {
      wrapper.insertBefore(helpPopover, list);
    }
    helpPopover.classList.remove(
      "v4-projection-side-panel__source-help-popover--floating"
    );
    helpPopover.style.left = "";
    helpPopover.style.top = "";
    helpPopover.style.width = "";
  };

  const positionHelpPopoverLeftOfPanel = (): void => {
    const win = helpTrigger.ownerDocument.defaultView;
    if (!win) {
      return;
    }
    const triggerRect = helpTrigger.getBoundingClientRect();
    const panel = helpTrigger.closest(
      "[data-v4-projection-side-panel='true']"
    ) as HTMLElement | null;
    const panelRect = panel?.getBoundingClientRect();
    const panelLeft = panelRect?.left ?? triggerRect.left;
    const viewportMargin = 12;
    const viewportBottomClearance = 56;
    const panelGap = 12;
    const availableLeftWidth = Math.max(
      0,
      panelLeft - viewportMargin - panelGap
    );
    const width = Math.min(520, availableLeftWidth);
    const left = Math.max(
      viewportMargin,
      panelLeft - panelGap - width
    );
    helpPopover.style.width = `${Math.round(width)}px`;
    helpPopover.style.left = `${Math.round(left)}px`;

    const rect = helpPopover.getBoundingClientRect();
    const maxTop = Math.max(
      viewportMargin,
      win.innerHeight - rect.height - viewportBottomClearance
    );
    const top = Math.min(
      Math.max(viewportMargin, triggerRect.top - 8),
      maxTop
    );
    helpPopover.style.top = `${Math.round(top)}px`;
  };

  const setHelpOpen = (open: boolean): void => {
    if (open) {
      for (const popover of helpTrigger.ownerDocument.querySelectorAll(
        [
          ".gs-link-projection-help-popover",
          ".v4-projection-side-panel__rain-help-popover",
          ".v4-projection-side-panel__csv-help-popover",
          ".v4-projection-side-panel__source-help-popover"
        ].join(", ")
      )) {
        if (popover instanceof HTMLElement && popover !== helpPopover) {
          popover.hidden = true;
        }
      }
      helpTrigger.ownerDocument.body.appendChild(helpPopover);
      helpPopover.classList.add(
        "v4-projection-side-panel__source-help-popover--floating"
      );
      helpPopover.hidden = false;
      helpTrigger.setAttribute("aria-expanded", "true");
      positionHelpPopoverLeftOfPanel();
      return;
    }
    returnHelpPopoverToSection();
    helpPopover.hidden = !open;
    helpTrigger.setAttribute("aria-expanded", "false");
  };

  helpTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setHelpOpen(Boolean(helpPopover.hidden));
  });
  helpPopover
    .querySelector<HTMLButtonElement>(".v4-projection-side-panel__source-help-close")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setHelpOpen(false);
      helpTrigger.focus();
    });

  titleRow.append(heading, helpTrigger);

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const source of result.dataCompleteness.tleSources) {
    const li = document.createElement("li");
    li.textContent =
      `${source.sourceId} · ${source.orbitClass} · ${source.health} · ` +
      `${source.acceptedRecordCount} accepted / ${source.rejectedRecordCount} rejected`;
    list.append(li);
  }
  wrapper.append(titleRow, helpPopover, list);
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
