#!/usr/bin/env node
// ESTNeT panel opt-in invariant gate (verify:estnet:panel).
//
// Guards the LOAD-BEARING rule that the opt-in ESTNeT packet-trace disclosure
// section never touches the accepted single-link default surface:
//
//   - DEFAULT (fresh profile, no ?estnet=1, no stored mode): the section is
//     ABSENT from the side panel, the toolbar toggle reads off, and the page
//     loads with ZERO console errors and ZERO uncaught exceptions / unhandled
//     promise rejections.
//   - Toggling ON only ADDS the one disclosure section — every default panel
//     row survives unchanged (structural signature comparison, no pixels).
//   - Every manifest trace is selectable without an error block; each trace's
//     y-axis semantic is asserted via the chart's `data-y-axis` attribute
//     (never by crawling SVG internals), and its `assumptionSet` + `nonClaims`
//     render VERBATIM from the fixture JSON (badges are label-mapped, so they
//     are presence-checked only).
//   - Route↔trace pair binding: the section pre-selects the route's own trace
//     (manifest pair hints); a same-pair trace shows the viewer-model overlay,
//     a cross-pair trace hides it AND renders the exact one-line disclosure.
//   - Toggling OFF removes the section's DOM entirely (querySelector null —
//     removal, not display:none) with zero leftover estnet nodes, and the
//     panel's structural signature returns to the default exactly.
//   - A `?estnet=1` deep link seeds the persisted mode once (storage cleared
//     first — a stored "off" would win over the URL by design).
//
// A FRESH Chrome profile is mandatory, not an optimization: the display mode
// persists in localStorage (`estnet-display-mode`) and a `?estnet=1` deep link
// SEEDS that persisted mode once (src/features/multi-station-selector/
// estnet-display-mode.ts) — a reused profile that ever saw the opt-in would
// make the default-off assertion vacuously wrong in both directions.
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

// Clean-load wait: the document must be fully loaded AND the side panel must
// have reached its ready state before any DOM assertion runs — asserting a
// section "absent" against a panel that has not rendered yet would pass
// vacuously.
async function waitPanelReady(timeoutMs = 60000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await evald(`(() => {
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
      estnetSection: Boolean(document.querySelector('[data-disclosure="estnet-packet-trace"]')),
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

// Structural signature of the side panel's top-level rows (tag + full class
// list). "Opt-in only ADDS" and "off restores the default" are asserted as:
// signature-with-section minus the estnet row === default signature, exactly.
const PANEL_SIGNATURE_EXPR = `(() => {
  const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
  return panel ? Array.from(panel.children, (el) => el.tagName + ":" + el.className) : null;
})()`;

// One read of everything the estnet section assertions need.
function readEstnetState() {
  return evald(`(() => {
    const sections = document.querySelectorAll('[data-disclosure="estnet-packet-trace"]');
    const mount = sections[0]?.querySelector(".v4-estnet-trace__mount") ?? null;
    const note = mount?.querySelector('[data-pair-mismatch="true"]') ?? null;
    return {
      sectionCount: sections.length,
      loading: mount ? mount.dataset.loading === "true" : null,
      variant: mount?.dataset.variant ?? null,
      errorBlock: Boolean(mount?.querySelector(".v4-estnet-trace__error")),
      yAxis: mount?.querySelector("svg")?.dataset.yAxis ?? null,
      pairNote: note ? note.textContent : null,
      modelDelta: Boolean(mount?.querySelector('[data-model-delta="true"]')),
      modelLine: Boolean(mount?.querySelector(".v4-estnet-trace__svg-model-line")),
      assumptions: mount?.querySelector(".v4-estnet-trace__assumptions")?.textContent ?? null,
      nonClaims: Array.from(
        mount?.querySelectorAll(".v4-estnet-trace__nonclaims li") ?? [],
        (li) => li.textContent
      ),
      buttons: Array.from(
        sections[0]?.querySelectorAll(".v4-estnet-trace__toggle-btn") ?? [],
        (b) => b.dataset.variant
      ),
      activeButton:
        sections[0]?.querySelector(".v4-estnet-trace__toggle-btn--active")?.dataset.variant ?? null,
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

async function waitForCondition(expr, timeoutMs, label) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await evald(expr);
    if (last === true) return;
    await delay(100);
  }
  throw new Error(`timed out waiting for ${label}; last=${JSON.stringify(last)}`);
}

// Wait until the estnet section exists AND its mount finished loading a trace.
function waitEstnetLoaded(timeoutMs = 30000) {
  return waitForCondition(
    `(() => {
      const m = document.querySelector('[data-disclosure="estnet-packet-trace"] .v4-estnet-trace__mount');
      return Boolean(m && m.dataset.loading !== "true" && m.dataset.variant);
    })()`,
    timeoutMs,
    "estnet section loaded"
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
function expectedYAxis(fixture) {
  const semantic = latencySemanticOf(fixture);
  return semantic === "none" ? "mbps" : semantic === "rtt" ? "rtt" : "ms";
}
function declaredEndpoints(fixture) {
  const a = fixture.metadata?.stationA?.id;
  const b = fixture.metadata?.stationB?.id;
  return typeof a === "string" && typeof b === "string" ? { a, b } : null;
}
function endpointsMatchRoute(endpoints, routeA, routeB) {
  const ids = new Set([routeA, routeB]);
  return ids.has(endpoints.a) && ids.has(endpoints.b);
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
  await send("Page.navigate", { url: defaultUrl });
  await waitPanelReady();
  // Let late async work (fixture fetches, worker responses) surface any error.
  await delay(1500);

  const s0 = await readDefaultState();
  check(
    "default-estnet-section-absent (opt-in surface must not exist without opt-in)",
    s0.estnetSection === false,
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
    "ON-only-adds-the-section (structural signature: default rows all survive, exactly one estnet row added)",
    estnetRowIndex >= 0 &&
      sigOn.length === sigDefault.length + 1 &&
      JSON.stringify(sigOnWithoutSection) === JSON.stringify(sigDefault),
    { sigDefault, sigOn }
  );
  const sOn = await readEstnetState();
  check("ON-section-present-once", sOn.sectionCount === 1, sOn.sectionCount);
  check("ON-storage-on (persisted opt-in)", sOn.storedMode === "on", sOn.storedMode);
  check(
    "ON-menu-lists-every-manifest-trace",
    JSON.stringify(sOn.buttons) === JSON.stringify(manifest.traces.map((t) => t.id)),
    { got: sOn.buttons, want: manifest.traces.map((t) => t.id) }
  );
  // Mirrors selectManifestEntryForRoute exactly: same-pair matches first
  // (default:true beats manifest order), else the global default entry.
  const samePairEntries = manifest.traces.filter(
    (t) =>
      typeof t.stationA === "string" &&
      typeof t.stationB === "string" &&
      endpointsMatchRoute({ a: t.stationA, b: t.stationB }, routeA, routeB)
  );
  const expectedPreselect =
    samePairEntries.length > 0
      ? (samePairEntries.find((t) => t.default === true) ?? samePairEntries[0])
      : (manifest.traces.find((t) => t.default === true) ?? manifest.traces[0]);
  check(
    "ON-preselects-the-route's-own-trace (pair hints + default tie-break)",
    sOn.variant === expectedPreselect.id && sOn.activeButton === expectedPreselect.id,
    { got: sOn.variant, want: expectedPreselect.id }
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
        const m = document.querySelector('[data-disclosure="estnet-packet-trace"] .v4-estnet-trace__mount');
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
    check(
      `menu[${entry.id}]-assumptionSet-verbatim`,
      s.assumptions === `Assumptions: ${fixture.assumptionSet}`,
      { got: s.assumptions }
    );
    check(
      `menu[${entry.id}]-nonClaims-verbatim (every line, in order)`,
      JSON.stringify(s.nonClaims) === JSON.stringify(fixture.nonClaims ?? []),
      { got: s.nonClaims, want: fixture.nonClaims }
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
  }

  // 6. toggle OFF: the section's DOM is REMOVED (not display:none), zero
  // estnet nodes remain, and the panel structure returns to the default.
  check("OFF-click-toggle", await clickEstnetToggle(), null);
  await waitForCondition(
    `document.querySelector('[data-disclosure="estnet-packet-trace"]') === null`,
    15000,
    "estnet section removed"
  );
  const sOff = await evald(`(() => ({
    section: Boolean(document.querySelector('[data-disclosure="estnet-packet-trace"]')),
    leftoverNodes: document.querySelectorAll('[class*="v4-estnet-trace"]').length,
    storedMode: (() => { try { return window.localStorage.getItem("estnet-display-mode"); } catch { return "ERR"; } })(),
    toggleEnabled: document.querySelector('[data-estnet-trace-toggle="true"]')?.dataset.estnetEnabled ?? null
  }))()`);
  const sigOff = await evald(PANEL_SIGNATURE_EXPR);
  check("OFF-section-dom-fully-removed (querySelector null — removal, not display:none)", sOff.section === false, sOff);
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
    await send("Page.navigate", { url: crossUrl.toString() });
    await waitPanelReady();
    await waitEstnetLoaded();
    const sCross = await readEstnetState();
    check(
      "seed-url-opt-in-reveals-section (?estnet=1 seeds the mode IN-MEMORY; persistence only on explicit toggle)",
      sCross.sectionCount === 1 && sCross.storedMode === null,
      { sections: sCross.sectionCount, stored: sCross.storedMode }
    );
    check(
      `seed-route-preselects-its-own-trace (${crossEntry.id}, not the global default)`,
      sCross.variant === crossEntry.id,
      { got: sCross.variant, want: crossEntry.id }
    );
    const crossFixture = fixturesByEntryId.get(crossEntry.id);
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
          const m = document.querySelector('[data-disclosure="estnet-packet-trace"] .v4-estnet-trace__mount');
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
  } else {
    check("seed-cross-route-step", false, "no cross-pair hinted manifest entry found — cannot exercise the seed/cross-route step");
  }

  // 8. cumulative cleanliness across the whole interaction sequence.
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
