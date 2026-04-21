import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");

const requiredDistFiles = [
  "index.html",
  "cesium/Assets/approximateTerrainHeights.json",
  "cesium/Assets/Images/ion-credit.png",
  "cesium/Workers/createTaskProcessorWorker.js"
];

// Cesium resolves runtime assets from CESIUM_BASE_URL and derives worker
// module imports from the Workers/ prefix under that same base path.
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-17
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:42-46
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:91-125
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:237-245
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/buildModuleUrlSpec.js:42-70
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/TaskProcessorSpec.js:48-90
const smokeFetches = [
  {
    pathname: "/",
    verify: async (response) => {
      const html = await response.text();
      ensure(
        html.includes('window.CESIUM_BASE_URL = "/cesium/";'),
        "Expected dist index.html to reserve CESIUM_BASE_URL"
      );
    }
  },
  {
    pathname: "/cesium/Assets/approximateTerrainHeights.json"
  },
  {
    pathname: "/cesium/Assets/Images/ion-credit.png"
  },
  {
    pathname: "/cesium/Workers/createTaskProcessorWorker.js",
    verify: async (response) => {
      const workerScript = await response.text();
      ensure(
        workerScript.includes("Cesium - https://github.com/CesiumGS/cesium"),
        "Expected worker smoke target to be a Cesium worker module"
      );
    }
  }
];

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function ensureDistBuildExists() {
  ensure(existsSync(distRoot), "Missing dist/. Run `npm run build` before this smoke test.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    ensure(existsSync(absolutePath), `Missing smoke fixture: dist/${relativePath}`);
    ensure(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
}

export async function verifyFetches(baseUrl) {
  for (const target of smokeFetches) {
    const response = await fetch(`${baseUrl}${target.pathname}`);
    ensure(response.ok, `Expected ${target.pathname} to return 200, received ${response.status}`);

    if (target.verify) {
      await target.verify(response);
    }
  }
}

export function startStaticServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn(
      "python3",
      ["-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", distRoot],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let settled = false;
    let serverLog = "";
    const readyPattern = /Serving HTTP on [^ ]+ port (\d+)/;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      serverProcess.kill("SIGTERM");
      reject(new Error(`Timed out waiting for smoke server. Output: ${serverLog}`));
    }, 5000);

    const handleOutput = (chunk) => {
      serverLog += chunk.toString();
      const match = serverLog.match(readyPattern);

      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          server: serverProcess,
          baseUrl: `http://127.0.0.1:${match[1]}`
        });
      }
    };

    serverProcess.stdout.on("data", handleOutput);
    serverProcess.stderr.on("data", handleOutput);
    serverProcess.once("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Smoke server exited before readiness. Code: ${code}. Output: ${serverLog}`));
    });
  });
}

export async function stopStaticServer(server) {
  await new Promise((resolve) => {
    server.once("exit", () => {
      resolve();
    });
    server.kill("SIGTERM");
  });
}
