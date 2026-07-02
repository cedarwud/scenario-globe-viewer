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
    "no-uncaught-exception-or-unhandled-rejection",
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
