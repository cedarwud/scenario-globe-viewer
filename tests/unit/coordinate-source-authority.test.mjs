import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REGISTRY_URL = new URL(
  "../../public/fixtures/ground-stations/multi-orbit-public-registry.json",
  import.meta.url
);
const AUTHORITY_URL = new URL(
  "../../public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json",
  import.meta.url
);

const ALLOWED_AUTHORITIES = new Set([
  "official-filing",
  "operator-web",
  "teleport-directory",
  "secondary-web",
  "wikipedia",
  "news",
  "mixed-public",
  "unknown-public"
]);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

test("coordinate source authority covers every registry station", async () => {
  const registry = await readJson(REGISTRY_URL);
  const authority = await readJson(AUTHORITY_URL);
  const registryIds = new Set(registry.stations.map((station) => station.id));
  const authorityIds = new Set(authority.stations.map((station) => station.stationId));

  assert.equal(registry.stations.length, 69);
  assert.equal(authority.stations.length, registry.stations.length);
  assert.deepEqual(authorityIds, registryIds);
});

test("coordinate source authority uses the allowed enum only", async () => {
  const authority = await readJson(AUTHORITY_URL);

  for (const station of authority.stations) {
    assert.equal(typeof station.stationId, "string");
    assert.ok(ALLOWED_AUTHORITIES.has(station.coordinateSourceAuthority));
    assert.ok(
      typeof station.coordinateSourceNote === "string" &&
        station.coordinateSourceNote.length > 0
    );
    assert.ok(
      station.coordinateSourceUrl === null ||
        typeof station.coordinateSourceUrl === "string"
    );
  }
});

test("coordinate source authority has no orphan station ids", async () => {
  const registry = await readJson(REGISTRY_URL);
  const authority = await readJson(AUTHORITY_URL);
  const registryIds = new Set(registry.stations.map((station) => station.id));

  for (const station of authority.stations) {
    assert.ok(registryIds.has(station.stationId), station.stationId);
  }
});
