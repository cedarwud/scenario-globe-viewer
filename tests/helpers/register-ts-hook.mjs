// Preload module for `node --test --import`. Two responsibilities:
//   1. Register the extensionless-`.ts` + JSON-attribute resolution hook
//      (see ts-import-hook.mjs) so unit tests can import the app's TypeScript
//      modules directly. Node v24 strips the types; this only fixes resolution.
//   2. Install a `fetch` shim that serves path-only URLs (`/fixtures/...`) from
//      the repo's `public/` directory. The runtime fetches bundled TLE/JSON
//      fixtures with site-absolute paths that resolve against the dev/preview
//      server in the browser; under `node --test` there is no server, so these
//      reads are served from disk. This is the real bundled fixture content,
//      not a stub.
import { register } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

register("./ts-import-hook.mjs", import.meta.url);

const PUBLIC_DIR = new URL("../../public/", import.meta.url);
const originalFetch = globalThis.fetch;

const CONTENT_TYPES = {
  json: "application/json",
  tle: "text/plain",
  csv: "text/csv",
  txt: "text/plain",
};

globalThis.fetch = async function fetchWithPublicDir(input, init) {
  const url = typeof input === "string" ? input : input?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    const fileUrl = new URL("." + url, PUBLIC_DIR);
    try {
      const body = await readFile(fileURLToPath(fileUrl));
      const ext = url.split(".").pop()?.toLowerCase() ?? "";
      return new Response(body, {
        status: 200,
        headers: { "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream" },
      });
    } catch {
      return new Response(`Not found: ${url}`, { status: 404, statusText: "Not Found" });
    }
  }
  return originalFetch(input, init);
};
