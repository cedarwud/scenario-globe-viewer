#!/usr/bin/env node
// Runs the node:test unit suite under tests/unit/ with the TypeScript import
// hook (tests/helpers/register-ts-hook.mjs) so tests can import the app's `.ts`
// modules directly.
//
// DENYLIST: empty. runtime-tle-manifest-compat.test.mjs was previously skipped
// because its mocked network-manifest fallback contract had drifted red against
// the runtime-data contract (stale hardcoded manifest epochs judged against
// wall-clock freshness). Reconciled 2026-06-21 with the TLE-source opt-in change
// (network resolution is now explicit via `networkOptIn`, manifests are
// now-relative) and re-enabled. Keep the scaffold for any future quarantine.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UNIT_DIR = new URL("../tests/unit/", import.meta.url);
const REGISTER = fileURLToPath(new URL("../tests/helpers/register-ts-hook.mjs", import.meta.url));

const DENYLIST = new Set();

const all = readdirSync(UNIT_DIR).filter((name) => name.endsWith(".test.mjs"));
const skipped = all.filter((name) => DENYLIST.has(name));
const files = all
  .filter((name) => !DENYLIST.has(name))
  .map((name) => fileURLToPath(new URL(name, UNIT_DIR)));

if (skipped.length > 0) {
  console.log(
    `\n[run-unit-tests] SKIPPING ${skipped.length} known server/contract integration test(s): ` +
      `${skipped.join(", ")} (see denylist comment in scripts/run-unit-tests.mjs)\n`,
  );
}

const result = spawnSync(
  process.execPath,
  ["--test", "--import", REGISTER, ...files],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
