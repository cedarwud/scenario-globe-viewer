import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function findHeadlessBrowser() {
  const candidates = ["google-chrome", "chromium", "chromium-browser"];

  for (const command of candidates) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });

    if (probe.status === 0) {
      return command;
    }
  }

  throw new Error(
    "Missing a supported headless browser. Install google-chrome or chromium to run Phase 1 smoke."
  );
}

export function startHeadlessBrowser(browserCommand, extraArgs = []) {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "scenario-globe-viewer-chrome-"));

  return new Promise((resolve, reject) => {
    const browserProcess = spawn(
      browserCommand,
      [
        "--headless",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-sync",
        "--metrics-recording-only",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDir}`,
        ...extraArgs,
        "about:blank"
      ],
      {
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let settled = false;
    let browserLog = "";
    const readyPattern = /DevTools listening on (ws:\/\/[^\s]+)/;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      browserProcess.kill("SIGTERM");
      rmSync(userDataDir, { recursive: true, force: true });
      reject(new Error(`Timed out waiting for headless browser. Output: ${browserLog}`));
    }, 10000);

    const handleOutput = (chunk) => {
      browserLog += chunk.toString();
      const match = browserLog.match(readyPattern);

      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          browserProcess,
          browserWebSocketUrl: match[1],
          userDataDir
        });
      }
    };

    browserProcess.stdout.on("data", handleOutput);
    browserProcess.stderr.on("data", handleOutput);
    browserProcess.once("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rmSync(userDataDir, { recursive: true, force: true });
      reject(error);
    });
    browserProcess.once("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rmSync(userDataDir, { recursive: true, force: true });
      reject(
        new Error(`Headless browser exited before readiness. Code: ${code}. Output: ${browserLog}`)
      );
    });
  });
}

export async function stopHeadlessBrowser(browserOrHandle, userDataDir) {
  const browserProcess =
    typeof browserOrHandle?.kill === "function"
      ? browserOrHandle
      : browserOrHandle?.browserProcess;
  const resolvedUserDataDir = userDataDir ?? browserOrHandle?.userDataDir;

  if (!browserProcess) {
    if (resolvedUserDataDir) {
      rmSync(resolvedUserDataDir, { recursive: true, force: true });
    }
    return;
  }

  if (!browserProcess.killed) {
    browserProcess.kill("SIGTERM");
  }

  await new Promise((resolve) => {
    browserProcess.once("exit", () => {
      resolve();
    });

    setTimeout(() => {
      if (!browserProcess.killed) {
        browserProcess.kill("SIGKILL");
      }

      resolve();
    }, 1000);
  });

  if (resolvedUserDataDir) {
    rmSync(resolvedUserDataDir, { recursive: true, force: true });
  }
}

export async function resolvePageWebSocketUrl(browserWebSocketUrl) {
  const browserUrl = new URL(browserWebSocketUrl);
  const inspectorBaseUrl = `${browserUrl.protocol === "wss:" ? "https" : "http"}://${browserUrl.host}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${inspectorBaseUrl}/json/list`);
    const targets = await response.json();
    const pageTarget = targets.find((target) => target.type === "page");

    if (pageTarget?.webSocketDebuggerUrl) {
      return pageTarget.webSocketDebuggerUrl;
    }

    await sleep(100);
  }

  throw new Error(`Failed to resolve page websocket from ${browserWebSocketUrl}`);
}

export function connectCdp(pageWebSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(pageWebSocketUrl);
    const pending = new Map();
    let nextId = 0;
    let settled = false;

    const rejectPending = (error) => {
      for (const deferred of pending.values()) {
        deferred.reject(error);
      }

      pending.clear();
    };

    socket.addEventListener("open", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        async send(method, params = {}) {
          const id = ++nextId;

          return await new Promise((commandResolve, commandReject) => {
            pending.set(id, {
              resolve: commandResolve,
              reject: commandReject
            });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        async close() {
          if (socket.readyState === WebSocket.CLOSED) {
            return;
          }

          socket.close();
        }
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);

      if (typeof payload.id !== "number") {
        return;
      }

      const deferred = pending.get(payload.id);

      if (!deferred) {
        return;
      }

      pending.delete(payload.id);

      if (payload.error) {
        deferred.reject(new Error(payload.error.message));
        return;
      }

      deferred.resolve(payload.result);
    });

    socket.addEventListener("error", () => {
      const error = new Error("CDP websocket error.");
      rejectPending(error);

      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    socket.addEventListener("close", () => {
      rejectPending(new Error("CDP websocket closed."));
    });
  });
}

function resolveRuntimeEvaluateExceptionMessage(evaluation) {
  const exceptionDetails = evaluation.exceptionDetails;
  const description =
    exceptionDetails?.exception?.description ??
    exceptionDetails?.text ??
    "Browser Runtime.evaluate failed without exception details.";
  const lineNumber =
    typeof exceptionDetails?.lineNumber === "number"
      ? exceptionDetails.lineNumber + 1
      : null;
  const columnNumber =
    typeof exceptionDetails?.columnNumber === "number"
      ? exceptionDetails.columnNumber + 1
      : null;
  const location =
    lineNumber === null || columnNumber === null
      ? ""
      : ` (line ${lineNumber}, column ${columnNumber})`;

  return `Browser Runtime.evaluate threw${location}: ${description}`;
}

export async function evaluateRuntimeValue(
  client,
  expression,
  { awaitPromise = false } = {}
) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });

  if (evaluation.exceptionDetails) {
    throw new Error(resolveRuntimeEvaluateExceptionMessage(evaluation));
  }

  return evaluation.result.value;
}
