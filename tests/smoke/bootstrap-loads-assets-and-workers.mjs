import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
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

const smokeFetches = [
  {
    pathname: "/",
    verify: async (response) => {
      const html = await response.text();
      assert(
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
      assert(
        workerScript.includes("Cesium - https://github.com/CesiumGS/cesium"),
        "Expected worker smoke target to be a Cesium worker module"
      );
    }
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveDistPath(pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const relativePath = normalizedPath.replace(/^\/+/, "");
  const absolutePath = path.join(distRoot, relativePath);
  const relativeFromDist = path.relative(distRoot, absolutePath);

  assert(!relativeFromDist.startsWith(".."), `Refused path traversal: ${pathname}`);
  return absolutePath;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before this smoke test.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing smoke fixture: dist/${relativePath}`);
    assert(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
}

function startStaticServer() {
  const server = createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = resolveDistPath(requestUrl.pathname);

      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "content-type": contentTypeFor(filePath)
      });
      response.end(readFileSync(filePath));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Unknown smoke server error");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Unable to determine smoke server address");
      }
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function verifyFetches(baseUrl) {
  for (const target of smokeFetches) {
    const response = await fetch(`${baseUrl}${target.pathname}`);
    assert(response.ok, `Expected ${target.pathname} to return 200, received ${response.status}`);

    if (target.verify) {
      await target.verify(response);
    }
  }
}

async function main() {
  ensureDistBuildExists();

  // Cesium resolves runtime assets from CESIUM_BASE_URL and derives worker
  // module imports from the Workers/ prefix under that same base path.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-17
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:42-46
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:91-125
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:237-245
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/buildModuleUrlSpec.js:42-70
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/TaskProcessorSpec.js:48-90
  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    console.log("Phase 1 smoke verification passed.");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

await main();
