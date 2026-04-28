import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec
} from "satellite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const BASELINE_ARTIFACT_PATH = path.join(
  repoRoot,
  "public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json"
);
const OUTPUT_ARTIFACT_PATH = path.join(
  repoRoot,
  "public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json"
);

const ARTIFACT_ID =
  "m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28";
const PROJECTION_EPOCH_UTC = "2026-04-28T08:51:17Z";
const FETCHED_AT_UTC = "2026-04-28T08:51:17Z";
const ACCESSED_DATE = "2026-04-28";
const MODEL_ASSET_ID = "generic-satellite-glb-simple-satellite-low-poly-free";

const SOURCE_POSITION_PRECISION =
  "CelesTrak NORAD GP TLE propagated to the TLE source epoch; display-context only";
const RENDER_POSITION_BASIS =
  "CelesTrak NORAD GP TLE propagated to projectionEpochUtc for viewer-owned display context; not active serving-satellite truth";
const GEO_RENDER_POSITION_BASIS =
  "CelesTrak NORAD GP TLE propagated to projectionEpochUtc for viewer-owned GEO display context; not active serving-satellite truth";

const TLE_RECORDS = [
  {
    actorId: "oneweb-0386-leo-display-context",
    sourceRecordName: "ONEWEB-0386",
    catnr: "49312",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 49312U 21090AK  26118.15567684  .00000042  00000+0  71607-4 0  9991",
    tleLine2:
      "2 49312  87.9152 284.4114 0002034  99.2765 260.8598 13.20770377223219"
  },
  {
    actorId: "oneweb-0537-leo-display-context",
    sourceRecordName: "ONEWEB-0537",
    catnr: "56046",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 56046U 23043A   26118.03660939  .00000031  00000+0  46718-4 0  9990",
    tleLine2:
      "2 56046  87.9083 238.7312 0001745 107.0136 253.1187 13.16595446152367"
  },
  {
    actorId: "oneweb-0701-leo-display-context",
    sourceRecordName: "ONEWEB-0701",
    catnr: "61607",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 61607U 24188P   26118.06689087 -.00000467  00000+0 -13732-2 0  9991",
    tleLine2:
      "2 61607  87.8851  46.2374 0001830  52.0740 308.0553 13.10375232 76740"
  },
  {
    actorId: "oneweb-0012-leo-display-context",
    sourceRecordName: "ONEWEB-0012",
    catnr: "44057",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 44057U 19010A   26118.09519273  .00000080  00000+0  17444-3 0  9995",
    tleLine2:
      "2 44057  87.9083 238.7328 0002268 106.0064 254.1317 13.16594281344975"
  },
  {
    actorId: "oneweb-0249-leo-display-context",
    sourceRecordName: "ONEWEB-0249",
    catnr: "48967",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 48967U 21060A   26118.04689271 -.00000068  00000+0 -21178-3 0  9995",
    tleLine2:
      "2 48967  87.9084 238.7354 0001833  98.8442 261.2896 13.16595294233012"
  },
  {
    actorId: "oneweb-0702-leo-display-context",
    sourceRecordName: "ONEWEB-0702",
    catnr: "61608",
    orbitClass: "leo",
    operatorContext: "Eutelsat OneWeb",
    familyLabel: "OneWeb LEO",
    tleLine1:
      "1 61608U 24188Q   26118.12143723  .00000475  00000+0  13049-2 0  9999",
    tleLine2:
      "2 61608  87.8943  30.9331 0001424  44.4271 315.6971 13.11415750 77929"
  },
  {
    actorId: "o3b-mpower-f6-meo-display-context",
    sourceRecordName: "O3B MPOWER F6",
    catnr: "58347",
    orbitClass: "meo",
    operatorContext: "SES O3b mPOWER",
    familyLabel: "O3b mPOWER MEO",
    tleLine1:
      "1 58347U 23175B   26117.83675963 -.00000026  00000+0  00000+0 0  9996",
    tleLine2:
      "2 58347   0.0514   6.1968 0004686  21.5766 332.2505  5.00116198 45831"
  },
  {
    actorId: "o3b-mpower-f1-meo-display-context",
    sourceRecordName: "O3B MPOWER F1",
    catnr: "54755",
    orbitClass: "meo",
    operatorContext: "SES O3b mPOWER",
    familyLabel: "O3b mPOWER MEO",
    tleLine1:
      "1 54755U 22174A   26118.04714766 -.00000026  00000+0  00000+0 0  9992",
    tleLine2:
      "2 54755   0.0595 347.1451 0005909  66.7656  83.3654  5.00114849 62853"
  },
  {
    actorId: "o3b-mpower-f2-meo-display-context",
    sourceRecordName: "O3B MPOWER F2",
    catnr: "54756",
    orbitClass: "meo",
    operatorContext: "SES O3b mPOWER",
    familyLabel: "O3b mPOWER MEO",
    tleLine1:
      "1 54756U 22174B   26117.33789480 -.00000027  00000+0  00000+0 0  9990",
    tleLine2:
      "2 54756   0.0561 344.9626 0005938  49.3525 325.7220  5.00115388 62907"
  },
  {
    actorId: "o3b-mpower-f4-meo-display-context",
    sourceRecordName: "O3B MPOWER F4",
    catnr: "56367",
    orbitClass: "meo",
    operatorContext: "SES O3b mPOWER",
    familyLabel: "O3b mPOWER MEO",
    tleLine1:
      "1 56367U 23059A   26118.00188043 -.00000026  00000+0  00000+0 0  9995",
    tleLine2:
      "2 56367   0.0649   2.3907 0007275  46.3446 311.3264  5.00115937 56087"
  },
  {
    actorId: "o3b-mpower-f3-meo-display-context",
    sourceRecordName: "O3B MPOWER F3",
    catnr: "56368",
    orbitClass: "meo",
    operatorContext: "SES O3b mPOWER",
    familyLabel: "O3b mPOWER MEO",
    tleLine1:
      "1 56368U 23059B   26117.83525903 -.00000026  00000+0  00000+0 0  9996",
    tleLine2:
      "2 56368   0.0659   2.1985 0006660  36.8115 321.0371  5.00116590 52211"
  },
  {
    actorId: "st-2-geo-continuity-anchor",
    sourceRecordName: "ST-2",
    catnr: "37606",
    orbitClass: "geo",
    operatorContext: "ST-2 CHT/Singtel GEO service context",
    familyLabel: "ST-2 GEO",
    tleLine1:
      "1 37606U 11022B   26118.17733719 -.00000217  00000+0  00000+0 0  9993",
    tleLine2:
      "2 37606   0.0164 257.3234 0002008 141.1843 329.4945  1.00268190 54779"
  },
  {
    actorId: "ses-9-geo-display-context",
    sourceRecordName: "SES-9",
    catnr: "41380",
    orbitClass: "geo",
    operatorContext:
      "SES GEO display context; not endpoint-pair path or active service claim",
    familyLabel: "SES GEO",
    tleLine1:
      "1 41380U 16013A   26118.01282755 -.00000352  00000+0  00000+0 0  9994",
    tleLine2:
      "2 41380   0.0172 289.0061 0002130 131.8420 268.0518  1.00271470 36932"
  }
];

function parseTleEpochUtc(tleLine1) {
  const twoDigitYear = Number(tleLine1.slice(18, 20));
  const dayOfYear = Number(tleLine1.slice(20, 32));
  const year = twoDigitYear < 57 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
  const epochMs = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 24 * 60 * 60 * 1000;

  return new Date(epochMs).toISOString();
}

function resolveTlePosition(record, epochUtc) {
  const satrec = twoline2satrec(record.tleLine1, record.tleLine2);
  const date = new Date(epochUtc);
  const propagated = propagate(satrec, date);

  if (!propagated.position) {
    throw new Error(`Unable to propagate ${record.sourceRecordName}.`);
  }

  const geodetic = eciToGeodetic(propagated.position, gstime(date));

  return {
    lat: Number(degreesLat(geodetic.latitude).toFixed(6)),
    lon: Number(degreesLong(geodetic.longitude).toFixed(6)),
    heightMeters: Math.round(geodetic.height * 1000)
  };
}

function displayRoleFor(orbitClass) {
  if (orbitClass === "leo") {
    return "leo-moving-context-actor";
  }

  if (orbitClass === "meo") {
    return "meo-moving-context-actor";
  }

  return "geo-continuity-anchor";
}

function renderPositionKindFor(orbitClass) {
  return orbitClass === "geo" ? "near-fixed-geo-anchor" : "sampled-replay-position";
}

function motionModeFor(orbitClass) {
  return orbitClass === "geo" ? "near-fixed-geo-anchor" : "replay-driven";
}

function sourceRefIdFor(record) {
  return `celestrak-gp-${record.sourceRecordName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${record.catnr}`;
}

function buildActor(record, nonClaims) {
  const sourceEpochUtc = parseTleEpochUtc(record.tleLine1);
  const sourcePosition = resolveTlePosition(record, sourceEpochUtc);
  const renderPosition = resolveTlePosition(record, PROJECTION_EPOCH_UTC);
  const orbitLabel = record.orbitClass.toUpperCase();

  return {
    actorId: record.actorId,
    orbitClass: record.orbitClass,
    displayRole: displayRoleFor(record.orbitClass),
    operatorContext: record.operatorContext,
    sourceLineage: [
      {
        sourceRefId: sourceRefIdFor(record),
        label: `CelesTrak NORAD GP TLE: ${record.sourceRecordName}`,
        url: `https://celestrak.org/NORAD/elements/gp.php?CATNR=${record.catnr}&FORMAT=tle`,
        accessedDate: ACCESSED_DATE,
        supports: [
          `source-lineaged ${record.familyLabel} display-context actor`,
          "TLE-derived source-position and render-position projection"
        ],
        sourceAuthority: "projection-note",
        sourceProvider: "CelesTrak",
        sourceProduct: "NORAD GP TLE",
        fetchedAtUtc: FETCHED_AT_UTC,
        sourceRecordName: record.sourceRecordName,
        tleLine1: record.tleLine1,
        tleLine2: record.tleLine2
      }
    ],
    sourceEpochUtc,
    projectionEpochUtc: PROJECTION_EPOCH_UTC,
    freshnessClass: "fresh-display-context",
    sourcePosition: {
      positionKind: "source-orbit-position",
      ...sourcePosition,
      coordinateFrame: "wgs84",
      precision: SOURCE_POSITION_PRECISION
    },
    renderPosition: {
      positionKind: renderPositionKindFor(record.orbitClass),
      ...renderPosition,
      coordinateFrame: "wgs84",
      renderPositionBasis:
        record.orbitClass === "geo" ? GEO_RENDER_POSITION_BASIS : RENDER_POSITION_BASIS,
      renderPositionIsSourceTruth: false
    },
    motionMode: motionModeFor(record.orbitClass),
    evidenceClass: "display-context",
    modelAssetId: MODEL_ASSET_ID,
    modelTruth: "generic-satellite-mesh",
    truthBoundary: {
      doesClaim: [
        `${record.sourceRecordName} has a source-lineaged CelesTrak NORAD GP TLE record`,
        "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
        `the actor is eligible as a ${orbitLabel} display-context actor after a later runtime implementation consumes this accepted projection`
      ],
      doesNotClaim: [
        "active serving satellite identity",
        "active gateway assignment",
        "pair-specific teleport path truth",
        "measured latency/jitter/throughput truth",
        "native RF handover",
        "live operational truth",
        `${record.sourceRecordName} spacecraft body geometry`
      ],
      requiredDisplayBadges: [
        "modeled service state",
        "not active satellite",
        "not native RF handover"
      ]
    },
    nonClaims
  };
}

const baselineArtifact = JSON.parse(readFileSync(BASELINE_ARTIFACT_PATH, "utf8"));
const nextArtifact = {
  ...baselineArtifact,
  artifactId: ARTIFACT_ID,
  projectionEpochUtc: PROJECTION_EPOCH_UTC,
  sourcePackage: {
    ...baselineArtifact.sourcePackage,
    projectedBy:
      "scenario-globe-viewer M8A-VNext V4.6B source/projection execution thread",
    projectionNotes:
      "Viewer-owned V4.6B orbit-actor enrichment projection for the accepted Taiwan/CHT + Speedcast Singapore operator-family endpoint pair. Endpoint truth and precision are unchanged. Orbit actors are source-lineaged CelesTrak NORAD GP TLE display-context records only; this artifact does not authorize active serving-satellite, gateway, pair-specific path, measured metric, native RF handover, or runtime rendering claims."
  },
  orbitActors: TLE_RECORDS.map((record) =>
    buildActor(record, baselineArtifact.nonClaims)
  )
};

writeFileSync(OUTPUT_ARTIFACT_PATH, `${JSON.stringify(nextArtifact, null, 2)}\n`);

const actorCounts = nextArtifact.orbitActors.reduce(
  (counts, actor) => ({
    ...counts,
    [actor.orbitClass]: counts[actor.orbitClass] + 1
  }),
  { leo: 0, meo: 0, geo: 0 }
);

console.log(
  `Generated ${path.relative(repoRoot, OUTPUT_ARTIFACT_PATH)} with ${nextArtifact.orbitActors.length} actors: ${JSON.stringify(actorCounts)}`
);
