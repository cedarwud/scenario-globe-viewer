// `npm run dev` entry: preflight the port before handing over to vite.
//
// vite's strictPort failure (deliberate here — gates and demo URLs anchor to
// :5173, see vite.config.ts + scripts/helpers/demo-routes.mjs) prints a
// five-line internal stack that buries the one fact that matters. This
// wrapper checks the port first and, when it is taken, prints a one-line
// diagnosis + the two sanctioned ways forward instead of entering vite at
// all. On a free port it execs vite with all arguments forwarded verbatim,
// so gate invocations (`npm run dev -- --host 127.0.0.1 --port N
// --strictPort`) behave exactly as before.
import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const port = Number(argValue("--port")) || 5173;
const host = argValue("--host") ?? "127.0.0.1";

function portFree(p, h) {
  return new Promise((resolvePromise) => {
    const probe = net.createServer();
    probe.once("error", () => resolvePromise(false));
    probe.once("listening", () => probe.close(() => resolvePromise(true)));
    probe.listen(p, h);
  });
}

if (!(await portFree(port, host))) {
  console.error(`error when starting dev server:`);
  console.error(`Error: Port ${port} is already in use`);
  console.error(
    `  → likely an existing dev server already serving this repo: http://localhost:${port}/ (reuse it)`
  );
  console.error(
    `  → or start a second one explicitly: npm run dev -- --port ${port + 1} --strictPort`
  );
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vite = spawn(
  process.execPath,
  [resolve(repoRoot, "node_modules", "vite", "bin", "vite.js"), ...args],
  { cwd: repoRoot, stdio: "inherit" }
);
vite.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
