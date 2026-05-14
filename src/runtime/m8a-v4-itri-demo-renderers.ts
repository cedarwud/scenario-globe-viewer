import { M8A_V4_GROUND_STATION_RUNTIME_PROJECTION } from "./m8a-v4-ground-station-projection";
import { M8A_V46E_TIMELINE_LABELS } from "./m8a-v4-product-ux-model";
import {
  M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_LAYER_PAIRS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_STATUS_PAIRS,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION,
  M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS,
  M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT,
  M8A_V4_CUSTOMER_F09_METRIC_TRUTH,
  M8A_V4_CUSTOMER_F09_PROVENANCE,
  M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F10_POLICY_PRESETS,
  M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F11_RULE_PRESETS,
  M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS,
  M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT,
  M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC,
  M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS,
  resolveF09RateClassCopy,
  type M8aV4F09RateWindowRow,
  type M8aV4ItriF11RulePreset
} from "./m8a-v4-itri-demo-surfaces";

export function escapeM8aV411MetricText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderItriRequirementGapGroups(): string {
  return M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS.map((group) => {
    const groupId = escapeM8aV411MetricText(group.groupId);
    const label = escapeM8aV411MetricText(group.label);
    const disposition = escapeM8aV411MetricText(group.disposition);
    const status = escapeM8aV411MetricText(group.status);
    const requirementIds = escapeM8aV411MetricText(
      group.requirementIds.join("|")
    );
    const visibleRequirementIds = escapeM8aV411MetricText(
      group.requirementIds.length > 0 ? group.requirementIds.join(" ") : "none"
    );
    const routeClaim = escapeM8aV411MetricText(group.routeClaim);

    return [
      `<li class="m8a-v411-requirement-gap__item"`,
      ` data-itri-requirement-gap-group="true"`,
      ` data-itri-requirement-gap-group-id="${groupId}"`,
      ` data-itri-requirement-gap-status="${status}"`,
      ` data-itri-requirement-gap-disposition="${disposition}"`,
      ` data-itri-requirement-gap-requirement-ids="${requirementIds}">`,
      `<div class="m8a-v411-requirement-gap__item-header">`,
      `<strong>${label}</strong>`,
      `<span class="m8a-v411-requirement-gap__status">${status}</span>`,
      `</div>`,
      `<span class="m8a-v411-requirement-gap__ids">${visibleRequirementIds}</span>`,
      `<small>${routeClaim}</small>`,
      `</li>`
    ].join("");
  }).join("");
}

export function renderItriAcceptanceCoverageItems(): string {
  return M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS.map((record) => {
    const requirementId = escapeM8aV411MetricText(record.requirementId);
    const layer = escapeM8aV411MetricText(record.primaryLayer);
    const status = escapeM8aV411MetricText(record.status);
    const disposition = escapeM8aV411MetricText(record.disposition);
    const surface = escapeM8aV411MetricText(record.surface);
    const routeReality = escapeM8aV411MetricText(record.routeReality);
    const evidenceBoundary = escapeM8aV411MetricText(record.evidenceBoundary);

    return [
      `<li class="m8a-v411-acceptance-layer__item"`,
      ` data-itri-acceptance-requirement="true"`,
      ` data-itri-acceptance-requirement-id="${requirementId}"`,
      ` data-itri-acceptance-primary-layer="${layer}"`,
      ` data-itri-acceptance-status="${status}"`,
      ` data-itri-acceptance-disposition="${disposition}"`,
      ` data-itri-acceptance-surface="${surface}">`,
      `<div class="m8a-v411-acceptance-layer__item-head">`,
      `<strong>${requirementId}</strong>`,
      `<span>${status}</span>`,
      `</div>`,
      `<p>${routeReality}</p>`,
      `<small>${evidenceBoundary}</small>`,
      `</li>`
    ].join("");
  }).join("");
}

function countRouteOrbitActors(): Record<"leo" | "meo" | "geo" | "total", number> {
  const counts = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.reduce(
    (nextCounts, actor) => ({
      ...nextCounts,
      [actor.orbitClass]: nextCounts[actor.orbitClass] + 1,
      total: nextCounts.total + 1
    }),
    { leo: 0, meo: 0, geo: 0, total: 0 }
  );

  return counts;
}

function renderItriF13ScaleReadinessKnownGaps(): string {
  return M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS.map((gap) => {
    return `<li data-itri-f13-scale-readiness-known-gap="true">${escapeM8aV411MetricText(gap)}</li>`;
  }).join("");
}

function renderItriF13ScaleReadinessNonClaims(): string {
  return M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS.map((claim) => {
    return `<span data-itri-f13-scale-readiness-non-claim="true">${escapeM8aV411MetricText(claim)}</span>`;
  }).join("");
}

export function renderItriF13ScaleReadinessSurface(): string {
  const routeCounts = countRouteOrbitActors();
  const readinessCounts = M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS;
  const targetReached =
    readinessCounts.leo >=
    M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT;

  return `
              <section class="m8a-v411-f13-scale-readiness" data-itri-f13-scale-readiness-surface="true" data-itri-f13-scale-readiness-version="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION}" data-itri-f13-scale-readiness-target-leo-count="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT}" data-itri-f13-scale-readiness-target-reached="${String(targetReached)}" data-itri-f13-scale-readiness-current-route-actor-count="${routeCounts.total}" data-itri-f13-scale-readiness-current-route-leo-count="${routeCounts.leo}" data-itri-f13-scale-readiness-actor-count="${readinessCounts.total}" data-itri-f13-scale-readiness-leo-count="${readinessCounts.leo}" data-itri-f13-scale-readiness-meo-count="${readinessCounts.meo}" data-itri-f13-scale-readiness-geo-count="${readinessCounts.geo}" data-itri-f13-scale-readiness-source-type="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE}" data-itri-f13-scale-readiness-source-mode="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE}" data-itri-f13-scale-readiness-source-url="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL}" data-itri-f13-scale-readiness-public-source-used="${String(M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED)}" data-itri-f13-scale-readiness-built-at-utc="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC}" data-itri-f13-scale-readiness-freshness-timestamp-utc="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC}" data-itri-f13-scale-readiness-closure-claimed="false" aria-labelledby="m8a-v411-f13-scale-readiness-heading">
                <div class="m8a-v411-f13-scale-readiness__header">
                  <span data-m8a-v48-info-class="fixed">F-13</span>
                  <strong id="m8a-v411-f13-scale-readiness-heading" data-m8a-v48-info-class="fixed">Scale Readiness</strong>
                  <small data-m8a-v48-info-class="fixed">fixture/model-backed · not external validation closure</small>
                </div>
                <div class="m8a-v411-f13-scale-readiness__stats" aria-label="F-13 scale readiness counts">
                  <p data-itri-f13-scale-readiness-stat="route-actors"><span>Current route actors</span><strong>${routeCounts.total}</strong><small>${routeCounts.leo} LEO / ${routeCounts.meo} MEO / ${routeCounts.geo} GEO</small></p>
                  <p data-itri-f13-scale-readiness-stat="readiness-actors"><span>Readiness fixture actors</span><strong>${readinessCounts.total}</strong><small>${readinessCounts.leo} LEO / ${readinessCounts.meo} MEO / ${readinessCounts.geo} GEO</small></p>
                  <p data-itri-f13-scale-readiness-stat="target"><span>&gt;=500 LEO readiness target</span><strong>${targetReached ? "reached" : "not reached"}</strong><small>${readinessCounts.leo} / ${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT} LEO</small></p>
                </div>
                <dl class="m8a-v411-f13-scale-readiness__meta">
                  <div><dt>Data/source type</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE}</dd></div>
                  <div><dt>Source mode</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE}</dd></div>
                  <div><dt>Source URL</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL}</dd></div>
                  <div><dt>Source input</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL}</dd></div>
                  <div><dt>Built at</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC}</dd></div>
                  <div><dt>Freshness timestamp</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC}</dd></div>
                  <div><dt>License/freshness notes</dt><dd>${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES} ${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES}</dd></div>
                </dl>
                <p class="m8a-v411-f13-scale-readiness__boundary" data-itri-f13-scale-readiness-boundary="true" data-m8a-v48-info-class="disclosure">This is a route-native readiness/demo surface. It is not external validation closure, not customer authority, not an active satellite/gateway/path claim, and not measured network truth.</p>
                <ul class="m8a-v411-f13-scale-readiness__known-gaps">
                  ${renderItriF13ScaleReadinessKnownGaps()}
                </ul>
                <div class="m8a-v411-f13-scale-readiness__non-claims" data-itri-f13-scale-readiness-non-claims="true" hidden>
                  ${renderItriF13ScaleReadinessNonClaims()}
                </div>
              </section>`;
}

export function renderItriAcceptanceLayer(): string {
  const requirementIds = escapeM8aV411MetricText(
    M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS.join("|")
  );
  const requirementStatuses = escapeM8aV411MetricText(
    M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_STATUS_PAIRS.join("|")
  );
  const requirementLayers = escapeM8aV411MetricText(
    M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_LAYER_PAIRS.join("|")
  );
  const externalFailIds = escapeM8aV411MetricText(
    M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS.join("|")
  );
  const boundedRouteIds = escapeM8aV411MetricText(
    M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS.join("|")
  );

  const routeCounts = countRouteOrbitActors();
  const readinessCounts = M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS;
  const f13TargetReached =
    readinessCounts.leo >=
    M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT;

  return `
            <section class="m8a-v411-acceptance-layer" data-itri-demo-l2-acceptance-layer="true" data-itri-demo-l2-version="${M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION}" data-itri-demo-l2-layer-id="${M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID}" data-itri-demo-l2-requirement-ids="${requirementIds}" data-itri-demo-l2-requirement-statuses="${requirementStatuses}" data-itri-demo-l2-requirement-layers="${requirementLayers}" data-itri-demo-l2-external-fail-ids="${externalFailIds}" data-itri-demo-l2-bounded-route-ids="${boundedRouteIds}" data-itri-demo-l2-f13-artifact="${M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT}" data-itri-demo-l2-f13-fresh-until-utc="${M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC}" data-itri-demo-l2-f13-route-native-scale-claimed="false" data-itri-demo-l2-f13-scale-readiness-version="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION}" data-itri-demo-l2-f13-scale-readiness-target-reached="${String(f13TargetReached)}" data-itri-demo-l2-f13-scale-readiness-current-route-actor-count="${routeCounts.total}" data-itri-demo-l2-f13-scale-readiness-actor-count="${readinessCounts.total}" data-itri-demo-l2-f13-scale-readiness-leo-count="${readinessCounts.leo}" data-itri-demo-l2-f13-scale-readiness-target-leo-count="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT}" data-itri-demo-l2-f13-scale-readiness-source-type="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE}" data-itri-demo-l2-f13-scale-readiness-source-url="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL}" data-itri-demo-l2-f13-scale-readiness-public-source-used="${String(M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED)}" data-itri-demo-l2-f13-scale-readiness-built-at-utc="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC}" data-itri-demo-l2-f13-scale-readiness-freshness-timestamp-utc="${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC}" data-itri-demo-l2-f13-scale-readiness-closure-claimed="false" data-itri-demo-l2-external-validation-artifact="${M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT}" data-itri-demo-l2-external-validation-status="${M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS}" aria-labelledby="m8a-v411-acceptance-layer-heading">
              <div class="m8a-v411-acceptance-layer__header">
                <span data-m8a-v48-info-class="fixed">L2</span>
                <strong id="m8a-v411-acceptance-layer-heading" data-m8a-v48-info-class="fixed">Acceptance Evidence</strong>
                <small data-m8a-v48-info-class="fixed">All customer IDs mapped; route-local truth only</small>
              </div>
              <p class="m8a-v411-acceptance-layer__lead" data-m8a-v48-info-class="disclosure">This layer separates the V4 route-local demo closure from external validation, Phase 7.1 scale evidence, DUT/ESTNeT/INET/NAT/tunnel gaps, and bounded route representations.</p>
              <div class="m8a-v411-acceptance-layer__boundary" aria-label="Critical acceptance boundaries">
                <article data-itri-demo-l2-boundary-card="f13">
                  <span data-m8a-v48-info-class="fixed">F-13</span>
                  <strong data-m8a-v48-info-class="fixed">Route-native readiness surface</strong>
                  <p data-m8a-v48-info-class="disclosure">${readinessCounts.leo} LEO / ${readinessCounts.total} total fixture/model-backed scale points; &gt;=500 LEO readiness target reached in route runtime. Not external validation closure.</p>
                  <small data-m8a-v48-info-class="fixed">built ${M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC}</small>
                </article>
                <article data-itri-demo-l2-boundary-card="v02-v06">
                  <span data-m8a-v48-info-class="fixed">V-02..V-06</span>
                  <strong data-m8a-v48-info-class="fixed">Explicit external fail/gap</strong>
                  <p data-m8a-v48-info-class="disclosure">Windows/WSL, tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, and physical DUT/NE-ONE have no retained pass evidence.</p>
                  <small data-m8a-v48-info-class="fixed">${M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS}</small>
                </article>
                <article data-itri-demo-l2-boundary-card="bounded-route">
                  <span data-m8a-v48-info-class="fixed">F-09/F-10/F-11/F-16</span>
                  <strong data-m8a-v48-info-class="fixed">Bounded route representation</strong>
                  <p data-m8a-v48-info-class="disclosure">Modeled rate class, preset controls, bounded rules, and JSON export are demonstrable route state, not measured traffic, live control, full editor, or external report truth.</p>
                  <small data-m8a-v48-info-class="fixed">bounded-route-representation</small>
                </article>
              </div>
              ${renderItriF13ScaleReadinessSurface()}
              <ol class="m8a-v411-acceptance-layer__coverage" data-itri-demo-l2-coverage-list="true">
                ${renderItriAcceptanceCoverageItems()}
              </ol>
            </section>`;
}

export function renderF16ExplicitNonClaimChips(): string {
  return M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS.map((claim) => {
    return `<span data-itri-f16-export-non-claim="true">${escapeM8aV411MetricText(claim)}</span>`;
  }).join("");
}

export function renderItriF10PolicyPresetOptions(): string {
  return M8A_V4_CUSTOMER_F10_POLICY_PRESETS.map((preset) => {
    const presetId = escapeM8aV411MetricText(preset.presetId);
    const label = escapeM8aV411MetricText(preset.label);
    const summary = escapeM8aV411MetricText(preset.summary);
    const selected =
      preset.presetId === M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID
        ? " selected"
        : "";

    return `<option value="${presetId}" title="${summary}"${selected}>${label}</option>`;
  }).join("");
}

export function renderItriF11RulePresetOptions(): string {
  return M8A_V4_CUSTOMER_F11_RULE_PRESETS.map((preset) => {
    const presetId = escapeM8aV411MetricText(preset.presetId);
    const label = escapeM8aV411MetricText(preset.label);
    const summary = escapeM8aV411MetricText(preset.summary);
    const selected =
      preset.presetId === M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID
        ? " selected"
        : "";

    return `<option value="${presetId}" title="${summary}"${selected}>${label}</option>`;
  }).join("");
}

export function renderItriF11RuleParameterChips(
  preset: M8aV4ItriF11RulePreset
): string {
  return preset.parameterChips.map((chip) => {
    return `<li data-itri-f11-rule-parameter-chip="true">${escapeM8aV411MetricText(chip)}</li>`;
  }).join("");
}

function resolveF09StateOrdinalLabel(
  timeline: typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline,
  windowId: string
): string {
  const stateCount = timeline.length;
  const zeroBasedIndex = timeline.findIndex((windowDefinition) => {
    return windowDefinition.windowId === windowId;
  });
  const stateIndex = zeroBasedIndex >= 0 ? zeroBasedIndex + 1 : 1;

  return `State ${stateIndex} of ${stateCount}`;
}

export function buildF09RateWindowRows(): ReadonlyArray<M8aV4F09RateWindowRow> {
  const timeline =
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline;

  return timeline.map((windowDefinition) => {
    const ordinalLabel = resolveF09StateOrdinalLabel(
      timeline,
      windowDefinition.windowId
    );
    const classCopy = resolveF09RateClassCopy(
      windowDefinition.boundedMetricClasses.networkSpeedClass
    );

    return {
      windowId: windowDefinition.windowId,
      ordinalLabel,
      windowLabel: M8A_V46E_TIMELINE_LABELS[windowDefinition.windowId],
      orbitClass: windowDefinition.displayRepresentativeOrbitClass,
      networkSpeedClass: windowDefinition.boundedMetricClasses.networkSpeedClass,
      classLabel: classCopy.classLabel,
      bucketLabel: classCopy.bucketLabel,
      provenance: M8A_V4_CUSTOMER_F09_PROVENANCE,
      metricTruth: M8A_V4_CUSTOMER_F09_METRIC_TRUTH
    };
  });
}

export function renderF09RateWindowRows(): string {
  return buildF09RateWindowRows()
    .map((row) => {
      const windowId = escapeM8aV411MetricText(row.windowId);
      const ordinalLabel = escapeM8aV411MetricText(row.ordinalLabel);
      const windowLabel = escapeM8aV411MetricText(row.windowLabel);
      const orbitClass = escapeM8aV411MetricText(row.orbitClass.toUpperCase());
      const networkSpeedClass = escapeM8aV411MetricText(row.networkSpeedClass);
      const classLabel = escapeM8aV411MetricText(row.classLabel);
      const bucketLabel = escapeM8aV411MetricText(row.bucketLabel);
      const provenance = escapeM8aV411MetricText(row.provenance);
      const metricTruth = escapeM8aV411MetricText(row.metricTruth);

      return [
        `<tr data-itri-f09-rate-row="true"`,
        ` data-itri-f09-rate-window-id="${windowId}"`,
        ` data-itri-f09-rate-class="${networkSpeedClass}"`,
        ` data-itri-f09-rate-orbit="${row.orbitClass}">`,
        `<td>${ordinalLabel}</td>`,
        `<td>${windowLabel}</td>`,
        `<td>${orbitClass}</td>`,
        `<td>${classLabel}</td>`,
        `<td>${bucketLabel}</td>`,
        `<td>${provenance}</td>`,
        `<td>${metricTruth}</td>`,
        `</tr>`
      ].join("");
    })
    .join("");
}
