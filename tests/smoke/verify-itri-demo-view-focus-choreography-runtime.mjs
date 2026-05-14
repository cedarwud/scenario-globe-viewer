import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/itri-demo-view-focus-choreography");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-view-focus-choreography-runtime.v1";
const EXPECTED_POLICY = "dim-candidate-fallback-context-keep-next-visible";
const EXPECTED_DEMOTED_OPACITY = 0.3;
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const WINDOW_CHECKS = [
  {
    label: "W1",
    ratio: 0.1,
    windowId: "leo-acquisition-context",
    focusId: "w1-leo-primary-focus",
    primaryLabel: "W1 · LEO 主服務",
    orbit: "LEO",
    role: "primary-service",
    briefing: "只看 LEO",
    next: "下一焦點：LEO 品質下降。",
    visualCue: "representative-leo-focus"
  },
  {
    label: "W2",
    ratio: 0.3,
    windowId: "leo-aging-pressure",
    focusId: "w2-leo-pressure-focus",
    primaryLabel: "W2 · LEO 壓力",
    orbit: "LEO",
    role: "pressure",
    briefing: "只看 LEO 壓力",
    next: "下一焦點：MEO 暫時接住。",
    visualCue: "leo-pressure-cue"
  },
  {
    label: "W3",
    ratio: 0.5,
    windowId: "meo-continuity-hold",
    focusId: "w3-meo-hold-focus",
    primaryLabel: "W3 · MEO 接續",
    orbit: "MEO",
    role: "continuity-hold",
    briefing: "只看 MEO",
    next: "下一焦點：LEO 回到候選。",
    visualCue: "representative-meo-hold"
  },
  {
    label: "W4",
    ratio: 0.7,
    windowId: "leo-reentry-candidate",
    focusId: "w4-leo-candidate-focus",
    primaryLabel: "W4 · LEO 候選",
    orbit: "LEO",
    role: "candidate-review",
    briefing: "只看候選 LEO",
    next: "下一焦點：GEO guard 收尾。",
    visualCue: "returning-leo-candidate"
  },
  {
    label: "W5",
    ratio: 0.9,
    windowId: "geo-continuity-guard",
    focusId: "w5-geo-guard-focus",
    primaryLabel: "W5 · GEO 保底",
    orbit: "GEO",
    role: "guard-context",
    briefing: "只看 GEO guard",
    next: "重新開始：回到 W1 LEO 主服務。",
    visualCue: "geo-guard-boundary"
  }
];

const FORBIDDEN_CLAIMS = [
  "live iperf",
  "measured throughput passed",
  "external report truth ready",
  "v-02 passed",
  "v-03 passed",
  ">=500 leo validated",
  "500 leo validated"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const sceneState =
          window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.getState?.();

        return {
          bootstrapState: root.dataset.bootstrapState ?? null,
          scenePreset: root.dataset.scenePreset ?? null,
          hasSceneState: Boolean(sceneState),
          focusVersion:
            productRoot?.dataset.m8aV4ItriDemoViewFocusChoreography ?? null,
          stateFocusVersion:
            sceneState?.productUx?.productComprehension?.focusChoreography
              ?.version ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasSceneState &&
      lastState?.focusVersion === EXPECTED_VERSION &&
      lastState?.stateFocusVersion === EXPECTED_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Focus choreography route did not settle: ${JSON.stringify(lastState)}`);
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "customer focus choreography");
}

async function seekReplayRatio(client, ratio) {
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();

      capture?.m8aV4GroundStationScene?.pause?.();
      if (replayClock && replayState?.startTime && replayState?.stopTime) {
        const start = Date.parse(replayState.startTime);
        const stop = Date.parse(replayState.stopTime);
        replayClock.seek(new Date(start + (stop - start) * ratio).toISOString());
        capture?.m8aV4GroundStationScene?.pause?.();
      }
    })(${JSON.stringify(ratio)})`
  );
  await sleep(320);
}

async function inspectFocusChoreography(client) {
  await evaluateRuntimeValue(client, `document.fonts.ready.then(() => true)`, {
    awaitPromise: true
  });

  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
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
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const visibleText = (root) => {
        if (!root) {
          return "";
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const chunks = [];

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parent = node.parentElement;
          const text = normalize(node.textContent);

          if (text && parent instanceof HTMLElement && isVisible(parent)) {
            chunks.push(text);
          }
        }

        return chunks.join(" ");
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const l0Card = productRoot?.querySelector("[data-itri-demo-l0-briefing-card='true']");
      const railPanel = productRoot?.querySelector("[data-m8a-v411-rail-panel='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const activeMark = productRoot?.querySelector(
        "[data-m8a-v410-sequence-mark='true'][data-active='true']"
      );
      const nextMark = productRoot?.querySelector(
        "[data-m8a-v410-sequence-mark='true'][data-next='true']"
      );
      const dimmedMarks = Array.from(
        productRoot?.querySelectorAll(
          "[data-m8a-v410-sequence-mark='true'][data-itri-demo-focus-secondary='dimmed-context']"
        ) ?? []
      );
      const orbitChips = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-orbit-class-chip='true']") ?? []
      ).map((chip) => ({
        actorId: chip.dataset.m8aV411OrbitChipActorId ?? "",
        emphasis: chip.dataset.m8aV411OrbitChipEmphasis ?? "",
        demoted: chip.dataset.m8aV411OrbitChipDemoted ?? "",
        opacity: Number.parseFloat(chip.style.opacity || "1")
      }));
      const decision = {
        now: normalize(productRoot?.querySelector("[data-m8a-v411-decision-now='true']")?.textContent),
        why: normalize(productRoot?.querySelector("[data-m8a-v411-decision-why='true']")?.textContent),
        next: normalize(productRoot?.querySelector("[data-m8a-v411-decision-next='true']")?.textContent),
        watch: normalize(productRoot?.querySelector("[data-m8a-v411-decision-watch='true']")?.textContent)
      };

      return {
        stateFocus:
          state?.productUx?.productComprehension?.focusChoreography ?? null,
        activeWindowId: state?.productUx?.activeWindowId ?? null,
        productDataset: {
          version:
            productRoot?.dataset.m8aV4ItriDemoViewFocusChoreography ?? null,
          windowId:
            productRoot?.dataset.m8aV4ItriDemoViewFocusWindowId ?? null,
          focusId: productRoot?.dataset.m8aV4ItriDemoViewFocusId ?? null,
          primaryLabel:
            productRoot?.dataset.m8aV4ItriDemoViewFocusPrimaryLabel ?? null,
          orbit:
            productRoot?.dataset.m8aV4ItriDemoViewFocusOrbitClass ?? null,
          role: productRoot?.dataset.m8aV4ItriDemoViewFocusRole ?? null,
          briefing:
            productRoot?.dataset.m8aV4ItriDemoViewFocusBriefing ?? null,
          next: productRoot?.dataset.m8aV4ItriDemoViewFocusNext ?? null,
          visualCue:
            productRoot?.dataset.m8aV4ItriDemoViewFocusVisualCue ?? null,
          policy:
            productRoot?.dataset
              .m8aV4ItriDemoViewFocusSecondaryActorPolicy ?? null,
          roles:
            productRoot?.dataset
              .m8aV4ItriDemoViewFocusSecondaryActorRoles ?? null,
          truth:
            productRoot?.dataset
              .m8aV4ItriDemoViewFocusTruthBoundary ?? null
        },
        documentDataset: {
          version:
            document.documentElement.dataset
              .m8aV4ItriDemoViewFocusChoreography ?? null,
          windowId:
            document.documentElement.dataset
              .m8aV4ItriDemoViewFocusWindowId ?? null,
          focusId:
            document.documentElement.dataset.m8aV4ItriDemoViewFocusId ?? null,
          primaryLabel:
            document.documentElement.dataset
              .m8aV4ItriDemoViewFocusPrimaryLabel ?? null,
          policy:
            document.documentElement.dataset
              .m8aV4ItriDemoViewFocusSecondaryActorPolicy ?? null,
          next:
            document.documentElement.dataset.m8aV4ItriDemoViewFocusNext ?? null
        },
        l0: {
          version: l0Card?.dataset.itriDemoFocusChoreographyVersion ?? null,
          windowId: l0Card?.dataset.itriDemoFocusWindowId ?? null,
          focusId: l0Card?.dataset.itriDemoFocusId ?? null,
          visualCue: l0Card?.dataset.itriDemoFocusVisualCue ?? null,
          policy: l0Card?.dataset.itriDemoFocusSecondaryActorPolicy ?? null,
          nextDataset: l0Card?.dataset.itriDemoL0NextState ?? null,
          current: normalize(
            productRoot?.querySelector("[data-itri-demo-l0-current-state='true']")?.textContent
          ),
          reason: normalize(
            productRoot?.querySelector("[data-itri-demo-l0-current-reason='true']")?.textContent
          ),
          next: normalize(
            productRoot?.querySelector("[data-itri-demo-l0-next-state='true']")?.textContent
          ),
          orbit: normalize(
            productRoot?.querySelector("[data-itri-demo-l0-active-orbit='true']")?.textContent
          )
        },
        railPanel: {
          version: railPanel?.dataset.itriDemoFocusChoreographyVersion ?? null,
          windowId: railPanel?.dataset.itriDemoFocusWindowId ?? null,
          focusId: railPanel?.dataset.itriDemoFocusId ?? null,
          visualCue: railPanel?.dataset.itriDemoFocusVisualCue ?? null,
          policy: railPanel?.dataset.itriDemoFocusSecondaryActorPolicy ?? null,
          primaryLabel: railPanel?.dataset.itriDemoFocusPrimaryLabel ?? null
        },
        sequenceRail: {
          version: sequenceRail?.dataset.itriDemoFocusChoreographyVersion ?? null,
          windowId: sequenceRail?.dataset.itriDemoFocusActiveWindowId ?? null,
          focusId: sequenceRail?.dataset.itriDemoFocusActiveId ?? null,
          primaryLabel:
            sequenceRail?.dataset.itriDemoFocusActivePrimaryLabel ?? null,
          next: sequenceRail?.dataset.itriDemoFocusNextHint ?? null,
          activeMarkFocusId: activeMark?.dataset.itriDemoFocusId ?? null,
          activeMarkSecondary:
            activeMark?.dataset.itriDemoFocusSecondary ?? null,
          activeMarkWindowId:
            activeMark?.dataset.m8aV410SequenceWindowId ?? null,
          nextMarkSecondary: nextMark?.dataset.itriDemoFocusSecondary ?? null,
          dimmedMarkCount: dimmedMarks.length
        },
        decision,
        orbitChips,
        visibleRouteText: visibleText(productRoot)
      };
    })()`
  );
}

function assertFocusSurface(result, check) {
  const expectedTuples = [
    ["stateFocus.version", result.stateFocus?.version, EXPECTED_VERSION],
    ["stateFocus.windowId", result.stateFocus?.windowId, check.windowId],
    ["stateFocus.focusId", result.stateFocus?.focusId, check.focusId],
    ["stateFocus.primaryFocusLabel", result.stateFocus?.primaryFocusLabel, check.primaryLabel],
    ["stateFocus.focusOrbitClassToken", result.stateFocus?.focusOrbitClassToken, check.orbit],
    ["stateFocus.focusRole", result.stateFocus?.focusRole, check.role],
    ["stateFocus.visualCue", result.stateFocus?.visualCue, check.visualCue],
    ["productDataset.version", result.productDataset.version, EXPECTED_VERSION],
    ["productDataset.windowId", result.productDataset.windowId, check.windowId],
    ["productDataset.focusId", result.productDataset.focusId, check.focusId],
    ["productDataset.primaryLabel", result.productDataset.primaryLabel, check.primaryLabel],
    ["productDataset.orbit", result.productDataset.orbit, check.orbit],
    ["productDataset.role", result.productDataset.role, check.role],
    ["productDataset.visualCue", result.productDataset.visualCue, check.visualCue],
    ["productDataset.policy", result.productDataset.policy, EXPECTED_POLICY],
    ["documentDataset.version", result.documentDataset.version, EXPECTED_VERSION],
    ["documentDataset.windowId", result.documentDataset.windowId, check.windowId],
    ["documentDataset.focusId", result.documentDataset.focusId, check.focusId],
    ["documentDataset.policy", result.documentDataset.policy, EXPECTED_POLICY],
    ["l0.version", result.l0.version, EXPECTED_VERSION],
    ["l0.windowId", result.l0.windowId, check.windowId],
    ["l0.focusId", result.l0.focusId, check.focusId],
    ["railPanel.version", result.railPanel.version, EXPECTED_VERSION],
    ["railPanel.windowId", result.railPanel.windowId, check.windowId],
    ["railPanel.focusId", result.railPanel.focusId, check.focusId],
    ["sequenceRail.version", result.sequenceRail.version, EXPECTED_VERSION],
    ["sequenceRail.windowId", result.sequenceRail.windowId, check.windowId],
    ["sequenceRail.focusId", result.sequenceRail.focusId, check.focusId],
    ["sequenceRail.activeMarkFocusId", result.sequenceRail.activeMarkFocusId, check.focusId],
    ["sequenceRail.activeMarkSecondary", result.sequenceRail.activeMarkSecondary, "primary"],
    ["sequenceRail.nextMarkSecondary", result.sequenceRail.nextMarkSecondary, "next-visible"]
  ];

  for (const [field, actual, expected] of expectedTuples) {
    assert(
      actual === expected,
      `${check.label}: ${field} mismatch: ${JSON.stringify({ actual, expected })}`
    );
  }

  assert(
    result.activeWindowId === check.windowId,
    `${check.label}: active window mismatch: ${result.activeWindowId}`
  );
  assert(
    result.productDataset.briefing.includes(check.briefing) &&
      result.l0.reason.includes(check.briefing),
    `${check.label}: briefing copy not synchronized: ${JSON.stringify({
      product: result.productDataset.briefing,
      l0: result.l0.reason
    })}`
  );
  assert(
    result.productDataset.next === check.next &&
      result.documentDataset.next === check.next &&
      result.l0.nextDataset === check.next &&
      result.sequenceRail.next === check.next &&
      result.decision.next === check.next,
    `${check.label}: next focus hint not synchronized: ${JSON.stringify({
      product: result.productDataset.next,
      doc: result.documentDataset.next,
      l0: result.l0.nextDataset,
      rail: result.sequenceRail.next,
      decision: result.decision.next,
      expected: check.next
    })}`
  );
  assert(
    result.l0.current === check.primaryLabel &&
      result.railPanel.primaryLabel === check.primaryLabel &&
      result.sequenceRail.primaryLabel === check.primaryLabel,
    `${check.label}: primary focus label not synchronized: ${JSON.stringify({
      l0: result.l0.current,
      railPanel: result.railPanel.primaryLabel,
      sequenceRail: result.sequenceRail.primaryLabel,
      expected: check.primaryLabel
    })}`
  );
  assert(
    result.l0.orbit.includes(`Active orbit: ${check.orbit}`),
    `${check.label}: active orbit copy mismatch: ${result.l0.orbit}`
  );
  assert(
    result.decision.now &&
      result.decision.why &&
      result.decision.watch &&
      !result.decision.now.includes("Now:") &&
      !result.decision.why.includes("Why:") &&
      !result.decision.watch.includes("Watch:"),
    `${check.label}: decision modules must be short state-specific focus copy: ${JSON.stringify(result.decision)}`
  );
  assert(
    result.sequenceRail.dimmedMarkCount >= 3,
    `${check.label}: inactive non-next sequence marks must be dimmed context: ${JSON.stringify(result.sequenceRail)}`
  );
  assert(
    result.productDataset.roles === "candidate|fallback|context",
    `${check.label}: secondary actor role telemetry mismatch: ${result.productDataset.roles}`
  );
  assert(
    result.productDataset.truth.includes("not operator log") &&
      result.productDataset.truth.includes("measured metric"),
    `${check.label}: focus truth boundary must remain explicit: ${result.productDataset.truth}`
  );
}

function assertSecondaryActorDimming(result, label) {
  const promoted = result.orbitChips.filter((chip) => chip.demoted === "false");
  const demoted = result.orbitChips.filter((chip) => chip.demoted === "true");

  assert(promoted.length > 0, `${label}: expected one promoted focus chip`);
  assert(demoted.length > 0, `${label}: expected demoted secondary chips`);
  assert(
    promoted.every((chip) => chip.emphasis === "representative" && chip.opacity > 0.99),
    `${label}: promoted chips must only be representative focus chips: ${JSON.stringify(promoted)}`
  );
  assert(
    demoted.every(
      (chip) =>
        ["candidate", "fallback", "context"].includes(chip.emphasis) &&
        Math.abs(chip.opacity - EXPECTED_DEMOTED_OPACITY) < 0.001
    ),
    `${label}: secondary chips must be dimmed at 30% opacity: ${JSON.stringify(demoted)}`
  );
}

function assertNoForbiddenClaims(text, label) {
  const lowerText = String(text ?? "").toLowerCase();
  const hits = FORBIDDEN_CLAIMS.filter((claim) => lowerText.includes(claim));

  assert(hits.length === 0, `${label}: forbidden claims visible: ${hits.join(", ")}`);
}

async function main() {
  ensureOutputRoot(outputRoot);

  const manifest = {
    screenshots: [],
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await navigateAndWait(client, baseUrl);

    for (const check of WINDOW_CHECKS) {
      await seekReplayRatio(client, check.ratio);
      const result = await inspectFocusChoreography(client);

      assertFocusSurface(result, check);
      assertSecondaryActorDimming(result, check.label);
      assertNoForbiddenClaims(result.visibleRouteText, check.label);
      manifest.checks.push({
        windowId: check.windowId,
        focusId: check.focusId,
        primaryLabel: check.primaryLabel,
        next: check.next
      });

      if (check.label === "W3") {
        const screenshot = await captureScreenshot(
          client,
          outputRoot,
          "w3-focus-choreography-1440x900.png"
        );
        assertScreenshot(screenshot);
        manifest.screenshots.push(screenshot);
      }
    }
  });

  writeJsonArtifact(outputRoot, "manifest.json", {
    generatedAtUtc: new Date().toISOString(),
    version: EXPECTED_VERSION,
    manifest
  });

  console.log(
    `customer demo view focus choreography smoke passed: ${manifest.checks.length} windows`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
