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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-correction-a-phase-d");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VISUAL_TOKENS_VERSION =
  "m8a-v4.11-visual-tokens-conv1-runtime.v1";
const EXPECTED_VISUAL_TOKEN_DATA_SOURCE =
  "m8a-v4.11-visual-tokens-conv1";
const W4_WINDOW_ID = "leo-reentry-candidate";
const W4_TOKEN_ID = "W4";
const W4_RATIO = 0.71;
const W4_LABEL = "候選 LEO";
const CJK_FONT_FACE = "Noto Sans TC M8A V411 Subset";
const ENTRY_MIN_DURATION_MS = 1000;
const ENTRY_MAX_DURATION_MS = 2000;
const ENTRY_MAX_RADIUS_PX = 120;

const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const VIEWPORT_LAPTOP = {
  name: "laptop-1280x720",
  width: 1280,
  height: 720
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function rectsOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          visualTokens: productRoot?.dataset.m8aV411VisualTokens ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.visualTokens === EXPECTED_VISUAL_TOKENS_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Phase D route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Phase D route did not reach a ready state: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "Phase D");
}

async function seekW4(client, settleMs = 220) {
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
    })(${JSON.stringify(W4_RATIO)})`
  );
  await sleep(settleMs);
}

async function setReducedMotion(client, enabled) {
  await client.send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: enabled ? "reduce" : "no-preference"
      }
    ]
  });
}

async function inspectW4Token(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;
      const evalTime = viewer?.clock?.currentTime;
      const tokenDataSource = viewer?.dataSources?.getByName(
        "${EXPECTED_VISUAL_TOKEN_DATA_SOURCE}"
      )?.[0];
      const readProp = (prop) => {
        if (prop == null) return null;
        const value =
          typeof prop.getValue === "function" ? prop.getValue(evalTime) : prop;

        if (value && typeof value === "object" && "alpha" in value) {
          return {
            red: value.red,
            green: value.green,
            blue: value.blue,
            alpha: value.alpha
          };
        }

        return value;
      };
      const tokenEntities = tokenDataSource
        ? tokenDataSource.entities.values.map((entity) => ({
            id: entity.id,
            name: entity.name,
            entityShow: entity.show,
            isShowing: entity.isShowing,
            hasBillboard: Boolean(entity.billboard),
            hasLabel: Boolean(entity.label),
            billboardShow: entity.billboard
              ? readProp(entity.billboard.show)
              : null,
            billboardScale: entity.billboard
              ? readProp(entity.billboard.scale)
              : null,
            billboardColor: entity.billboard
              ? readProp(entity.billboard.color)
              : null,
            labelText: entity.label ? readProp(entity.label.text) : null,
            labelFont: entity.label ? readProp(entity.label.font) : null,
            labelShow: entity.label ? readProp(entity.label.show) : null,
            hasDistanceCondition:
              Boolean(entity.billboard?.distanceDisplayCondition) ||
              Boolean(entity.label?.distanceDisplayCondition)
          }))
        : [];
      const byId = Object.fromEntries(
        tokenEntities.map((entity) => [entity.id, entity])
      );
      const sceneState = capture?.m8aV4GroundStationScene?.getState?.();
      return {
        activeWindowId:
          sceneState?.simulationHandoverModel?.window?.windowId ?? null,
        activeProductWindowId:
          sceneState?.productUx?.activeWindowId ?? null,
        rootDataset: {
          visualTokenActiveId:
            productRoot?.dataset.m8aV411VisualTokenActiveId ?? null,
          w4Behavior:
            productRoot?.dataset.m8aV411VisualTokenW4Behavior ?? null,
          w4CueMode:
            productRoot?.dataset.m8aV411VisualTokenW4CueMode ?? null,
          w4EntryCueActive:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueActive ?? null,
          w4EntryCueCompleted:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueCompleted ?? null,
          w4EntryCueDurationMs:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueDurationMs ?? null,
          w4EntryCueElapsedMs:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueElapsedMs ?? null,
          w4EntryMaxRadiusPx:
            productRoot?.dataset.m8aV411VisualTokenW4EntryMaxRadiusPx ?? null,
          w4HaloRadiusPx:
            productRoot?.dataset.m8aV411VisualTokenW4HaloRadiusPx ?? null,
          w4Label:
            productRoot?.dataset.m8aV411VisualTokenW4Label ?? null,
          w4PermanentPulse:
            productRoot?.dataset.m8aV411VisualTokenW4PermanentPulse ?? null,
          w4PulseHz:
            productRoot?.dataset.m8aV411VisualTokenW4PulseHz ?? null,
          w4ReducedMotion:
            productRoot?.dataset.m8aV411VisualTokenW4ReducedMotion ?? null,
          w4ServingClaim:
            productRoot?.dataset.m8aV411VisualTokenW4ServingClaim ?? null,
          w4AlarmColor:
            productRoot?.dataset.m8aV411VisualTokenW4AlarmColor ?? null
        },
        w4: {
          entryCue: byId["m8a-v4.11-w4-candidate-entry-cue"] ?? null,
          halo: byId["m8a-v4.11-w4-candidate-halo"] ?? null,
          label: byId["m8a-v4.11-w4-candidate-label"] ?? null
        },
        tokenEntities,
        visibleTokenEntityIds: tokenEntities
          .filter((entity) => entity.isShowing)
          .map((entity) => entity.id),
        productText: productRoot ? normalize(productRoot.innerText) : ""
      };
    })()`,
    { awaitPromise: true }
  );
}

async function inspectOverlap(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const qs = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          visible:
            !el.hidden &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0,
          rect: rectToPlain(rect)
        };
      };
      return {
        topStrip: qs("[data-m8a-v411-top-strip='true']"),
        leftRail: qs("[data-m8a-v411-handover-rail='true']"),
        controlStrip: qs("[data-m8a-v47-control-strip='true']")
      };
    })()`,
    { awaitPromise: true }
  );
}

async function inspectCjkGlyphRendering(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const fontFace = ${JSON.stringify(CJK_FONT_FACE)};
      const candidateText = ${JSON.stringify(W4_LABEL)};
      const railNextText = "下一步：GEO 收尾為 guard";
      const railEvidenceText = "candidate quality strong; 若切回：~22 分鐘";
      const fontStack = '"' + fontFace + '", "Noto Sans TC", sans-serif';
      const loadFont = document.fonts?.load
        ? await document.fonts.load("600 24px " + fontStack, candidateText + railNextText + railEvidenceText)
        : [];
      await document.fonts?.ready;

      const renderSignature = (text) => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 72;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          return { alphas: [], inkPixels: 0, width: 0, hash: "" };
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 28px " + fontStack;
        ctx.textBaseline = "top";
        ctx.fillText(text, 4, 8);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let inkPixels = 0;
        let hash = 2166136261;
        for (let index = 3; index < data.length; index += 4) {
          const alpha = data[index];
          if (alpha > 24) {
            inkPixels += 1;
            hash ^= alpha + index;
            hash = Math.imul(hash, 16777619) >>> 0;
          }
        }
        return {
          alphas: Array.from(data.filter((_value, index) => index % 4 === 3)),
          inkPixels,
          width: ctx.measureText(text).width,
          hash: hash.toString(16)
        };
      };

      const target = renderSignature("候選");
      const tofu = renderSignature("□□");
      let pixelDiffFromTofu = 0;
      for (let index = 0; index < target.alphas.length; index += 1) {
        if (Math.abs(target.alphas[index] - tofu.alphas[index]) > 32) {
          pixelDiffFromTofu += 1;
        }
      }
      delete target.alphas;
      delete tofu.alphas;
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const railNext = document.querySelector("[data-m8a-v411-rail-slot='next']");
      const railEvidence = document.querySelector("[data-m8a-v411-rail-slot='evidence']");
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;
      const evalTime = viewer?.clock?.currentTime;
      const tokenDataSource = viewer?.dataSources?.getByName(
        "${EXPECTED_VISUAL_TOKEN_DATA_SOURCE}"
      )?.[0];
      const labelEntity = tokenDataSource?.entities?.getById?.(
        "m8a-v4.11-w4-candidate-label"
      );
      const labelFontProp = labelEntity?.label?.font;
      const labelFont =
        typeof labelFontProp?.getValue === "function"
          ? labelFontProp.getValue(evalTime)
          : labelFontProp ?? null;
      return {
        fontFace,
        loadedFaces: loadFont.map((face) => ({
          family: face.family,
          weight: face.weight,
          status: face.status
        })),
        fontCheck: document.fonts?.check
          ? document.fonts.check("600 24px " + fontStack, candidateText + railNextText + railEvidenceText)
          : false,
        productFontFamily: productRoot ? getComputedStyle(productRoot).fontFamily : "",
        railNextFontFamily: railNext ? getComputedStyle(railNext).fontFamily : "",
        railEvidenceFontFamily: railEvidence ? getComputedStyle(railEvidence).fontFamily : "",
        railNextText: railNext?.textContent ?? "",
        railEvidenceText: railEvidence?.textContent ?? "",
        labelFont,
        target,
        tofu,
        pixelDiffFromTofu,
        targetDiffersFromTofu:
          target.hash !== tofu.hash &&
          pixelDiffFromTofu > 300
      };
    })()`,
    { awaitPromise: true }
  );
}

function assertCjkGlyphRendering(result, label) {
  assert(
    result.fontCheck === true && result.loadedFaces.length >= 1,
    `${label}: CJK subset font must load for Chinese runtime text: ${JSON.stringify(result)}`
  );
  assert(
    result.productFontFamily.includes(CJK_FONT_FACE) &&
      result.railNextFontFamily.includes(CJK_FONT_FACE) &&
      result.railEvidenceFontFamily.includes(CJK_FONT_FACE),
    `${label}: Phase C/D DOM surfaces must use CJK-capable font stack: ${JSON.stringify(result)}`
  );
  assert(
    result.railNextText.includes("下一步") &&
      result.railEvidenceText.includes("若切回"),
    `${label}: W4 rail decision-first layers must remain Chinese-primary per spec v2 §5: ${JSON.stringify(result)}`
  );
  assert(
    typeof result.labelFont === "string" && result.labelFont.includes(CJK_FONT_FACE),
    `${label}: W4 Cesium candidate label must use CJK-capable font stack: ${JSON.stringify(result)}`
  );
  assert(
    result.target.inkPixels > 100 &&
      result.targetDiffersFromTofu === true,
    `${label}: Chinese glyph probe must not match tofu/square-box rendering: ${JSON.stringify(result)}`
  );
}

function assertW4BaseState(result, label) {
  assert(
    result.activeWindowId === W4_WINDOW_ID &&
      result.activeProductWindowId === W4_WINDOW_ID,
    `${label}: expected W4 active window: ${JSON.stringify({
      activeWindowId: result.activeWindowId,
      activeProductWindowId: result.activeProductWindowId
    })}`
  );
  assert(
    result.rootDataset.visualTokenActiveId === W4_TOKEN_ID,
    `${label}: W4 visual token must be active: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.rootDataset.w4Behavior ===
      "entry-cue-once-then-stable-candidate-halo",
    `${label}: W4 behavior marker mismatch: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.rootDataset.w4PermanentPulse === "false",
    `${label}: W4 must not report permanent pulse: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.rootDataset.w4PulseHz === "one-shot-entry-only",
    `${label}: W4 must not report a permanent 1Hz pulse: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    Number(result.rootDataset.w4EntryCueDurationMs) >= ENTRY_MIN_DURATION_MS &&
      Number(result.rootDataset.w4EntryCueDurationMs) <= ENTRY_MAX_DURATION_MS,
    `${label}: entry cue duration must be 1-2 seconds: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    Number(result.rootDataset.w4EntryMaxRadiusPx) <= ENTRY_MAX_RADIUS_PX,
    `${label}: entry cue radius must stay restrained: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.rootDataset.w4Label === W4_LABEL &&
      result.w4.label?.labelText === W4_LABEL,
    `${label}: W4 token must label candidate semantics: ${JSON.stringify(result.w4)}`
  );
  assert(
    result.w4.label?.labelFont?.includes(CJK_FONT_FACE),
    `${label}: W4 candidate label font must include the CJK subset: ${JSON.stringify(result.w4.label)}`
  );
  assert(
    result.rootDataset.w4ServingClaim === "not-active-serving-satellite",
    `${label}: W4 must not claim active serving satellite: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.rootDataset.w4AlarmColor === "false",
    `${label}: W4 candidate token must not use alarm color: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.w4.entryCue &&
      result.w4.halo &&
      result.w4.label,
    `${label}: expected W4 entry cue, halo, and label entities: ${JSON.stringify(result.w4)}`
  );
  assert(
    result.w4.halo.isShowing === true &&
      result.w4.label.isShowing === true,
    `${label}: stable halo and candidate label must be visible: ${JSON.stringify(result.w4)}`
  );
  assert(
    result.w4.halo.hasDistanceCondition &&
      result.w4.label.hasDistanceCondition,
    `${label}: W4 halo and label must keep distance-display guardrails: ${JSON.stringify(result.w4)}`
  );
  assert(
    !result.tokenEntities.some((entity) =>
      /pulse-ring|permanent|1hz/i.test(`${entity.id} ${entity.name}`)
    ),
    `${label}: W4 token entities must not expose the legacy pulse-ring runtime: ${JSON.stringify(result.tokenEntities)}`
  );
  assert(
    !/\bactive serving satellite\b/i.test(result.productText),
    `${label}: visible product text must not claim active serving satellite: ${result.productText}`
  );
}

function assertEntryCue(result) {
  assertW4BaseState(result, "entry");
  const renderedRadiusPx =
    Number(result.w4.entryCue.billboardScale) * 256 / 2;

  assert(
    result.rootDataset.w4CueMode === "entry-cue" &&
      result.rootDataset.w4EntryCueActive === "true",
    `entry: W4 must expose active entry cue: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.w4.entryCue.isShowing === true &&
      result.w4.entryCue.billboardShow === true,
    `entry: entry cue entity must be visible: ${JSON.stringify(result.w4.entryCue)}`
  );
  assert(
    renderedRadiusPx <= ENTRY_MAX_RADIUS_PX + 0.5,
    `entry: entry cue rendered radius exceeds ${ENTRY_MAX_RADIUS_PX}px: ${JSON.stringify(result.w4.entryCue)}`
  );
}

function assertSteadyHalo(result, label = "steady") {
  assertW4BaseState(result, label);
  assert(
    result.rootDataset.w4CueMode === "steady-candidate-halo" &&
      result.rootDataset.w4EntryCueActive === "false" &&
      result.rootDataset.w4EntryCueCompleted === "true",
    `${label}: W4 must settle into steady candidate halo: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.w4.entryCue.isShowing === false ||
      result.w4.entryCue.billboardShow === false,
    `${label}: entry cue must stop automatically: ${JSON.stringify(result.w4.entryCue)}`
  );
  assert(
    result.w4.halo.isShowing === true &&
      result.w4.label.isShowing === true,
    `${label}: halo and label must remain after entry cue: ${JSON.stringify(result.w4)}`
  );
}

function assertReducedMotion(result) {
  assertW4BaseState(result, "reduced-motion");
  assert(
    result.rootDataset.w4CueMode ===
      "reduced-motion-steady-candidate-halo" &&
      result.rootDataset.w4ReducedMotion === "true" &&
      result.rootDataset.w4EntryCueActive === "false",
    `reduced-motion: W4 must suppress animated ripple: ${JSON.stringify(result.rootDataset)}`
  );
  assert(
    result.w4.entryCue.isShowing === false ||
      result.w4.entryCue.billboardShow === false,
    `reduced-motion: entry ripple must not render: ${JSON.stringify(result.w4.entryCue)}`
  );
  assert(
    result.w4.halo.isShowing === true &&
      result.w4.label.isShowing === true,
    `reduced-motion: stable candidate cue must remain: ${JSON.stringify(result.w4)}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  const manifest = {
    screenshots: [],
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setReducedMotion(client, false);
    await setViewport(client, VIEWPORT_DESKTOP);
    await navigateAndWait(client, baseUrl);
    await seekW4(client, 220);

    const entryState = await inspectW4Token(client);
    assertEntryCue(entryState);
    assertCjkGlyphRendering(await inspectCjkGlyphRendering(client), "entry");
    const entryScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "w4-entry-cue-1440x900.png"
    );
    assertScreenshot(entryScreenshot);
    manifest.screenshots.push(entryScreenshot);

    await sleep(1900);
    const steadyState = await inspectW4Token(client);
    assertSteadyHalo(steadyState);
    assertCjkGlyphRendering(await inspectCjkGlyphRendering(client), "steady");
    const steadyScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "w4-steady-candidate-halo-1440x900.png"
    );
    assertScreenshot(steadyScreenshot);
    manifest.screenshots.push(steadyScreenshot);

    await setViewport(client, VIEWPORT_LAPTOP);
    await sleep(260);
    const overlap = await inspectOverlap(client);
    assert(overlap.topStrip?.visible, "1280x720 top strip must remain visible");
    assert(overlap.leftRail?.visible, "1280x720 handover rail must remain visible");
    assert(
      overlap.controlStrip?.visible,
      "1280x720 control strip must remain visible"
    );
    assert(
      !rectsOverlap(overlap.leftRail.rect, overlap.controlStrip.rect),
      `1280x720 left rail must not overlap control strip: ${JSON.stringify(overlap)}`
    );
    assertCjkGlyphRendering(
      await inspectCjkGlyphRendering(client),
      "1280x720-overlap"
    );
    const overlapScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "w4-overlap-check-1280x720.png"
    );
    assertScreenshot(overlapScreenshot);
    manifest.screenshots.push(overlapScreenshot);
    manifest.checks.push("normal-motion-entry-and-steady-w4-candidate-token");
    // Smoke Softening Disclosure: spec v2 §5 supersedes the old W4
    // `Decision:` rail prose assertion. Phase D now probes the W4 next/evidence
    // layers that replaced it in the decision-first rail.
    manifest.checks.push("smoke-softening-v2-5-w4-rail-next-evidence-cjk-probe");
  });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setReducedMotion(client, true);
    await setViewport(client, VIEWPORT_DESKTOP);
    await navigateAndWait(client, baseUrl);
    await seekW4(client, 240);

    const reducedMotionState = await inspectW4Token(client);
    assertReducedMotion(reducedMotionState);
    assertCjkGlyphRendering(
      await inspectCjkGlyphRendering(client),
      "reduced-motion"
    );
    const reducedMotionScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "w4-reduced-motion-candidate-state-1440x900.png"
    );
    assertScreenshot(reducedMotionScreenshot);
    manifest.screenshots.push(reducedMotionScreenshot);
    manifest.checks.push("reduced-motion-stable-w4-candidate-token");
    manifest.checks.push("cjk-glyph-runtime-probe-no-tofu");
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log("Phase D smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
