import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  connectCdp,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "../tests/smoke/bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "../tests/smoke/bootstrap-smoke-server.mjs";
import {
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  writeJsonArtifact
} from "../tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const requestPath = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const outputRoot = path.join(
  repoRoot,
  "output",
  "itri-v4-demo-redesign-phase5-reviewer-evidence",
  new Date().toISOString()
);

const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "390x844", width: 390, height: 844 }
];

const layers = [
  { key: "default-l0", label: "Default L0", action: "default" },
  { key: "details-l1", label: "Details / L1", action: "details" },
  { key: "evidence-l2", label: "Evidence / L2", action: "evidence" }
];

const expectedExternalFailIds = ["V-02", "V-03", "V-04", "V-05", "V-06"];
const expectedBoundedRouteIds = ["F-09", "F-10", "F-11", "F-16"];
const expectedExternalValidationStatus = "explicit-fail-no-retained-pass";
const f13FreshUntilUtc = "2026-05-25T16:43:23.879Z";
const forbiddenPositiveClaims = [
  "完整驗證",
  "完整多軌道驗證",
  "完整 ≥500",
  "外部驗測完成",
  "全部需求完成",
  "所有需求完成",
  "measured throughput passed",
  "live iperf",
  "live ping",
  "external report truth ready"
];

const browserArgs = ["--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function relativeArtifact(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function normalizeScanText(value) {
  return String(value ?? "").toLocaleLowerCase("en-US");
}

function assertNoForbiddenPositiveClaims(value, label) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const normalizedText = normalizeScanText(text);
  const hits = forbiddenPositiveClaims.filter((claim) =>
    normalizedText.includes(normalizeScanText(claim))
  );

  assert(
    hits.length === 0,
    `${label} contains forbidden positive claim(s): ${hits.join(", ")}`
  );
}

function assertExactSet(actual, expected, label) {
  const actualList = Array.isArray(actual) ? actual : [];
  const actualSet = [...new Set(actualList)].sort();
  const expectedSet = [...new Set(expected)].sort();

  assert(
    actualList.length === actualSet.length,
    `${label} contains duplicate value(s): ${JSON.stringify(actualList)}`
  );
  assert(
    JSON.stringify(actualSet) === JSON.stringify(expectedSet),
    `${label} changed: expected ${JSON.stringify(expectedSet)}, received ${JSON.stringify(actualSet)}`
  );
}

function expectedMatrixKeys() {
  return viewports.flatMap((viewport) =>
    layers.map((layer) => `${viewport.name}::${layer.key}`)
  );
}

function assertCaptureMatrixComplete(inspections, screenshots) {
  const expectedCount = 9;

  assert(
    viewports.length === 3 && layers.length === 3,
    `Phase 5 capture must remain a 3x3 viewport/layer matrix; received ${viewports.length}x${layers.length}`
  );
  assert(
    inspections.length === expectedCount,
    `Expected ${expectedCount} runtime inspections, received ${inspections.length}`
  );
  assert(
    screenshots.length === expectedCount,
    `Expected ${expectedCount} screenshots, received ${screenshots.length}`
  );

  const expected = expectedMatrixKeys();
  const inspectKeys = inspections.map((item) => `${item.viewport}::${item.layerKey}`);
  const screenshotKeys = screenshots.map((item) => `${item.viewport}::${item.layerKey}`);

  assertExactSet(inspectKeys, expected, "runtime inspection matrix");
  assertExactSet(screenshotKeys, expected, "screenshot matrix");
}

function assertCanonicalRoutes(inspections) {
  const mismatches = inspections.filter(
    (item) => item.inspection.route !== requestPath
  );

  assert(
    mismatches.length === 0,
    `Every runtime inspection must use the canonical route ${requestPath}: ${JSON.stringify(mismatches)}`
  );
}

function assertChecklistPasses(checklist) {
  const failedItems = checklist.filter((item) => item.result !== true);

  assert(
    failedItems.length === 0,
    `First-read checklist has failing item(s): ${JSON.stringify(failedItems)}`
  );
}

function assertL2ExternalFailGapPreserved(inspections) {
  const evidenceInspections = inspections.filter(
    (item) => item.layerKey === "evidence-l2"
  );

  assert(
    evidenceInspections.length === viewports.length,
    `Expected ${viewports.length} L2 inspections, received ${evidenceInspections.length}`
  );

  for (const item of evidenceInspections) {
    const inspection = item.inspection;
    const requirementItemsById = new Map(
      inspection.acceptanceLayer.requirementItems.map((requirementItem) => [
        requirementItem.id,
        requirementItem
      ])
    );

    assertExactSet(
      inspection.documentDataset.externalFailIds,
      expectedExternalFailIds,
      `${item.viewport} document V-02..V-06 external fail IDs`
    );
    assertExactSet(
      inspection.acceptanceLayer.externalFailIds,
      expectedExternalFailIds,
      `${item.viewport} L2 V-02..V-06 external fail IDs`
    );
    assertExactSet(
      inspection.documentDataset.boundedRouteIds,
      expectedBoundedRouteIds,
      `${item.viewport} document bounded route representation IDs`
    );
    assertExactSet(
      inspection.acceptanceLayer.boundedRouteIds,
      expectedBoundedRouteIds,
      `${item.viewport} L2 bounded route representation IDs`
    );
    assert(
      inspection.documentDataset.externalValidationStatus ===
        expectedExternalValidationStatus &&
        inspection.acceptanceLayer.externalValidationStatus ===
          expectedExternalValidationStatus,
      `${item.viewport} L2 external validation status changed: ${JSON.stringify({
        document: inspection.documentDataset.externalValidationStatus,
        layer: inspection.acceptanceLayer.externalValidationStatus
      })}`
    );

    for (const id of expectedExternalFailIds) {
      const requirementItem = requirementItemsById.get(id);

      assert(
        requirementItem?.status === "external-fail" &&
          requirementItem?.disposition === "external-validation-fail",
        `${item.viewport} ${id} must remain explicit external fail/gap: ${JSON.stringify(requirementItem)}`
      );
    }

    for (const id of expectedBoundedRouteIds) {
      const requirementItem = requirementItemsById.get(id);

      assert(
        requirementItem?.status === "bounded" &&
          requirementItem?.disposition === "bounded-route-representation",
        `${item.viewport} ${id} must remain a bounded route representation: ${JSON.stringify(requirementItem)}`
      );
    }
  }
}

function assertF13RouteNativeScaleClaimedFalse(inspections, manifest = null) {
  for (const item of inspections) {
    assert(
      item.inspection.documentDataset.f13RouteNativeScaleClaimed === "false",
      `${item.viewport} ${item.layerKey} document F-13 route-native scale claim must be false: ${JSON.stringify(item.inspection.documentDataset)}`
    );

    if (item.layerKey === "evidence-l2") {
      assert(
        item.inspection.acceptanceLayer.f13RouteNativeScaleClaimed === "false",
        `${item.viewport} L2 F-13 route-native scale claim must be false: ${JSON.stringify(item.inspection.acceptanceLayer)}`
      );
    }
  }

  if (manifest) {
    assert(
      manifest.truthBoundary.f13.routeNativeScaleClaimed === false,
      `Manifest F-13 route-native scale claim must be false: ${JSON.stringify(manifest.truthBoundary.f13)}`
    );
  }
}

function assertGeneratedArtifactsHaveNoForbiddenClaims(artifactPaths) {
  for (const artifactPath of artifactPaths) {
    assertNoForbiddenPositiveClaims(
      readFileSync(artifactPath, "utf8"),
      relativeArtifact(artifactPath)
    );
  }
}

async function waitForRouteReady(client, viewport) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const doc = document.documentElement;
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");

        return {
          bootstrapState: doc?.dataset.bootstrapState ?? null,
          scenePreset: doc?.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasSceneState: Boolean(state),
          viewportClass: state?.productUx?.layout?.viewportClass ?? null,
          defaultVersion: root?.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          acceptanceVersion: root?.dataset.m8aV4ItriDemoViewAcceptanceLayer ?? null,
          narrowVersion: root?.dataset.m8aV4ItriDemoViewNarrow ?? null
        };
      })()`
    );

    const ready =
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasSceneState &&
      lastState?.defaultVersion === "itri-demo-view-default-focus-runtime.v1" &&
      lastState?.acceptanceVersion === "itri-demo-view-acceptance-layer-runtime.v1";

    const narrowReady =
      viewport.width > 480 ||
      lastState?.viewportClass === "narrow" ||
      lastState?.narrowVersion === "itri-demo-view-narrow-runtime.v1";

    if (ready && narrowReady) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`customer route did not become ready: ${JSON.stringify(lastState)}`);
}

async function navigateFresh(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${requestPath}` });
  await waitForRouteReady(client, viewport);
  await waitForGlobeReady(client, `Phase 5 ${viewport.name}`);
  await evaluateRuntimeValue(
    client,
    `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.pause?.()`
  );
  await sleep(500);
}

async function clickLayerControl(client, action) {
  if (action === "default") {
    return;
  }

  const selector =
    action === "evidence"
      ? "[data-m8a-v47-control-id='evidence-toggle']"
      : "[data-m8a-v47-control-id='details-toggle']";

  let lastState = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `((selector, action) => {
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");
        const control = root?.querySelector(selector);
        const sheet = root?.querySelector("[data-m8a-v48-inspector='true']");
        const panel = root?.querySelector(
          action === "evidence"
            ? "[data-m8a-v411-inspector-panel='evidence']"
            : "[data-m8a-v411-inspector-panel='decision']"
        );
        const layer = root?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
        const isVisible = (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            !element.hidden &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            rect.width > 1 &&
            rect.height > 1
          );
        };

        if (control instanceof HTMLButtonElement && sheet?.hidden) {
          control.click();
        }

        return {
          clicked: control instanceof HTMLButtonElement,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          activeTab: root?.dataset.m8aV411InspectorActiveTab ?? null,
          panelVisible: isVisible(panel),
          layerVisible: isVisible(layer),
          evidenceExpanded:
            root?.querySelector("[data-m8a-v47-control-id='evidence-toggle']")
              ?.getAttribute("aria-expanded") ?? null,
          detailsExpanded:
            root?.querySelector("[data-m8a-v47-control-id='details-toggle']")
              ?.getAttribute("aria-expanded") ?? null
        };
      })(${JSON.stringify(selector)}, ${JSON.stringify(action)})`
    );

    const expectedTab = action === "evidence" ? "evidence" : "decision";
    if (
      lastState?.clicked &&
      lastState?.sheetHidden === false &&
      lastState?.activeTab === expectedTab &&
      lastState?.panelVisible &&
      (action !== "evidence" || lastState?.layerVisible)
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`${action} layer did not open: ${JSON.stringify(lastState)}`);
}

async function inspectLayer(client) {
  await evaluateRuntimeValue(client, `document.fonts.ready.then(() => true)`, {
    awaitPromise: true
  });

  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const toList = (value) => String(value ?? "").split("|").filter(Boolean);
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          !element.hidden &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 1 &&
          rect.height > 1 &&
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= window.innerHeight &&
          rect.left <= window.innerWidth
        );
      };
      const text = (selector) => normalize(root?.querySelector(selector)?.textContent);
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const sheet = root?.querySelector("[data-m8a-v48-inspector='true']");
      const acceptanceLayer = root?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
      const requirementItems = Array.from(
        acceptanceLayer?.querySelectorAll("[data-itri-acceptance-requirement='true']") ?? []
      ).map((item) => ({
        id: item.dataset.itriAcceptanceRequirementId ?? null,
        status: item.dataset.itriAcceptanceStatus ?? null,
        disposition: item.dataset.itriAcceptanceDisposition ?? null
      }));

      return {
        route: window.location.pathname + window.location.search,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        documentDataset: {
          defaultLayer:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultLayer ?? null,
          inspectorOpen:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null,
          acceptanceVisible:
            document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceVisible ?? null,
          externalFailIds:
            toList(document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceExternalFailIds),
          boundedRouteIds:
            toList(document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceBoundedRouteIds),
          f13FreshUntilUtc:
            document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceF13FreshUntilUtc ?? null,
          f13RouteNativeScaleClaimed:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceF13RouteNativeScaleClaimed ?? null,
          externalValidationStatus:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceExternalValidationStatus ?? null
        },
        productDataset: {
          defaultLayer: root?.dataset.m8aV4ItriDemoViewDefaultLayer ?? null,
          inspectorOpen: root?.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null,
          activeTab: root?.dataset.m8aV411InspectorActiveTab ?? null,
          acceptanceVisible: root?.dataset.m8aV4ItriDemoViewAcceptanceVisible ?? null,
          viewportClass: root?.dataset.viewportClass ?? null
        },
        visible: {
          l0Briefing: isVisible(root?.querySelector("[data-itri-demo-l0-briefing-card='true']")),
          detailsButton: isVisible(root?.querySelector("[data-m8a-v47-control-id='details-toggle']")),
          evidenceButton: isVisible(root?.querySelector("[data-m8a-v47-control-id='evidence-toggle']")),
          sheet: isVisible(sheet),
          l2Acceptance: isVisible(acceptanceLayer)
        },
        copy: {
          scenario:
            text("[data-m8a-v411-top-strip='true']") ||
            text("[data-m8a-v47-control-strip='true']"),
          currentState: text("[data-itri-demo-l0-current-state='true']"),
          currentReason: text("[data-itri-demo-l0-current-reason='true']"),
          activeOrbit: text("[data-itri-demo-l0-active-orbit='true']"),
          modeledRate: text("[data-itri-demo-l0-rate-class='true']"),
          nextCandidate: text("[data-itri-demo-l0-next-state='true']"),
          truthBoundary: text("[data-itri-demo-l0-truth-boundary='true']"),
          sequenceActive: text("[data-m8a-v410-sequence-active-summary='true']"),
          sequenceNext: text("[data-m8a-v410-sequence-next-summary='true']"),
          inspectorTitle: text("[data-m8a-v410-inspector-title='true']"),
          acceptanceHeading: text("[data-itri-demo-l2-acceptance-layer='true'] h3")
        },
        acceptanceLayer: {
          requirementCount: requirementItems.length,
          externalFailIds:
            toList(acceptanceLayer?.dataset.itriDemoL2ExternalFailIds),
          boundedRouteIds:
            toList(acceptanceLayer?.dataset.itriDemoL2BoundedRouteIds),
          f13FreshUntilUtc:
            acceptanceLayer?.dataset.itriDemoL2F13FreshUntilUtc ?? null,
          f13RouteNativeScaleClaimed:
            acceptanceLayer?.dataset.itriDemoL2F13RouteNativeScaleClaimed ?? null,
          externalValidationStatus:
            acceptanceLayer?.dataset.itriDemoL2ExternalValidationStatus ?? null,
          requirementItems
        }
      };
    })()`
  );
}

function evaluateChecklist(inspections) {
  const defaults = inspections.filter((item) => item.layerKey === "default-l0");
  const evidence = inspections.filter((item) => item.layerKey === "evidence-l2");

  const everyDefault = (predicate) => defaults.every((item) => predicate(item.inspection));
  const everyEvidence = (predicate) => evidence.every((item) => predicate(item.inspection));

  return [
    {
      item: "Can reviewer identify scenario?",
      result: everyDefault((inspection) => inspection.copy.scenario.length > 0),
      evidence: "L0 context strip is visible in every viewport."
    },
    {
      item: "Can reviewer identify current state?",
      result: everyDefault((inspection) => inspection.copy.currentState.length > 0),
      evidence: "L0 current-state text is present in every viewport."
    },
    {
      item: "Can reviewer identify active orbit/service path?",
      result: everyDefault((inspection) =>
        inspection.copy.activeOrbit.includes("Active orbit:")
      ),
      evidence: "L0 active-orbit row is present in every viewport."
    },
    {
      item: "Can reviewer identify next candidate?",
      result: everyDefault((inspection) => inspection.copy.nextCandidate.length > 0),
      evidence: "L0 next-candidate row is present in every viewport."
    },
    {
      item: "Can reviewer distinguish modeled vs measured?",
      result: everyDefault(
        (inspection) =>
          inspection.copy.modeledRate.includes("Modeled rate:") &&
          inspection.copy.truthBoundary ===
            "Modeled route review; no live traffic metric."
      ),
      evidence: "L0 uses modeled-rate language and a no-live-traffic line."
    },
    {
      item: "Can reviewer find which customer requirements remain external?",
      result: everyEvidence(
        (inspection) =>
          expectedExternalFailIds.every((id) =>
            inspection.acceptanceLayer.externalFailIds.includes(id)
          ) &&
          inspection.acceptanceLayer.externalValidationStatus ===
            expectedExternalValidationStatus
      ),
      evidence: "L2 Evidence carries explicit V-02 to V-06 external fail/gap status."
    }
  ];
}

function writeMarkdownArtifacts(outputDir, manifest, checklist) {
  const screenshotRows = manifest.screenshots
    .map(
      (item) =>
        `| ${item.viewport} | ${item.layerLabel} | \`${item.path}\` |`
    )
    .join("\n");

  const checklistRows = checklist
    .map(
      (item) =>
        `| ${item.item} | ${item.result ? "Pass" : "Fail"} | ${item.evidence} |`
    )
    .join("\n");

  const checklistPath = path.join(outputDir, "first-read-checklist.md");
  writeFileSync(
    checklistPath,
    [
      "# Phase 5 First-Read Checklist",
      "",
      "| Check | Result | Evidence basis |",
      "| --- | --- | --- |",
      checklistRows,
      "",
      "Scope note: this checklist measures reviewer wayfinding for the V4 demo route. It does not change the route truth boundary."
    ].join("\n")
  );

  const handoffPath = path.join(outputDir, "handoff-note.md");
  writeFileSync(
    handoffPath,
    [
      "# Phase 5 Reviewer Evidence Handoff",
      "",
      "## Fresh Artifacts",
      "",
      `- Manifest: \`${manifest.manifestPath}\``,
      `- First-read checklist: \`${relativeArtifact(checklistPath)}\``,
      "",
      "| Viewport | Layer | Screenshot |",
      "| --- | --- | --- |",
      screenshotRows,
      "",
      "## Remaining customer Gaps And Boundaries",
      "",
      "- V-02, V-03, V-04, V-05, and V-06 remain explicit external fail/gap items with no retained pass evidence in this package.",
      `- F-13 is supported only by the separate Phase 7.1 evidence artifact and remains fresh until ${f13FreshUntilUtc} UTC; the V4 route itself remains a 13-actor bounded demo route.`,
      "- F-09, F-10, F-11, and F-16 remain bounded route representations, not measured throughput, live policy control, arbitrary rule editing, or an external reporting system.",
      "- The V4 demo route remains route-local bounded demo closure, not full external validation closure.",
      "",
      "## Validation Slot",
      "",
      "Validation command results are recorded outside this note after the required Phase 5 command run."
    ].join("\n")
  );

  return {
    checklistPath: relativeArtifact(checklistPath),
    handoffPath: relativeArtifact(handoffPath)
  };
}

async function main() {
  ensureDistBuildExists();
  ensureOutputRoot(outputRoot);

  const serverHandle = await startStaticServer();
  const browserCommand = findHeadlessBrowser();
  const browserHandle = await startHeadlessBrowser(browserCommand, browserArgs);
  let client;

  const inspections = [];
  const screenshots = [];
  const startedProcesses = {
    staticServerPid: serverHandle.server.pid,
    browserPid: browserHandle.browserProcess.pid,
    browserUserDataDir: browserHandle.userDataDir
  };

  try {
    await verifyFetches(serverHandle.baseUrl);
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    for (const viewport of viewports) {
      for (const layer of layers) {
        await navigateFresh(client, serverHandle.baseUrl, viewport);
        await clickLayerControl(client, layer.action);
        await sleep(250);

        const inspection = await inspectLayer(client);
        assertNoForbiddenPositiveClaims(
          inspection,
          `runtime inspection ${viewport.name} ${layer.key}`
        );

        const filename = `${viewport.name}-${layer.key}.png`;
        const screenshotPath = await captureScreenshot(client, outputRoot, filename);
        assertScreenshot(screenshotPath);

        inspections.push({
          viewport: viewport.name,
          layerKey: layer.key,
          layerLabel: layer.label,
          inspection
        });
        screenshots.push({
          viewport: viewport.name,
          layerKey: layer.key,
          layerLabel: layer.label,
          path: relativeArtifact(screenshotPath)
        });
      }
    }

    assertCaptureMatrixComplete(inspections, screenshots);
    assertCanonicalRoutes(inspections);
    assertL2ExternalFailGapPreserved(inspections);
    assertF13RouteNativeScaleClaimedFalse(inspections);

    const checklist = evaluateChecklist(inspections);
    assertChecklistPasses(checklist);

    const manifestPath = path.join(outputRoot, "manifest.json");
    const manifest = {
      generatedAtUtc: new Date().toISOString(),
      route: requestPath,
      outputRoot: relativeArtifact(outputRoot),
      startedProcesses,
      screenshots,
      checklist,
      truthBoundary: {
        routeClosure: "route-local bounded demo closure",
        f13: {
          artifactRole: "separate Phase 7.1 evidence",
          freshUntilUtc: f13FreshUntilUtc,
          routeNativeScaleClaimed: false
        },
        externalValidation: {
          ids: expectedExternalFailIds,
          status: "explicit external fail/gap"
        },
        boundedRepresentations: expectedBoundedRouteIds
      }
    };
    assertF13RouteNativeScaleClaimedFalse(inspections, manifest);

    const runtimeInspectionsPath = writeJsonArtifact(
      outputRoot,
      "runtime-inspections.json",
      inspections
    );
    const manifestArtifactPath = writeJsonArtifact(outputRoot, "manifest.json", {
      ...manifest,
      manifestPath: relativeArtifact(manifestPath)
    });

    const markdownArtifacts = writeMarkdownArtifacts(outputRoot, {
      ...manifest,
      manifestPath: relativeArtifact(manifestPath)
    }, checklist);

    const artifactIndexPath = writeJsonArtifact(outputRoot, "artifact-index.json", {
      manifestPath: relativeArtifact(manifestPath),
      ...markdownArtifacts,
      screenshots
    });
    assertGeneratedArtifactsHaveNoForbiddenClaims([
      runtimeInspectionsPath,
      manifestArtifactPath,
      path.join(repoRoot, markdownArtifacts.checklistPath),
      path.join(repoRoot, markdownArtifacts.handoffPath),
      artifactIndexPath
    ]);

    console.log(
      JSON.stringify(
        {
          outputRoot: relativeArtifact(outputRoot),
          manifestPath: relativeArtifact(manifestPath),
          ...markdownArtifacts,
          startedProcesses
        },
        null,
        2
      )
    );
  } finally {
    if (client) {
      await client.close();
    }
    await stopHeadlessBrowser(browserHandle);
    await stopStaticServer(serverHandle.server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
