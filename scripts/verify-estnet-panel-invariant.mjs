#!/usr/bin/env node
// ESTNeT panel opt-in invariant gate (verify:estnet:panel).
//
// Guards the LOAD-BEARING rule that the opt-in ESTNeT packet-trace surface —
// a one-line summary CARD in the pair panel, a second side panel shown as a
// TAB ("Pair analysis | ESTNeT") in the same rectangle, and a THIN bottom
// chart STRIP that leaves the globe visible (panel-density fifth pass,
// 2026-07-03) — never touches the accepted single-link default surface:
//
//   - DEFAULT (fresh profile, no ?estnet=1, no stored mode): the card, the
//     tab panel and the strip are ABSENT (and no body[data-estnet-tab]), the
//     toolbar toggle reads off, and the page loads with ZERO console errors
//     and ZERO uncaught exceptions / unhandled promise rejections.
//   - Toggling ON only ADDS the one card row to the pair panel (structural
//     signature comparison, no pixels), auto-activates the ESTNeT tab (the
//     pair panel is HIDDEN via a body attribute, its DOM untouched) and
//     opens the chart strip.
//   - The strip is SPLIT-SCREEN, not an overlay (sixth pass, 2026-07-03):
//     while it is open the body carries `data-estnet-strip-open` and the
//     Cesium viewer shell shrinks by the strip height — asserted from
//     client rects as canvas bottom ≤ strip top (zero overlap, so the
//     globe is never covered on short viewports) with the strip running
//     full width; closing the strip or toggling OFF removes the attribute
//     and restores the full-height canvas.
//   - Every manifest trace is selectable (in the tab panel) without an error
//     block; each trace's y-axis semantic is asserted via the STRIP chart's
//     `data-y-axis` attribute (never by crawling SVG internals); the tab and
//     strip mounts must render the same trace. Density contract: the
//     verbatim assumptionSet/nonClaims text does NOT render in the card, the
//     tab panel or the strip — the tab carries a one-line honesty POINTER
//     (title + non-claim count + "Report" hint, not an expandable) and the
//     per-trace checks assert the verbatim text is ABSENT from that DOM; the
//     intro stays a one-liner and the model-delta block renders as
//     always-visible per-orbit Δ cards. Badges are label-mapped, so they are
//     presence-checked only.
//   - Report appendix (the report-density landing, and the ONLY place the
//     verbatim honesty text renders): /report opened WITH `estnet=1` renders
//     an "ESTNeT appendix" tab carrying every fixture's assumptionSet +
//     nonClaims verbatim; /report WITHOUT the param has no estnet tab (the
//     accepted default report surface is untouched).
//   - Route↔trace pair binding: the explorer pre-selects the route's own
//     trace (manifest pair hints); a same-pair trace shows the viewer-model
//     overlay, a cross-pair trace hides it AND renders the exact one-line
//     disclosure.
//   - Toggling OFF removes the card, the tab panel AND the strip entirely
//     (querySelector null — removal, not display:none), restores the pair
//     panel, leaves zero estnet nodes, and the panel's structural signature
//     returns to the default exactly.
//   - A `?estnet=1` deep link seeds the mode IN-MEMORY for that load only
//     (nothing persisted until an explicit toggle; storage cleared first —
//     a stored "off" would win over the URL by design).
//   - Recomputes (rain drags) keep the card and the active tab, update
//     content, and NEVER re-open a strip the user explicitly closed;
//     clicking the active ESTNeT tab re-opens it rebuilt from the latest
//     result; the "Pair analysis" tab restores the default panel.
//
// A FRESH Chrome profile is mandatory, not an optimization: an explicit
// toggle persists the display mode in localStorage (`estnet-display-mode`),
// and a `?estnet=1` deep link seeds the mode in-memory for that load
// (src/features/multi-station-selector/estnet-display-mode.ts) — a reused
// profile that ever toggled the opt-in would make the default-off assertion
// vacuously wrong in both directions.
//
// The check navigates the canonical pinned demo route (resolved from the
// demo-scenario config single source) with NO estnet parameter and reads the
// live DOM over CDP. It reuses an already-running Vite dev server on :5173
// (never kills one it did not start — R6 concurrent sessions) and only
// self-spawns when the port is free. This is a BROWSER gate (slow); it is
// intentionally NOT wired into `npm test` — run it standalone via
// `npm run verify:estnet:panel`, like verify:g1 / verify:tle.
//
// Usage:
//   npm run verify:estnet:panel
//   node scripts/verify-estnet-panel-invariant.mjs [--port=<cdp-port>]

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SELECTED_PAIR_DEMO_BASE_URL } from "./helpers/demo-routes.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CHROMIUM_CANDIDATES = [
  "/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
  "/usr/bin/google-chrome"
];
const CHROMIUM_PATH = CHROMIUM_CANDIDATES.find((p) => existsSync(p));

const portArg = process.argv
  .find((a) => a.startsWith("--port="))
  ?.split("=")[1];
const CDP_PORT = Number(portArg) || 9473;
// The demo base URL is pinned to :5173 (scripts/helpers/demo-routes.mjs), so
// the self-spawned dev server must use that port for the URL to match.
const VITE_PORT = 5173;
const profileDir = join(tmpdir(), `sgv-estnet-panel-${CDP_PORT}`);

let ws = null;
let messageId = 0;
const pending = new Map();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Page-level console errors + uncaught exceptions (which in CDP also cover
// unhandled promise rejections, reported as "Uncaught (in promise) …").
const consoleErrors = [];
const pageExceptions = [];
// Set true by Page.loadEventFired; reset before each Page.navigate. CDP's
// Page.navigate resolves when the command is ACKed, not when the new document
// is loaded — asserting against the old document is a false-pass race
// (Gemini review finding, 2026-07-02).
let loadFired = false;

function send(method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve: resolvePromise, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evald(expression, awaitPromise = false) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (exceptionDetails) {
    throw new Error(
      `evaluate threw: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`
    );
  }
  return result.value;
}

async function waitForPort(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`timed out waiting for ${label} (${url})`);
}

async function isServing(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function connectToPage(port) {
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data.toString());
    if (data.method === "Page.loadEventFired") {
      loadFired = true;
      return;
    }
    if (data.method === "Runtime.consoleAPICalled" && data.params?.type === "error") {
      consoleErrors.push(
        (data.params.args ?? [])
          .map((a) => a.value ?? a.description ?? a.type)
          .join(" ")
          .slice(0, 300)
      );
      return;
    }
    if (data.method === "Runtime.exceptionThrown") {
      const d = data.params?.exceptionDetails;
      pageExceptions.push(
        `${d?.text ?? "exception"}: ${d?.exception?.description ?? ""}`.slice(0, 300)
      );
      return;
    }
    if (!data.id || !pending.has(data.id)) return;
    const { resolve: resolvePromise, reject, method } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(`${method}: ${data.error.message}`));
    else resolvePromise(data.result);
  });
  await new Promise((resolvePromise, reject) => {
    ws.addEventListener("open", () => resolvePromise(), { once: true });
    ws.addEventListener("error", () => reject(new Error("cdp open failed")), {
      once: true
    });
  });
}

// Navigate and wait for the NEW document: Page.navigate only ACKs the
// command, so the poll below must anchor to the load event — otherwise the
// still-live OLD document (readyState "complete", panel "ready") passes the
// readiness checks and the next evaluate lands in a destroyed context.
async function navigate(url, timeoutMs = 60000) {
  loadFired = false;
  await send("Page.navigate", { url });
  const start = Date.now();
  while (!loadFired) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for load event of ${url}`);
    }
    await delay(100);
  }
}

// Evaluate that tolerates a navigation tearing down the execution context
// mid-poll: a destroyed-context error reads as "not ready yet", never a
// crash. Only the poll loops use this; single-shot asserts keep evald.
async function evalPoll(expression) {
  try {
    return await evald(expression);
  } catch (error) {
    if (/Cannot find context|Execution context was destroyed|Inspected target navigated/i.test(String(error))) {
      return undefined;
    }
    throw error;
  }
}

// Clean-load wait: the document must be fully loaded AND the side panel must
// have reached its ready state before any DOM assertion runs — asserting a
// section "absent" against a panel that has not rendered yet would pass
// vacuously.
async function waitPanelReady(timeoutMs = 60000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await evalPoll(`(() => {
      if (document.readyState !== "complete") return "document:" + document.readyState;
      const p = document.querySelector('[data-v4-projection-side-panel="true"]');
      return p ? (p.dataset.state ?? "no-state") : "no-panel";
    })()`);
    if (last === "ready") return;
    await delay(100);
  }
  throw new Error(`panel never ready; last=${last}`);
}

function readDefaultState() {
  return evald(`(() => {
    const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
    const toggle = document.querySelector('[data-estnet-trace-toggle="true"]');
    return {
      panelState: panel ? (panel.dataset.state ?? null) : null,
      estnetCard: Boolean(document.querySelector('[data-estnet-summary-card="true"]')),
      estnetTabPanel: Boolean(document.querySelector('[data-estnet-tab-panel="true"]')),
      estnetStrip: Boolean(document.querySelector('[data-estnet-strip="true"]')),
      bodyTabAttr: document.body.getAttribute("data-estnet-tab"),
      bodyStripAttr: document.body.getAttribute("data-estnet-strip-open"),
      togglePresent: Boolean(toggle),
      toggleEnabled: toggle ? (toggle.dataset.estnetEnabled ?? null) : null,
      storedMode: (() => {
        try {
          return window.localStorage.getItem("estnet-display-mode");
        } catch {
          return "ERR";
        }
      })(),
      search: window.location.search
    };
  })()`);
}

// Structural signature of the side panel's rows: per top-level row, tag +
// full class list + descendant element count + a hash of the full descendant
// tag/class sequence. "Opt-in only ADDS" and "off restores the default" are
// asserted as: signature-with-section minus the estnet row === default
// signature, exactly. The descendant hash makes a destructive mutation of a
// default row's inner DOM visible (codex + Gemini convergent finding) while
// staying deterministic — the replay clock is paused before the first
// capture, and text content is deliberately excluded (functional text is
// verify:g1's job; this check owns STRUCTURE).
const PANEL_SIGNATURE_EXPR = `(() => {
  const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
  if (!panel) return null;
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  };
  return Array.from(panel.children, (el) => {
    const inner = Array.from(el.querySelectorAll("*"), (n) => n.tagName + "." + n.className).join(",");
    return el.tagName + ":" + el.className + ":" + el.querySelectorAll("*").length + ":" + hash(inner);
  });
})()`;

// One read of everything the estnet card + tab-panel + strip assertions need.
function readEstnetState() {
  return evald(`(() => {
    const cards = document.querySelectorAll('[data-estnet-summary-card="true"]');
    const tabs = document.querySelectorAll('[data-estnet-tab-panel="true"]');
    const strips = document.querySelectorAll('[data-estnet-strip="true"]');
    const tab = tabs[0] ?? null;
    const strip = strips[0] ?? null;
    const mount = tab?.querySelector(".v4-estnet-trace__mount") ?? null;
    const chartMount = strip?.querySelector(".v4-estnet-trace__chart-mount") ?? null;
    const note = mount?.querySelector('[data-pair-mismatch="true"]') ?? null;
    const honesty = mount?.querySelector('[data-honesty-pointer="true"]') ?? null;
    const modelDeltaEl = mount?.querySelector('[data-model-delta="true"]') ?? null;
    const pairPanel = document.querySelector('[data-v4-projection-side-panel="true"]');
    return {
      cardCount: cards.length,
      tabCount: tabs.length,
      stripCount: strips.length,
      tabActive: tab ? !tab.hidden : null,
      stripVisible: strip ? !strip.hidden : null,
      bodyTabAttr: document.body.getAttribute("data-estnet-tab"),
      bodyStripAttr: document.body.getAttribute("data-estnet-strip-open"),
      pairPanelDisplayed: pairPanel
        ? window.getComputedStyle(pairPanel).display !== "none"
        : null,
      loading: mount ? mount.dataset.loading === "true" : null,
      variant: mount?.dataset.variant ?? null,
      chartVariant: chartMount?.dataset.variant ?? null,
      errorBlock: Boolean(mount?.querySelector(".v4-estnet-trace__error")),
      yAxis: chartMount?.querySelector("svg")?.dataset.yAxis ?? null,
      pairNote: note ? note.textContent : null,
      modelDelta: Boolean(modelDeltaEl),
      deltaCards: Array.from(
        modelDeltaEl?.querySelectorAll(".v4-estnet-trace__delta-card") ?? [],
        (card) => ({
          orbit: card.dataset.orbit ?? null,
          figure:
            card.querySelector('[data-delta-figure="true"]')?.textContent ?? ""
        })
      ),
      modelLine: Boolean(chartMount?.querySelector(".v4-estnet-trace__svg-model-line")),
      introChars:
        tab?.querySelector(".v4-estnet-trace__intro")?.textContent.length ?? null,
      honestyPresent: Boolean(honesty),
      honestyIsExpandable: honesty ? honesty.tagName === "DETAILS" : null,
      honestyLine: honesty ? honesty.textContent : null,
      wallSelectorsPresent: Boolean(
        mount?.querySelector(".v4-estnet-trace__assumptions") ||
          mount?.querySelector(".v4-estnet-trace__nonclaims")
      ),
      // Verbatim-absence surface: tab panel + chart strip + summary card.
      panelText:
        (tab ? tab.textContent : "") +
        "\\n" +
        (strip ? strip.textContent : "") +
        "\\n" +
        (cards[0] ? cards[0].textContent : ""),
      buttons: Array.from(
        tab?.querySelectorAll(".v4-estnet-trace__toggle-btn") ?? [],
        (b) => b.dataset.variant
      ),
      activeButton:
        tab?.querySelector(".v4-estnet-trace__toggle-btn--active")?.dataset.variant ?? null,
      storedMode: (() => {
        try {
          return window.localStorage.getItem("estnet-display-mode");
        } catch {
          return "ERR";
        }
      })()
    };
  })()`);
}

// Split-screen geometry read (sixth pass, 2026-07-03): the strip must never
// cover the globe. While it is open, body[data-estnet-strip-open] shrinks
// the Cesium viewer shell by the strip height, so the canvas bottom must sit
// at (or above) the strip top; a closed strip / OFF must restore the
// full-height canvas. Client rects are CSS-layout truths — reading them
// forces a reflow, so the assertion is deterministic under the fixed
// emulation viewport (no need to wait for Cesium's own drawing-buffer
// resize, which follows via widget.resize() in the render loop).
function readSplitState() {
  return evald(`(() => {
    const strip = document.querySelector('[data-estnet-strip="true"]');
    const canvas = document.querySelector(".viewer-root .cesium-widget canvas");
    const shell = document.querySelector(".viewer-shell");
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    const stripRect = strip && !strip.hidden ? strip.getBoundingClientRect() : null;
    return {
      bodyStripAttr: document.body.getAttribute("data-estnet-strip-open"),
      stripVisible: strip ? !strip.hidden : null,
      stripTop: stripRect ? stripRect.top : null,
      stripLeft: stripRect ? stripRect.left : null,
      stripRight: stripRect ? stripRect.right : null,
      canvasBottom: canvasRect ? canvasRect.bottom : null,
      shellBottom: shell ? shell.getBoundingClientRect().bottom : null,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight
    };
  })()`);
}

async function waitForCondition(expr, timeoutMs, label) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await evalPoll(expr);
    if (last === true) return;
    await delay(100);
  }
  throw new Error(`timed out waiting for ${label}; last=${JSON.stringify(last)}`);
}

// Wait until the estnet section exists AND its mount finished loading a trace.
function waitEstnetLoaded(timeoutMs = 30000) {
  return waitForCondition(
    `(() => {
      const tab = document.querySelector('[data-estnet-tab-panel="true"]');
      if (!tab || tab.hidden) return false;
      const m = tab.querySelector(".v4-estnet-trace__mount");
      const c = document.querySelector('[data-estnet-strip="true"] .v4-estnet-trace__chart-mount');
      return Boolean(
        m && m.dataset.loading !== "true" && m.dataset.variant &&
        c && c.dataset.loading !== "true"
      );
    })()`,
    timeoutMs,
    "estnet tab active with a loaded trace (tab + chart mounts)"
  );
}

function clickEstnetToggle() {
  return evald(
    `(() => { const b = document.querySelector('[data-estnet-trace-toggle="true"]'); if (!b) return false; b.click(); return true; })()`
  );
}

// Expected-model helpers, computed from the SAME fixtures the page renders
// (fetched from the same dev server — single source, no duplicated constants).
function latencySemanticOf(fixture) {
  return fixture.latencySemantic === "rtt" || fixture.latencySemantic === "none"
    ? fixture.latencySemantic
    : "one-way";
}
// Mirrors buildChart's primary-series rule exactly, including the
// latency-less edge (a one-way trace whose samples all lost their latency
// falls back to throughput, then to "none") — an axis expectation derived
// from the semantic alone would diverge there (Gemini review finding).
function expectedYAxis(fixture) {
  const semantic = latencySemanticOf(fixture);
  const hasLatency =
    semantic !== "none" &&
    fixture.samples.some(
      (s) => typeof s.latencyMs === "number" && Number.isFinite(s.latencyMs)
    );
  if (hasLatency) {
    return semantic === "rtt" ? "rtt" : "ms";
  }
  const hasThroughput = fixture.samples.some(
    (s) =>
      typeof s.throughputMbps === "number" &&
      Number.isFinite(s.throughputMbps) &&
      s.throughputMbps > 0
  );
  return hasThroughput ? "mbps" : "none";
}
// Mirrors selectManifestEntryForRoute's tie-breaker exactly: same-pair
// matches first (default:true beats manifest order), else the global default.
function expectedEntryForRoute(manifest, routeA, routeB) {
  const samePair = manifest.traces.filter(
    (t) =>
      typeof t.stationA === "string" &&
      typeof t.stationB === "string" &&
      endpointsMatchRoute({ a: t.stationA, b: t.stationB }, routeA, routeB)
  );
  if (samePair.length > 0) {
    return samePair.find((t) => t.default === true) ?? samePair[0];
  }
  return manifest.traces.find((t) => t.default === true) ?? manifest.traces[0];
}
function declaredEndpoints(fixture) {
  const a = fixture.metadata?.stationA?.id;
  const b = fixture.metadata?.stationB?.id;
  return typeof a === "string" && typeof b === "string" ? { a, b } : null;
}
// Exact two-sided assignment, mirroring the src predicate — set membership
// would let a degenerate same-id endpoint pair match any route containing
// that id (Gemini review finding).
function endpointsMatchRoute(endpoints, routeA, routeB) {
  return (
    (endpoints.a === routeA && endpoints.b === routeB) ||
    (endpoints.a === routeB && endpoints.b === routeA)
  );
}
function expectedPairNote(fixture, routeA, routeB) {
  const endpoints = declaredEndpoints(fixture);
  if (!endpoints || endpointsMatchRoute(endpoints, routeA, routeB)) {
    return null;
  }
  return (
    `trace endpoints ${endpoints.a} / ${endpoints.b} ≠ current route ` +
    `${routeA} / ${routeB} — viewer-model overlay hidden`
  );
}

const failures = [];
const log = [];
function check(name, cond, detail) {
  log.push({ name, passed: Boolean(cond), detail });
  if (!cond) failures.push({ name, detail });
}

// Report-button probe (dual-review fold, 2026-07-02): stubs window.open,
// clicks the panel's REAL "Open evidence report" button, and captures the two
// contract seams the /report-URL E2E below cannot see — the URL the button
// actually builds (must append estnet=1 exactly when the mode is on) and the
// mock-window fallback write (the async appendix path must honor the same
// opt-in). Returns null when the button is missing.
async function probeReportButton() {
  const started = await evald(`(() => {
    const button = document.querySelector('[data-report-action="open-html"]');
    if (!button) return false;
    const originalOpen = window.open;
    const probe = { url: null, writtenHtml: "", done: false };
    window.__estnetReportProbe = probe;
    const fakeWindow = {
      document: {
        open() { probe.writtenHtml = ""; },
        write(v) { probe.writtenHtml += String(v); },
        close() { probe.done = true; }
      },
      focus() {},
      set opener(_) {}
    };
    window.open = (url) => { probe.url = String(url); return fakeWindow; };
    try { button.click(); } finally { window.open = originalOpen; }
    return true;
  })()`);
  if (!started) return null;
  await waitForCondition(
    `Boolean(window.__estnetReportProbe) && window.__estnetReportProbe.done === true`,
    30000,
    "report-button mock-window write completed"
  );
  return evald(`(() => {
    const probe = window.__estnetReportProbe;
    delete window.__estnetReportProbe;
    return {
      url: probe.url,
      wroteReport: probe.writtenHtml.includes("data-report-filename"),
      hasAppendixTab: probe.writtenHtml.includes('data-tab-target="estnet"'),
      hasAppendixLabel: probe.writtenHtml.includes("ESTNeT appendix")
    };
  })()`);
}

let vite = null;
let chrome = null;
try {
  if (!CHROMIUM_PATH) throw new Error("no chromium binary found");

  // 1. dev server: reuse an already-running one on the pinned port (a
  // concurrent `npm run dev` or another session's server) rather than spawning
  // a second; only self-spawn when 5173 is free. The finally block kills only
  // `vite`, which stays null when reused (R6: never kill a server we did not
  // start).
  if (await isServing(`http://127.0.0.1:${VITE_PORT}/`)) {
    console.error(`[verify:estnet:panel] reusing dev server already on :${VITE_PORT}`);
  } else {
    vite = spawn(
      "npm",
      ["run", "dev", "--", "--port", String(VITE_PORT), "--strictPort"],
      {
        cwd: REPO_ROOT,
        stdio: ["ignore", "ignore", "ignore"],
        // New process group so teardown can signal the whole tree (npm -> sh
        // -> node vite); signalling the npm wrapper alone can orphan the Vite
        // grandchild, leaving :5173 held.
        detached: true
      }
    );
    await waitForPort(`http://127.0.0.1:${VITE_PORT}/`, 60000, "vite");
  }

  // 2. chromium with a FRESH profile. Preflight the CDP port: if another
  // Chrome already owns it, our spawn would fail to bind yet connectToPage
  // would attach to and drive THAT browser. Refuse instead of hijacking.
  if (await isServing(`http://127.0.0.1:${CDP_PORT}/json/version`)) {
    throw new Error(
      `CDP port ${CDP_PORT} already in use; pass --port=<free-port> so the gate does not attach to an unrelated Chrome`
    );
  }
  rmSync(profileDir, { recursive: true, force: true });
  chrome = spawn(
    CHROMIUM_PATH,
    [
      "--headless=new",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "--window-size=1600,1000",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  chrome.unref();
  await waitForPort(`http://127.0.0.1:${CDP_PORT}/json/version`, 15000, "cdp");
  await connectToPage(CDP_PORT);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });

  // 3. default load: the pinned demo route with NO estnet parameter.
  const defaultUrl = SELECTED_PAIR_DEMO_BASE_URL;
  if (/[?&]estnet=/.test(defaultUrl)) {
    throw new Error(`pinned demo route unexpectedly carries an estnet param: ${defaultUrl}`);
  }
  await navigate(defaultUrl);
  await waitPanelReady();
  // Freeze the replay clock so structural signatures (timeline markers) stay
  // deterministic between the default and opt-in captures.
  await evald(
    `(() => { const c = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.replayClock; if (c) c.pause(); return true; })()`
  );
  // Let late async work (fixture fetches, worker responses) surface any error.
  await delay(1500);

  const s0 = await readDefaultState();
  check(
    "default-estnet-card-tab-strip-absent (opt-in surface must not exist without opt-in)",
    s0.estnetCard === false &&
      s0.estnetTabPanel === false &&
      s0.estnetStrip === false &&
      s0.bodyTabAttr === null &&
      s0.bodyStripAttr === null,
    s0
  );
  check("default-panel-ready", s0.panelState === "ready", s0.panelState);
  check(
    "default-toggle-present-and-off (toolbar button ships, mode off)",
    s0.togglePresent === true && s0.toggleEnabled === "false",
    { present: s0.togglePresent, enabled: s0.toggleEnabled }
  );
  check(
    "default-storage-not-on (fresh profile: no persisted opt-in)",
    s0.storedMode !== "on",
    s0.storedMode
  );
  check("default-url-no-estnet-param", !s0.search.includes("estnet"), s0.search);
  check(
    "console-clean-while-OFF (zero console.error on the default surface)",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 5)
  );
  check(
    "no-uncaught-exception-or-unhandled-rejection (default load)",
    pageExceptions.length === 0,
    pageExceptions.slice(0, 5)
  );

  // 3b. report-button probe while OFF: the REAL button (not a hand-built
  // /report URL) must neither leak the estnet param nor write an appendix
  // into the mock-window fallback — the accepted default report delivery
  // path stays untouched.
  const probeOff = await probeReportButton();
  check(
    "default-report-button-url-has-no-estnet-param (opt-in never leaks into the default report URL)",
    probeOff !== null &&
      typeof probeOff.url === "string" &&
      !probeOff.url.includes("estnet="),
    probeOff && probeOff.url
  );
  check(
    "default-report-button-fallback-write-has-no-appendix (mock-window write = default surface)",
    probeOff !== null &&
      probeOff.wroteReport === true &&
      probeOff.hasAppendixTab === false &&
      probeOff.hasAppendixLabel === false,
    probeOff
  );

  // Expected-model inputs: the manifest + every fixture, fetched from the same
  // server the page renders from, plus the pinned route's pair ids.
  const serverBase = `http://127.0.0.1:${VITE_PORT}`;
  const manifest = await (
    await fetch(`${serverBase}/fixtures/estnet/manifest.json`)
  ).json();
  const fixturesByEntryId = new Map();
  for (const entry of manifest.traces) {
    fixturesByEntryId.set(
      entry.id,
      await (await fetch(serverBase + entry.url)).json()
    );
  }
  const pinnedParams = new URL(defaultUrl).searchParams;
  const routeA = pinnedParams.get("stationA");
  const routeB = pinnedParams.get("stationB");

  // 4. toggle ON (no reload): only ADDS the one disclosure section.
  const sigDefault = await evald(PANEL_SIGNATURE_EXPR);
  check("default-panel-signature-readable", Array.isArray(sigDefault) && sigDefault.length > 0, sigDefault);
  check("ON-click-toggle", await clickEstnetToggle(), null);
  await waitEstnetLoaded();
  const sigOn = await evald(PANEL_SIGNATURE_EXPR);
  const estnetRowIndex = sigOn.findIndex((sig) => sig.includes("v4-estnet-trace"));
  const sigOnWithoutSection = sigOn.filter((_, i) => i !== estnetRowIndex);
  check(
    "ON-only-adds-the-card (structural signature: default panel rows all survive, exactly one card row added)",
    estnetRowIndex >= 0 &&
      sigOn.length === sigDefault.length + 1 &&
      JSON.stringify(sigOnWithoutSection) === JSON.stringify(sigDefault),
    { sigDefault, sigOn }
  );
  const sOn = await readEstnetState();
  check(
    "ON-card-present-once (pair panel carries exactly one summary card)",
    sOn.cardCount === 1,
    sOn.cardCount
  );
  check(
    "ON-tab-auto-activates (live toggle-on switches to the ESTNeT tab, not just a card)",
    sOn.tabCount === 1 && sOn.tabActive === true && sOn.bodyTabAttr === "on",
    { tabs: sOn.tabCount, active: sOn.tabActive, attr: sOn.bodyTabAttr }
  );
  check(
    "ON-pair-panel-hidden-while-tab-active (tab swap, DOM untouched)",
    sOn.pairPanelDisplayed === false,
    sOn.pairPanelDisplayed
  );
  check(
    "ON-chart-strip-open (thin bottom strip carries the chart; globe stays visible)",
    sOn.stripCount === 1 && sOn.stripVisible === true,
    { strips: sOn.stripCount, visible: sOn.stripVisible }
  );
  const splitOn = await readSplitState();
  check(
    "ON-split-screen-zero-overlap (body attr set; canvas bottom ≤ strip top — the strip never covers the globe)",
    splitOn.bodyStripAttr === "on" &&
      typeof splitOn.canvasBottom === "number" &&
      typeof splitOn.stripTop === "number" &&
      splitOn.canvasBottom <= splitOn.stripTop + 0.5,
    splitOn
  );
  check(
    "ON-strip-full-width (split layout: the shell yields the bottom row, so no side-panel column is reserved)",
    typeof splitOn.stripLeft === "number" &&
      typeof splitOn.stripRight === "number" &&
      splitOn.stripLeft <= 0.5 &&
      splitOn.stripRight >= splitOn.innerWidth - 0.5,
    splitOn
  );
  check(
    "ON-chart-and-tab-render-the-same-trace (split mounts stay in lockstep)",
    typeof sOn.variant === "string" && sOn.variant === sOn.chartVariant,
    { tab: sOn.variant, chart: sOn.chartVariant }
  );
  check("ON-storage-on (persisted opt-in)", sOn.storedMode === "on", sOn.storedMode);
  check(
    "ON-menu-lists-every-manifest-trace",
    JSON.stringify(sOn.buttons) === JSON.stringify(manifest.traces.map((t) => t.id)),
    { got: sOn.buttons, want: manifest.traces.map((t) => t.id) }
  );
  const expectedPreselect = expectedEntryForRoute(manifest, routeA, routeB);
  check(
    "ON-preselects-the-route's-own-trace (pair hints + default tie-break)",
    sOn.variant === expectedPreselect.id && sOn.activeButton === expectedPreselect.id,
    { got: sOn.variant, want: expectedPreselect.id }
  );
  check(
    "ON-intro-is-a-one-liner (panel-density rule: prose walls live in the report)",
    typeof sOn.introChars === "number" && sOn.introChars > 0 && sOn.introChars <= 160,
    sOn.introChars
  );

  // 5. menu walk: every manifest trace selectable; per-trace axis semantics,
  // verbatim honesty text, pair note and overlay expectations — all computed
  // from the fixture JSON itself.
  for (const entry of manifest.traces) {
    await evald(
      `(() => { const b = document.querySelector('.v4-estnet-trace__toggle-btn[data-variant="${entry.id}"]'); if (!b) return false; b.click(); return true; })()`
    );
    await waitForCondition(
      `(() => {
        const m = document.querySelector('[data-estnet-tab-panel="true"] .v4-estnet-trace__mount');
        return Boolean(m && m.dataset.loading !== "true" && m.dataset.variant === ${JSON.stringify(entry.id)});
      })()`,
      30000,
      `trace ${entry.id} rendered`
    );
    const s = await readEstnetState();
    const fixture = fixturesByEntryId.get(entry.id);
    check(
      `menu[${entry.id}]-selectable-without-error`,
      s.errorBlock === false && s.variant === entry.id && s.activeButton === entry.id,
      { errorBlock: s.errorBlock, variant: s.variant }
    );
    check(
      `menu[${entry.id}]-y-axis-semantic (data-y-axis == ${expectedYAxis(fixture)})`,
      s.yAxis === expectedYAxis(fixture),
      { got: s.yAxis, want: expectedYAxis(fixture) }
    );
    // Panel-density second pass: the panel carries the honesty CLAIM (one
    // non-expandable pointer line with the count) and NONE of the verbatim
    // text — the character-exact assumptionSet/nonClaims anchor is the report
    // appendix E2E below (report-appendix[id]-honesty-text-verbatim).
    check(
      `menu[${entry.id}]-honesty-pointer-line (count + report pointer, not an expandable)`,
      s.honestyPresent === true &&
        s.honestyIsExpandable === false &&
        typeof s.honestyLine === "string" &&
        s.honestyLine.includes(`${(fixture.nonClaims ?? []).length} non-claims`) &&
        s.honestyLine.includes("Report"),
      { got: s.honestyLine, expandable: s.honestyIsExpandable }
    );
    check(
      `menu[${entry.id}]-assumptionSet-NOT-in-panel (report-density: verbatim lives only in the appendix)`,
      s.wallSelectorsPresent === false &&
        (typeof fixture.assumptionSet !== "string" ||
          !s.panelText.includes(fixture.assumptionSet)),
      { wallSelectors: s.wallSelectorsPresent }
    );
    check(
      `menu[${entry.id}]-nonClaims-NOT-in-panel (report-density: verbatim lives only in the appendix)`,
      (fixture.nonClaims ?? []).every((claim) => !s.panelText.includes(claim)),
      null
    );
    const wantNote = expectedPairNote(fixture, routeA, routeB);
    check(
      `menu[${entry.id}]-pair-disclosure-${wantNote ? "shown-verbatim" : "absent"}`,
      s.pairNote === wantNote,
      { got: s.pairNote, want: wantNote }
    );
    const endpoints = declaredEndpoints(fixture);
    const wantOverlay =
      endpoints !== null &&
      endpointsMatchRoute(endpoints, routeA, routeB) &&
      latencySemanticOf(fixture) === "one-way";
    check(
      `menu[${entry.id}]-viewer-model-overlay-${wantOverlay ? "present" : "absent"} (same-pair one-way only)`,
      s.modelDelta === wantOverlay && s.modelLine === wantOverlay,
      { delta: s.modelDelta, line: s.modelLine, want: wantOverlay }
    );
    if (wantOverlay) {
      check(
        `menu[${entry.id}]-model-delta-cards (always-visible per-orbit Δ figures, orbit-tagged)`,
        Array.isArray(s.deltaCards) &&
          s.deltaCards.length > 0 &&
          s.deltaCards.every(
            (card) =>
              typeof card.orbit === "string" &&
              card.orbit.length > 0 &&
              card.figure.includes("ms")
          ),
        { got: s.deltaCards }
      );
    }
  }

  // 5b. report-button probe while ON: the panel's honesty one-liner points at
  // "Report → ESTNeT appendix", so the REAL button must append estnet=1 (ADR
  // 0015 decision 9) and the async mock-window fallback must deliver the
  // appendix — otherwise that pointer overclaims.
  const probeOn = await probeReportButton();
  check(
    "ON-report-button-url-carries-estnet-param (the button appends estnet=1 exactly when the mode is on)",
    probeOn !== null &&
      typeof probeOn.url === "string" &&
      /[?&]estnet=1(&|$)/.test(probeOn.url),
    probeOn && probeOn.url
  );
  check(
    "ON-report-button-fallback-write-carries-appendix (async mock-window path honors the opt-in)",
    probeOn !== null &&
      probeOn.wroteReport === true &&
      probeOn.hasAppendixTab === true &&
      probeOn.hasAppendixLabel === true,
    probeOn
  );

  // 6. toggle OFF: the summary card, the ESTNeT tab panel AND the chart
  // strip are REMOVED (not display:none), the pair panel is visible again,
  // zero estnet nodes remain, and the panel structure returns to the default.
  check("OFF-click-toggle", await clickEstnetToggle(), null);
  await waitForCondition(
    `document.querySelector('[data-estnet-summary-card="true"]') === null &&
     document.querySelector('[data-estnet-tab-panel="true"]') === null &&
     document.querySelector('[data-estnet-strip="true"]') === null`,
    15000,
    "estnet card + tab panel + strip removed"
  );
  const sOff = await evald(`(() => ({
    card: Boolean(document.querySelector('[data-estnet-summary-card="true"]')),
    tab: Boolean(document.querySelector('[data-estnet-tab-panel="true"]')),
    strip: Boolean(document.querySelector('[data-estnet-strip="true"]')),
    bodyTabAttr: document.body.getAttribute("data-estnet-tab"),
    bodyStripAttr: document.body.getAttribute("data-estnet-strip-open"),
    canvasBottom: (() => {
      const c = document.querySelector(".viewer-root .cesium-widget canvas");
      return c ? c.getBoundingClientRect().bottom : null;
    })(),
    innerHeight: window.innerHeight,
    pairPanelDisplayed: (() => {
      const p = document.querySelector('[data-v4-projection-side-panel="true"]');
      return p ? window.getComputedStyle(p).display !== "none" : null;
    })(),
    leftoverNodes: document.querySelectorAll('[class*="v4-estnet"]').length,
    storedMode: (() => { try { return window.localStorage.getItem("estnet-display-mode"); } catch { return "ERR"; } })(),
    toggleEnabled: document.querySelector('[data-estnet-trace-toggle="true"]')?.dataset.estnetEnabled ?? null
  }))()`);
  const sigOff = await evald(PANEL_SIGNATURE_EXPR);
  check(
    "OFF-card-tab-strip-dom-fully-removed (querySelector null — removal, not display:none)",
    sOff.card === false && sOff.tab === false && sOff.strip === false && sOff.bodyTabAttr === null,
    sOff
  );
  check(
    "OFF-pair-panel-visible-again (tab teardown restores the default panel)",
    sOff.pairPanelDisplayed === true,
    sOff.pairPanelDisplayed
  );
  check(
    "OFF-split-screen-restored (strip body attr removed, canvas back to full viewport height)",
    sOff.bodyStripAttr === null &&
      typeof sOff.canvasBottom === "number" &&
      sOff.canvasBottom >= sOff.innerHeight - 0.5,
    { attr: sOff.bodyStripAttr, canvasBottom: sOff.canvasBottom, innerHeight: sOff.innerHeight }
  );
  check("OFF-zero-estnet-node-leftovers", sOff.leftoverNodes === 0, sOff.leftoverNodes);
  check(
    "OFF-panel-structure-restored-to-default (teardown: signature identical)",
    JSON.stringify(sigOff) === JSON.stringify(sigDefault),
    { sigOff, sigDefault }
  );
  check("OFF-storage-off", sOff.storedMode === "off", sOff.storedMode);
  check("OFF-toolbar-toggle-reads-off", sOff.toggleEnabled === "false", sOff.toggleEnabled);

  // 7. ?estnet=1 deep-link seed + cross-route pair binding: navigate a SECOND
  // route (the pair of the first cross-pair hinted trace) with the URL opt-in.
  // Stored mode is cleared first — a persisted "off" wins over the URL seed by
  // design, and this gate must test the seed path, not fight it.
  const crossEntry = manifest.traces.find(
    (t) =>
      typeof t.stationA === "string" &&
      typeof t.stationB === "string" &&
      !endpointsMatchRoute({ a: t.stationA, b: t.stationB }, routeA, routeB)
  );
  if (crossEntry) {
    await evald(`(() => { try { window.localStorage.removeItem("estnet-display-mode"); return true; } catch { return false; } })()`);
    const crossUrl = new URL(defaultUrl);
    crossUrl.searchParams.set("stationA", crossEntry.stationA);
    crossUrl.searchParams.set("stationB", crossEntry.stationB);
    crossUrl.searchParams.set("estnet", "1");
    await navigate(crossUrl.toString());
    await waitPanelReady();
    await waitEstnetLoaded();
    const sCross = await readEstnetState();
    check(
      "seed-url-opt-in-reveals-card-tab-strip (?estnet=1 seeds the mode IN-MEMORY; persistence only on explicit toggle)",
      sCross.cardCount === 1 &&
        sCross.tabCount === 1 &&
        sCross.stripCount === 1 &&
        sCross.storedMode === null,
      { cards: sCross.cardCount, tabs: sCross.tabCount, strips: sCross.stripCount, stored: sCross.storedMode }
    );
    check(
      "seed-tab-auto-activates-and-strip-opens (deep-link demo route shows the explorer without a manual open)",
      sCross.tabActive === true && sCross.stripVisible === true,
      { tab: sCross.tabActive, strip: sCross.stripVisible }
    );
    // The expected pre-selection mirrors the tie-breaker on the NEW route —
    // never just "the entry we navigated by" (that diverges when a pair
    // carries several traces and a later one is default:true).
    const expectedCrossPreselect = expectedEntryForRoute(
      manifest,
      crossEntry.stationA,
      crossEntry.stationB
    );
    check(
      `seed-route-preselects-its-own-trace (${expectedCrossPreselect.id}, not the pinned route's default)`,
      sCross.variant === expectedCrossPreselect.id,
      { got: sCross.variant, want: expectedCrossPreselect.id }
    );
    const crossFixture = fixturesByEntryId.get(expectedCrossPreselect.id);
    check(
      "seed-same-pair-trace-shows-overlay-without-disclosure",
      sCross.pairNote === null &&
        sCross.modelDelta === (latencySemanticOf(crossFixture) === "one-way"),
      { note: sCross.pairNote, delta: sCross.modelDelta }
    );
    // On THIS route the pinned route's traces are the cross-pair ones: pick
    // one and expect the exact disclosure line.
    const nowCrossEntry = manifest.traces.find(
      (t) =>
        typeof t.stationA === "string" &&
        typeof t.stationB === "string" &&
        !endpointsMatchRoute(
          { a: t.stationA, b: t.stationB },
          crossEntry.stationA,
          crossEntry.stationB
        )
    );
    if (nowCrossEntry) {
      await evald(
        `(() => { const b = document.querySelector('.v4-estnet-trace__toggle-btn[data-variant="${nowCrossEntry.id}"]'); if (!b) return false; b.click(); return true; })()`
      );
      await waitForCondition(
        `(() => {
          const m = document.querySelector('[data-estnet-tab-panel="true"] .v4-estnet-trace__mount');
          return Boolean(m && m.dataset.loading !== "true" && m.dataset.variant === ${JSON.stringify(nowCrossEntry.id)});
        })()`,
        30000,
        `cross trace ${nowCrossEntry.id} rendered`
      );
      const sMismatch = await readEstnetState();
      const wantLine = expectedPairNote(
        fixturesByEntryId.get(nowCrossEntry.id),
        crossEntry.stationA,
        crossEntry.stationB
      );
      check(
        "seed-cross-pair-trace-discloses-and-hides-overlay (verbatim line)",
        sMismatch.pairNote === wantLine && sMismatch.modelDelta === false && sMismatch.modelLine === false,
        { got: sMismatch.pairNote, want: wantLine, delta: sMismatch.modelDelta }
      );
    }

    // 7b. re-render behaviour (dual-review fold 2026-07-02, re-anchored to
    // the tab+strip 2026-07-03): close the chart strip via its REAL close
    // button, drag the rain slider (a full recompute + renderResult pass),
    // and require (a) the summary card to survive the panel re-render,
    // (b) the tab to stay active, and (c) the strip to STAY closed —
    // recomputes rebuild content but must never re-open an explicitly
    // closed strip. Runs on the seed page: nothing after this step reads
    // this page's panel signature, so the rain change cannot pollute the
    // earlier structural comparisons.
    const rerenderArmed = await evald(`(() => {
      const closeBtn = document.querySelector('[data-estnet-strip-close="true"]');
      const slider = document.querySelector(".v4-projection-side-panel__rain-slider");
      if (!closeBtn || !slider) return false;
      closeBtn.click();
      slider.value = "5";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    check("seed-rain-rerender-armed (strip closed via its button + slider drag dispatched)", rerenderArmed === true, rerenderArmed);
    await waitForCondition(
      `(() => {
        const p = document.querySelector('[data-v4-projection-side-panel="true"]');
        return Boolean(p && p.dataset.rainRateMmPerHour === "5" &&
          document.querySelector('[data-estnet-summary-card="true"]'));
      })()`,
      120000,
      "rain re-render completed (rain=5 result rendered, card present)"
    );
    const sRerender = await readEstnetState();
    check(
      "seed-rain-rerender-keeps-card-tab-and-respects-strip-close (recompute updates content, never re-opens a closed strip)",
      sRerender.cardCount === 1 &&
        sRerender.tabActive === true &&
        sRerender.stripVisible === false,
      { cards: sRerender.cardCount, tab: sRerender.tabActive, strip: sRerender.stripVisible }
    );
    const splitClosed = await readSplitState();
    check(
      "seed-strip-close-restores-full-canvas (split-screen releases the bottom row on an explicit close)",
      splitClosed.bodyStripAttr === null &&
        typeof splitClosed.canvasBottom === "number" &&
        splitClosed.canvasBottom >= splitClosed.innerHeight - 0.5,
      splitClosed
    );
    // Clicking the active ESTNeT tab button is the in-tab affordance that
    // re-opens the strip; the chart must come back bound to the NEW result.
    const reopened = await evald(`(() => {
      const b = document.querySelector(".v4-estnet-tab-panel__tab--active");
      if (!b) return false;
      b.click();
      return true;
    })()`);
    check("seed-estnet-tab-click-reopens-strip (affordance after a strip close)", reopened === true, reopened);
    await waitEstnetLoaded();
    const sReopen = await readEstnetState();
    check(
      "seed-reopened-strip-renders-the-chart (rebuilt from the latest result, not a stale husk)",
      sReopen.stripVisible === true &&
        typeof sReopen.variant === "string" &&
        sReopen.variant === sReopen.chartVariant &&
        sReopen.errorBlock === false,
      { visible: sReopen.stripVisible, variant: sReopen.variant, chart: sReopen.chartVariant, error: sReopen.errorBlock }
    );
    const splitReopen = await readSplitState();
    check(
      "seed-reopened-strip-zero-overlap (split-screen re-engages on reopen)",
      splitReopen.bodyStripAttr === "on" &&
        typeof splitReopen.canvasBottom === "number" &&
        typeof splitReopen.stripTop === "number" &&
        splitReopen.canvasBottom <= splitReopen.stripTop + 0.5,
      splitReopen
    );
    // 7c. tab swap back: the "Pair analysis" tab restores the default panel
    // (DOM was only hidden, never touched) and hides the estnet surfaces.
    const backClicked = await evald(`(() => {
      const b = document.querySelector('[data-estnet-tab-back="true"]');
      if (!b) return false;
      b.click();
      return true;
    })()`);
    check("seed-back-to-pair-clicked", backClicked === true, backClicked);
    const sBack = await readEstnetState();
    check(
      "seed-back-to-pair-restores-the-panel (estnet tab hidden, strip hidden + split released, pair panel visible)",
      sBack.tabActive === false &&
        sBack.stripVisible === false &&
        sBack.bodyTabAttr === null &&
        sBack.bodyStripAttr === null &&
        sBack.pairPanelDisplayed === true &&
        sBack.cardCount === 1,
      { tab: sBack.tabActive, strip: sBack.stripVisible, attr: sBack.bodyTabAttr, stripAttr: sBack.bodyStripAttr, pair: sBack.pairPanelDisplayed, cards: sBack.cardCount }
    );
  } else {
    check("seed-cross-route-step", false, "no cross-pair hinted manifest entry found — cannot exercise the seed/cross-route step");
  }

  // 8. report appendix — the report-density landing the panel's honesty
  // one-liner points at. /report WITH estnet=1 must carry the "ESTNeT
  // appendix" tab with EVERY fixture's assumptionSet + nonClaims verbatim;
  // /report WITHOUT the param must not have the tab at all (the accepted
  // default report surface, locked by the report golden, stays untouched).
  const reportParams = new URL(defaultUrl).searchParams;
  const reportBase = `http://127.0.0.1:${VITE_PORT}/report?${reportParams.toString()}`;
  const waitReportRendered = () =>
    waitForCondition(
      `Boolean(document.querySelector('[data-tab-panel="summary"]'))`,
      120000,
      "report route rendered"
    );
  await navigate(`${reportBase}&estnet=1`);
  await waitReportRendered();
  const reportState = await evald(`(() => {
    const panel = document.querySelector('[data-tab-panel="estnet"]');
    return {
      tabButton: Boolean(document.querySelector('[data-tab-target="estnet"]')),
      panelPresent: Boolean(panel),
      text: panel ? panel.textContent : ""
    };
  })()`);
  check(
    "report-with-estnet-param-has-appendix-tab",
    reportState.tabButton === true && reportState.panelPresent === true,
    { tabButton: reportState.tabButton, panel: reportState.panelPresent }
  );
  for (const entry of manifest.traces) {
    const fixture = fixturesByEntryId.get(entry.id);
    const missing = [];
    if (
      typeof fixture.assumptionSet === "string" &&
      !reportState.text.includes(fixture.assumptionSet)
    ) {
      missing.push("assumptionSet");
    }
    for (const claim of fixture.nonClaims ?? []) {
      if (!reportState.text.includes(claim)) {
        missing.push(`nonClaim: ${claim.slice(0, 60)}`);
      }
    }
    check(
      `report-appendix[${entry.id}]-honesty-text-verbatim (assumptionSet + every non-claim)`,
      missing.length === 0,
      missing.slice(0, 4)
    );
  }
  await navigate(reportBase);
  await waitReportRendered();
  const reportDefault = await evald(`(() => ({
    tabButton: Boolean(document.querySelector('[data-tab-target="estnet"]')),
    panelPresent: Boolean(document.querySelector('[data-tab-panel="estnet"]'))
  }))()`);
  check(
    "report-without-estnet-param-has-no-appendix (default report surface untouched)",
    reportDefault.tabButton === false && reportDefault.panelPresent === false,
    reportDefault
  );

  // 9. cumulative cleanliness across the whole interaction sequence.
  check(
    "console-clean-cumulative (zero console.error across toggle/menu/seed steps)",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 5)
  );
  check(
    "no-uncaught-exception-or-unhandled-rejection (cumulative)",
    pageExceptions.length === 0,
    pageExceptions.slice(0, 5)
  );
} catch (error) {
  failures.push({ name: "harness", detail: String(error?.stack ?? error) });
} finally {
  try {
    ws?.close();
  } catch {}
  if (chrome) {
    // Graceful first: SIGTERM lets the browser shut its child tree (zygote /
    // GPU / renderers) down itself; a bare SIGKILL on the parent can orphan
    // them (Gemini review finding). SIGKILL stays as the fallback.
    try {
      chrome.kill("SIGTERM");
    } catch {}
    await delay(500);
    try {
      chrome.kill("SIGKILL");
    } catch {}
  }
  if (vite) {
    try {
      process.kill(-vite.pid, "SIGTERM");
    } catch {}
  }
  rmSync(profileDir, { recursive: true, force: true });
}

for (const entry of log) {
  console.log(`${entry.passed ? "PASS" : "FAIL"}  ${entry.name}`);
}
console.log(
  JSON.stringify(
    { checks: log.length, failures: failures.length, failed: failures },
    null,
    2
  )
);
if (failures.length > 0) process.exit(1);
console.log("verify:estnet:panel PASS");
