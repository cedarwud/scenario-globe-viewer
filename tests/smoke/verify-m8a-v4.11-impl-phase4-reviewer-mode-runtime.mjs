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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-impl-phase4");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";

const VIEWPORTS = {
  desktop: { name: "desktop-1440x900", width: 1440, height: 900 },
  tabletLandscape: { name: "tablet-landscape-1024x768", width: 1024, height: 768 },
  tabletPortrait: { name: "tablet-portrait-768x1024", width: 768, height: 1024 },
  narrow: { name: "narrow-390x844", width: 390, height: 844 }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForBootstrapReady(client) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const state = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );
    if (state?.bootstrapState === "ready" && state?.hasCapture === true) {
      return state;
    }
    if (state?.bootstrapState === "error") {
      throw new Error(`Phase 4 bootstrap error: ${JSON.stringify(state)}`);
    }
    await sleep(100);
  }
  throw new Error("Phase 4 bootstrap timeout");
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "Phase 4");
}

async function clickSelector(client, selector) {
  await evaluateRuntimeValue(
    client,
    `((selector) => {
      const target = document.querySelector(selector);
      if (target) {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
        target.click();
      }
    })(${JSON.stringify(selector)})`
  );
  await sleep(200);
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
  await sleep(280);
}

async function inspectReviewerState(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const sheet = root?.querySelector("aside[data-m8a-v411-inspector-concurrency]");
      const sheetRect = sheet ? (() => { const r = sheet.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })() : null;
      const sheetVisible = sheet ? !sheet.hidden && getComputedStyle(sheet).display !== "none" : false;
      const drawer = root?.querySelector("[data-m8a-v411-handover-rail='true']");
      const drawerState = drawer?.dataset?.m8aV411HandoverRailDrawerState ?? null;
      const drawerRect = drawer ? (() => { const r = drawer.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })() : null;
      const railTrigger = root?.querySelector("[data-m8a-v411-narrow-rail-trigger='true']");
      const railTriggerStyle = railTrigger ? getComputedStyle(railTrigger) : null;
      const railTriggerVisible = railTrigger ? railTriggerStyle.display !== "none" : false;
      const reviewerToggle = root?.querySelector("[data-m8a-v411-reviewer-mode-toggle='true']");
      const status = root?.querySelector("[data-m8a-v411-reviewer-mode-status='true']");
      const modeLabel = root?.querySelector("[data-m8a-v411-inspector-mode-label='true']");
      return {
        replayClockMode: root?.dataset?.m8aV411ReplayClockMode ?? null,
        reviewModeOn: root?.dataset?.m8aV411ReviewerModeOn ?? null,
        toastSuppressed: root?.dataset?.m8aV411ReviewerModeToastSuppressed ?? null,
        inspectorOpen: root?.dataset?.m8aV411InspectorOpen ?? null,
        railDrawerState: drawerState,
        sheet: { visible: sheetVisible, rect: sheetRect },
        drawer: drawerRect,
        railTriggerVisible,
        reviewerToggle: reviewerToggle ? {
          ariaPressed: reviewerToggle.getAttribute("aria-pressed"),
          dataReviewerModeOn: reviewerToggle.dataset?.m8aV411ReviewerModeOn ?? null,
          replayClockMode: reviewerToggle.dataset?.m8aV411ReviewerModeReplayClockMode ?? null,
          textContent: (reviewerToggle.textContent || "").trim()
        } : null,
        status: status ? {
          role: status.getAttribute("role"),
          ariaLive: status.getAttribute("aria-live"),
          ariaAtomic: status.getAttribute("aria-atomic"),
          textContent: (status.textContent || "").trim(),
          announcedMode: status.dataset?.m8aV411ReviewerModeAnnouncedMode ?? null
        } : null,
        modeLabel: modeLabel ? {
          hidden: modeLabel.hidden,
          textContent: (modeLabel.textContent || "").trim(),
          replayClockMode: modeLabel.dataset?.m8aV411ReplayClockMode ?? null
        } : null,
        playbackState: window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.getState?.()?.productUx?.playback ?? null,
        reviewerSnapshot: window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.getState?.()?.productUx?.reviewerMode ?? null
      };
    })()`
  );
}

async function captureAndRecord(client, manifest, filename, viewportLabel) {
  const filepath = await captureScreenshot(client, outputRoot, filename);
  manifest.captures.push({
    viewport: viewportLabel,
    filename,
    path: filepath
  });
}

async function main() {
  ensureOutputRoot(outputRoot);
  const manifest = {
    spec: "M8A V4.11 Impl Phase 4 reviewer mode + narrow/tablet designed surfaces",
    softening: [],
    captures: [],
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    // Desktop tests
    await setViewport(client, VIEWPORTS.desktop);
    await navigateAndWait(client, baseUrl);

    let state = await inspectReviewerState(client);
    assert(state.replayClockMode !== null, "Phase 4: root must expose data-m8a-v411-replay-clock-mode");
    assert(state.reviewerToggle, "Phase 4: reviewer mode toggle must be present");
    assert(
      ["true", "false"].includes(state.reviewerToggle.ariaPressed),
      "Phase 4: reviewer toggle must have boolean aria-pressed: " + state.reviewerToggle.ariaPressed
    );
    assert(state.status, "Phase 4: reviewer mode ARIA live region must exist");
    assert(
      state.status.role === "status",
      "Phase 4: reviewer mode ARIA live region must be role=\"status\""
    );
    assert(
      state.status.ariaLive === "polite",
      "Phase 4: reviewer mode ARIA live region must be aria-live=\"polite\""
    );
    assert(state.modeLabel, "Phase 4: inspector mode label slot must exist");
    manifest.checks.push("desktop-state-machine-fields-exposed");

    // Pin-and-resume contract: open Details at ratio 0.28 (W2), expect mode -> inspector-pinned
    await seekReplayRatio(client, 0.28);
    await clickSelector(client, "button[data-m8a-v47-control-id='details-toggle']");
    state = await inspectReviewerState(client);
    assert(
      state.replayClockMode === "inspector-pinned",
      "Phase 4: opening Details must transition to inspector-pinned: " + state.replayClockMode
    );
    assert(
      state.reviewerSnapshot?.pinnedWindowId === "leo-aging-pressure",
      "Phase 4: pin must capture pinnedWindowId at open: " + JSON.stringify(state.reviewerSnapshot)
    );
    assert(
      typeof state.reviewerSnapshot?.pinnedReplayRatio === "number" &&
        Math.abs(state.reviewerSnapshot.pinnedReplayRatio - 0.28) < 0.05,
      "Phase 4: pin must capture pinnedReplayRatio close to seek ratio: " +
        JSON.stringify(state.reviewerSnapshot)
    );
    assert(
      state.toastSuppressed === "true",
      "Phase 4: inspector-pinned must set toastSuppressed=true: " + state.toastSuppressed
    );
    assert(
      state.modeLabel.hidden === false,
      "Phase 4: mode label must be visible while inspector is pinned"
    );
    assert(
      /Pinned to W2/.test(state.modeLabel.textContent ?? ""),
      "Phase 4: mode label must read 'Pinned to W2': " + state.modeLabel.textContent
    );
    assert(
      state.status.announcedMode === "inspector-pinned",
      "Phase 4: ARIA region must announce inspector-pinned: " + state.status.announcedMode
    );
    assert(
      /Reviewer pinned to W2/.test(state.status.textContent ?? ""),
      "Phase 4: ARIA region must announce 'Reviewer pinned to W2': " + state.status.textContent
    );
    manifest.checks.push("desktop-inspector-open-pins-replay-and-suppresses-toast");
    await captureAndRecord(
      client,
      manifest,
      "reviewer-mode-pinned-1440x900.png",
      "desktop-1440x900"
    );

    // Close Details → resume from pinned ratio (default policy)
    await clickSelector(client, "button[data-m8a-v47-control-id='details-close']");
    state = await inspectReviewerState(client);
    assert(
      state.toastSuppressed === "false",
      "Phase 4: closing Details must clear toast suppression: " + state.toastSuppressed
    );
    assert(
      state.replayClockMode !== "inspector-pinned",
      "Phase 4: closing Details must exit inspector-pinned"
    );
    manifest.checks.push("desktop-inspector-close-clears-suppression-and-resumes");

    // Verify the auto-pause path: when reviewModeOn=true and natural transition occurs,
    // mode -> review-auto-paused. We simulate by toggling review mode on (default-on
    // already), seeking to start, letting replay tick across W1->W2.
    await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const replayClock = capture?.replayClock;
        const replayState = replayClock?.getState?.();
        if (replayClock && replayState?.startTime && replayState?.stopTime) {
          const start = Date.parse(replayState.startTime);
          const stop = Date.parse(replayState.stopTime);
          replayClock.seek(new Date(start + (stop - start) * 0.18).toISOString());
        }
        capture?.m8aV4GroundStationScene?.play?.();
      })()`
    );
    // Wait for replay to advance across W1 -> W2 boundary at ratio ~0.2
    let autoPauseObserved = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const probe = await inspectReviewerState(client);
      if (probe.replayClockMode === "review-auto-paused") {
        autoPauseObserved = true;
        state = probe;
        break;
      }
      await sleep(120);
    }
    assert(
      autoPauseObserved,
      "Phase 4: review mode auto-pause must engage on natural W1->W2 transition"
    );
    assert(
      state.modeLabel.hidden === true ||
        /Auto-pause: review mode/.test(state.modeLabel.textContent ?? "") === false,
      "Phase 4: auto-pause does not require open inspector; label only shown when inspector open"
    );
    assert(
      state.status.announcedMode === "review-auto-paused",
      "Phase 4: ARIA region must announce review-auto-paused: " + state.status.announcedMode
    );
    manifest.checks.push("desktop-review-auto-pause-on-natural-transition");
    await captureAndRecord(
      client,
      manifest,
      "reviewer-mode-auto-pause-1440x900.png",
      "desktop-1440x900"
    );

    // Narrow modal contract
    await setViewport(client, VIEWPORTS.narrow);
    await sleep(280);
    await clickSelector(client, "button[data-m8a-v47-control-id='details-close']");
    await sleep(200);
    await clickSelector(client, "button[data-m8a-v47-control-id='details-toggle']");
    state = await inspectReviewerState(client);
    assert(state.sheet.visible, "Phase 4 narrow: inspector sheet must be visible when open");
    assert(
      state.sheet.rect && state.sheet.rect.width >= 380 && state.sheet.rect.height >= 800,
      "Phase 4 narrow: inspector must be full-screen modal (>=380x800): " + JSON.stringify(state.sheet.rect)
    );
    manifest.checks.push("narrow-inspector-is-full-screen-modal-100dvh");
    await captureAndRecord(
      client,
      manifest,
      "narrow-modal-390x844.png",
      "narrow-390x844"
    );

    // Drawer rail open behavior
    await clickSelector(client, "button[data-m8a-v47-control-id='details-close']");
    await sleep(200);
    state = await inspectReviewerState(client);
    assert(state.railTriggerVisible, "Phase 4 narrow: handover rail trigger must be visible");
    await clickSelector(client, "button[data-m8a-v411-narrow-rail-trigger='true']");
    state = await inspectReviewerState(client);
    assert(
      state.railDrawerState === "open",
      "Phase 4 narrow: clicking trigger must open drawer: " + state.railDrawerState
    );
    manifest.checks.push("narrow-drawer-rail-open-via-trigger");
    await captureAndRecord(
      client,
      manifest,
      "narrow-drawer-390x844.png",
      "narrow-390x844"
    );

    // Tablet portrait
    await clickSelector(client, "button[data-m8a-v411-handover-rail-close='true']");
    await setViewport(client, VIEWPORTS.tabletPortrait);
    await sleep(280);
    await clickSelector(client, "button[data-m8a-v47-control-id='details-toggle']");
    state = await inspectReviewerState(client);
    assert(
      state.sheet.rect && state.sheet.rect.width >= 600 && state.sheet.rect.height >= 700,
      "Phase 4 tablet portrait: inspector must be near-full-screen: " + JSON.stringify(state.sheet.rect)
    );
    manifest.checks.push("tablet-portrait-inspector-near-full-screen");
    await captureAndRecord(
      client,
      manifest,
      "tablet-portrait-768x1024.png",
      "tablet-portrait-768x1024"
    );

    // Tablet landscape (constrained desktop)
    await clickSelector(client, "button[data-m8a-v47-control-id='details-close']");
    await setViewport(client, VIEWPORTS.tabletLandscape);
    await sleep(280);
    state = await inspectReviewerState(client);
    assert(
      state.railTriggerVisible === false,
      "Phase 4 tablet landscape: rail trigger must NOT be visible (rail stays as desktop variant)"
    );
    manifest.checks.push("tablet-landscape-constrained-desktop-rail-visible");
    await captureAndRecord(
      client,
      manifest,
      "tablet-landscape-1024x768.png",
      "tablet-landscape-1024x768"
    );

    manifest.softening.push(
      "Phase 4 (spec v2 §7, §8): reviewer mode state machine + designed narrow/tablet surfaces. Existing <=720px graceful-degradation rules in m8a-v411-inspector-concurrency.css and m8a-v411-phase-b-layout.css are superseded by m8a-v411-narrow.css. Existing V4.7.1 / V4.9 narrow non-overlap assertions are softened in their respective smokes (cite spec v2 §8.2). Existing V4.11 Correction A Phase E narrow-fallback-hide-strip-and-rail assertion is softened (cite spec v2 §8.1, §8.3). Toast queue/suppress/discard logic is per spec v2 §7.3."
    );
    manifest.checks.push("phase-4-skill-queries-not-runnable-skills-directory-empty");
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log(JSON.stringify({
    status: "passed",
    captureCount: manifest.captures.length,
    checks: manifest.checks,
    softening: manifest.softening
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
