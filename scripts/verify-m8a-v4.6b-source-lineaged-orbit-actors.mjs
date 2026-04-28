import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const ARTIFACT_PATH = path.join(
  repoRoot,
  "public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json"
);

const EXPECTED_ARTIFACT_ID =
  "m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28";
const EXPECTED_PROJECTION_EPOCH_UTC = "2026-04-28T08:51:17Z";
const EXPECTED_ENDPOINT_IDS = [
  "tw-cht-multi-orbit-ground-infrastructure",
  "sg-speedcast-singapore-teleport"
];
const EXPECTED_ACTOR_COUNTS = {
  leo: 6,
  meo: 5,
  geo: 2
};
const EXPECTED_SOURCE_RECORDS = new Set([
  "ONEWEB-0386",
  "ONEWEB-0537",
  "ONEWEB-0701",
  "ONEWEB-0012",
  "ONEWEB-0249",
  "ONEWEB-0702",
  "O3B MPOWER F6",
  "O3B MPOWER F1",
  "O3B MPOWER F2",
  "O3B MPOWER F4",
  "O3B MPOWER F3",
  "ST-2",
  "SES-9"
]);
const REQUIRED_NON_CLAIM_KEYS = [
  "noExactSiteSelection",
  "noSameSiteLeoMeoGeoProof",
  "noLiveCrossOrbitHandoverProof",
  "noActiveServingSatelliteIdentity",
  "noActiveGatewayAssignment",
  "noPairSpecificTeleportPathTruth",
  "noMeasuredLatencyJitterThroughputTruth",
  "noNativeRfHandover",
  "noAircraftEndpoint",
  "noOrdinaryHandsetUe"
];
const FORBIDDEN_CLAIM_PHRASES = [
  "active serving satellite",
  "active gateway",
  "pair-specific teleport path",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "native rf handover",
  "aircraft endpoint",
  "ordinary handset ue",
  "same-site leo/meo/geo"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readArtifact() {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

function isFinitePosition(position) {
  return (
    Number.isFinite(position?.lat) &&
    Number.isFinite(position?.lon) &&
    Number.isFinite(position?.heightMeters) &&
    position.lat >= -90 &&
    position.lat <= 90 &&
    position.lon >= -180 &&
    position.lon <= 180
  );
}

function computeTleChecksum(line) {
  return [...line.slice(0, 68)].reduce((sum, char) => {
    if (/[0-9]/.test(char)) {
      return sum + Number(char);
    }

    return char === "-" ? sum + 1 : sum;
  }, 0) % 10;
}

function assertValidTleLine(line, lineNumber, actorId) {
  assert(
    typeof line === "string" && line.length >= 69,
    `${actorId} TLE line ${lineNumber} must be at least 69 characters.`
  );
  assert(
    line.startsWith(`${lineNumber} `),
    `${actorId} TLE line ${lineNumber} must start with "${lineNumber} ".`
  );

  const expectedChecksum = Number(line[68]);
  assert(
    Number.isInteger(expectedChecksum),
    `${actorId} TLE line ${lineNumber} must expose a checksum digit.`
  );
  assert(
    computeTleChecksum(line) === expectedChecksum,
    `${actorId} TLE line ${lineNumber} checksum mismatch.`
  );
}

function assertActorLineage(actor) {
  const lineage = actor.sourceLineage?.[0];

  assert(lineage, `${actor.actorId} must have source lineage.`);
  assert(
    lineage.sourceProvider === "CelesTrak",
    `${actor.actorId} must use CelesTrak sourceProvider.`
  );
  assert(
    lineage.sourceProduct === "NORAD GP TLE",
    `${actor.actorId} must use NORAD GP TLE sourceProduct.`
  );
  assert(
    lineage.sourceAuthority === "projection-note",
    `${actor.actorId} sourceAuthority must remain projection-note.`
  );
  assert(
    /^https:\/\/celestrak\.org\/NORAD\/elements\/gp\.php\?CATNR=\d+&FORMAT=tle$/.test(
      lineage.url
    ),
    `${actor.actorId} must keep a CelesTrak CATNR TLE URL.`
  );
  assert(
    lineage.accessedDate === "2026-04-28" &&
      lineage.fetchedAtUtc === EXPECTED_PROJECTION_EPOCH_UTC,
    `${actor.actorId} must preserve source access/projection fetch epoch.`
  );
  assert(
    EXPECTED_SOURCE_RECORDS.has(lineage.sourceRecordName),
    `${actor.actorId} has unexpected source record ${lineage.sourceRecordName}.`
  );
  assertValidTleLine(lineage.tleLine1, 1, actor.actorId);
  assertValidTleLine(lineage.tleLine2, 2, actor.actorId);
  assert(
    Array.isArray(lineage.supports) &&
      lineage.supports.includes(
        "TLE-derived source-position and render-position projection"
      ),
    `${actor.actorId} lineage must describe TLE-derived projection support.`
  );
}

function assertActorTruthBoundary(actor) {
  const doesClaim = actor.truthBoundary?.doesClaim ?? [];
  const joinedClaims = doesClaim.join(" ").toLowerCase();

  assert(doesClaim.length > 0, `${actor.actorId} must expose doesClaim.`);
  assert(
    joinedClaims.includes("source-lineaged celestrak norad gp tle record"),
    `${actor.actorId} doesClaim must be limited to CelesTrak TLE lineage.`
  );
  assert(
    joinedClaims.includes("display-context actor"),
    `${actor.actorId} doesClaim must keep display-context wording.`
  );

  for (const phrase of FORBIDDEN_CLAIM_PHRASES) {
    assert(
      !joinedClaims.includes(phrase),
      `${actor.actorId} doesClaim contains forbidden claim phrase: ${phrase}`
    );
  }

  for (const key of REQUIRED_NON_CLAIM_KEYS) {
    assert(actor.nonClaims?.[key] === true, `${actor.actorId} missing ${key}.`);
  }
}

function assertActorProjectionBoundary(actor, artifact) {
  assert(
    actor.projectionEpochUtc === artifact.projectionEpochUtc,
    `${actor.actorId} projection epoch must align with artifact projection epoch.`
  );
  assert(
    actor.freshnessClass === "fresh-display-context",
    `${actor.actorId} must be fresh-display-context.`
  );
  assert(
    actor.evidenceClass === "display-context",
    `${actor.actorId} evidenceClass must stay display-context.`
  );
  assert(
    actor.modelTruth === "generic-satellite-mesh",
    `${actor.actorId} modelTruth must stay generic.`
  );
  assert(
    actor.sourcePosition?.positionKind === "source-orbit-position" &&
      actor.sourcePosition?.coordinateFrame === "wgs84" &&
      isFinitePosition(actor.sourcePosition),
    `${actor.actorId} must preserve a finite source orbit position.`
  );
  assert(
    actor.renderPosition?.coordinateFrame === "wgs84" &&
      actor.renderPosition?.renderPositionIsSourceTruth === false &&
      isFinitePosition(actor.renderPosition),
    `${actor.actorId} must preserve a finite non-source render position.`
  );

  if (actor.orbitClass === "geo") {
    assert(
      actor.motionMode === "near-fixed-geo-anchor" &&
        actor.renderPosition.positionKind === "near-fixed-geo-anchor",
      `${actor.actorId} GEO actors must stay near-fixed anchors.`
    );
  } else {
    assert(
      actor.motionMode === "replay-driven" &&
        actor.renderPosition.positionKind === "sampled-replay-position",
      `${actor.actorId} non-GEO actors must stay replay-driven sampled positions.`
    );
  }
}

function main() {
  const artifact = readArtifact();

  assert(artifact.schemaVersion === "m8a-v4-ground-station-projection.v1");
  assert(artifact.artifactId === EXPECTED_ARTIFACT_ID);
  assert(artifact.artifactStatus === "accepted");
  assert(artifact.projectionEpochUtc === EXPECTED_PROJECTION_EPOCH_UTC);
  assert(
    artifact.precisionPolicy?.acceptedPairPrecision === "operator-family-only",
    "Endpoint precision policy must remain operator-family-only."
  );
  assert(
    JSON.stringify(artifact.endpoints.map((endpoint) => endpoint.endpointId)) ===
      JSON.stringify(EXPECTED_ENDPOINT_IDS),
    "V4.6B projection must keep the accepted Taiwan/CHT + Speedcast endpoint pair."
  );
  assert(
    artifact.validationExpectations?.runtimeRawItriSideReadAllowed === false,
    "V4.6B projection must keep runtime raw itri side-read disallowed."
  );

  const actorCounts = artifact.orbitActors.reduce(
    (counts, actor) => ({
      ...counts,
      [actor.orbitClass]: counts[actor.orbitClass] + 1
    }),
    { leo: 0, meo: 0, geo: 0 }
  );

  assert(
    JSON.stringify(actorCounts) === JSON.stringify(EXPECTED_ACTOR_COUNTS),
    `Unexpected V4.6B actor counts: ${JSON.stringify(actorCounts)}`
  );

  const sourceRecords = new Set();
  const actorIds = new Set();

  for (const actor of artifact.orbitActors) {
    assert(!actorIds.has(actor.actorId), `Duplicate actorId ${actor.actorId}.`);
    actorIds.add(actor.actorId);
    assertActorLineage(actor);
    assertActorTruthBoundary(actor);
    assertActorProjectionBoundary(actor, artifact);
    sourceRecords.add(actor.sourceLineage[0].sourceRecordName);
  }

  assert(
    sourceRecords.size === EXPECTED_SOURCE_RECORDS.size &&
      [...EXPECTED_SOURCE_RECORDS].every((sourceRecordName) =>
        sourceRecords.has(sourceRecordName)
      ),
    `Unexpected source records: ${JSON.stringify([...sourceRecords])}`
  );

  console.log(
    `M8A-V4.6B source-lineaged orbit actor projection validation passed: ${JSON.stringify({
      artifactId: artifact.artifactId,
      actorCounts,
      sourceRecordCount: sourceRecords.size,
      runtimeRawItriSideReadAllowed:
        artifact.validationExpectations.runtimeRawItriSideReadAllowed
    })}`
  );
}

main();
