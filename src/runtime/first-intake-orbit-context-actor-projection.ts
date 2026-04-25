export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID =
  "app-oneweb-intelsat-geo-aviation";
export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_ID =
  "m8a-v3.5-oneweb-intelsat-source-lineaged-orbit-context-v1";
export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC =
  "2026-04-25T07:23:27.000Z";
export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DISPLAY_PROJECTION_MODE =
  "tle-source-derived-addressed-scene-display-projection";
export const FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID =
  "generic-satellite-glb-simple-satellite-low-poly-free";
export const FIRST_INTAKE_GENERIC_SATELLITE_MODEL_PUBLIC_PATH =
  "assets/models/generic-satellite.glb";

export type FirstIntakeOrbitContextOrbitClass = "leo" | "geo";
export type FirstIntakeOrbitContextDisplayRole =
  | "leo-context-actor"
  | "geo-context-anchor";
export type FirstIntakeOrbitContextMotionMode =
  | "replay-driven"
  | "fixed-earth-relative";
export type FirstIntakeOrbitContextEvidenceClass = "display-context";
export type FirstIntakeOrbitContextFreshnessClass =
  "source-epoch-offset-from-replay-marked-display-context";
export type FirstIntakeOrbitContextPositionPrecision =
  | "tle-propagated-display-context"
  | "tle-fixed-earth-relative-display-context";

export interface FirstIntakeOrbitContextNonClaims {
  activeServingSatellite: false;
  activeGatewayAssignment: false;
  pairSpecificGeoTeleport: false;
  rfBeamTruth: false;
  nativeRfHandoverTruth: false;
  measurementTruth: false;
  liveOperationalTruth: false;
  activeMeoParticipation: false;
}

export interface FirstIntakeOrbitContextSourceLineage {
  sourceProvider: "CelesTrak";
  sourceProduct: "NORAD GP TLE";
  sourceUrl: string;
  fetchedAtUtc: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC;
  sourceRecordName: string;
  tleLine1: string;
  tleLine2: string;
}

export interface FirstIntakeOrbitContextActorProjectionRecord {
  scenarioId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID;
  actorId: string;
  label: "OneWeb LEO context" | "Intelsat GEO continuity anchor";
  orbitClass: FirstIntakeOrbitContextOrbitClass;
  displayRole: FirstIntakeOrbitContextDisplayRole;
  operatorContext: "OneWeb" | "Intelsat";
  sourceLineage: FirstIntakeOrbitContextSourceLineage;
  sourceEpochUtc: string;
  projectionEpochUtc: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC;
  freshnessClass: FirstIntakeOrbitContextFreshnessClass;
  positionPrecision: FirstIntakeOrbitContextPositionPrecision;
  motionMode: FirstIntakeOrbitContextMotionMode;
  evidenceClass: FirstIntakeOrbitContextEvidenceClass;
  modelAssetId: typeof FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID;
  modelTruth: "generic-satellite-mesh";
  nonClaims: FirstIntakeOrbitContextNonClaims;
}

export interface FirstIntakeOrbitContextModelAssetProjection {
  modelAssetId: typeof FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID;
  publicPath: typeof FIRST_INTAKE_GENERIC_SATELLITE_MODEL_PUBLIC_PATH;
  title: "Simple Satellite Low Poly Free";
  author: "DjalalxJay";
  sourceUrl: "https://sketchfab.com/3d-models/simple-satellite-low-poly-free-f23b484cda664f1cb91b4f62ea5ef8bf";
  license: "CC-BY-4.0";
  noticePath: "public/assets/models/THIRD_PARTY_NOTICES.md";
  modificationNotes: "copied-without-geometry-material-or-texture-changes";
  modelTruth: "generic-satellite-mesh";
  nonClaim: "generic satellite mesh; not OneWeb or Intelsat spacecraft body geometry";
}

export interface FirstIntakeOrbitContextActorProjection {
  projectionId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_ID;
  scenarioId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID;
  projectionEpochUtc: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC;
  sourceAuthority: "viewer-owned-projected-display-module";
  displayProjectionMode:
    typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DISPLAY_PROJECTION_MODE;
  runtimeConsumptionRule:
    "runtime-controller-render-consume-this-module-only-no-raw-package-side-read";
  modelAsset: FirstIntakeOrbitContextModelAssetProjection;
  actors: ReadonlyArray<FirstIntakeOrbitContextActorProjectionRecord>;
}

export const FIRST_INTAKE_ORBIT_CONTEXT_REQUIRED_NON_CLAIMS: FirstIntakeOrbitContextNonClaims =
  {
    activeServingSatellite: false,
    activeGatewayAssignment: false,
    pairSpecificGeoTeleport: false,
    rfBeamTruth: false,
    nativeRfHandoverTruth: false,
    measurementTruth: false,
    liveOperationalTruth: false,
    activeMeoParticipation: false
  };

export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION: FirstIntakeOrbitContextActorProjection =
  {
    projectionId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_ID,
    scenarioId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
    projectionEpochUtc: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC,
    sourceAuthority: "viewer-owned-projected-display-module",
    displayProjectionMode:
      FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DISPLAY_PROJECTION_MODE,
    runtimeConsumptionRule:
      "runtime-controller-render-consume-this-module-only-no-raw-package-side-read",
    modelAsset: {
      modelAssetId: FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID,
      publicPath: FIRST_INTAKE_GENERIC_SATELLITE_MODEL_PUBLIC_PATH,
      title: "Simple Satellite Low Poly Free",
      author: "DjalalxJay",
      sourceUrl:
        "https://sketchfab.com/3d-models/simple-satellite-low-poly-free-f23b484cda664f1cb91b4f62ea5ef8bf",
      license: "CC-BY-4.0",
      noticePath: "public/assets/models/THIRD_PARTY_NOTICES.md",
      modificationNotes: "copied-without-geometry-material-or-texture-changes",
      modelTruth: "generic-satellite-mesh",
      nonClaim:
        "generic satellite mesh; not OneWeb or Intelsat spacecraft body geometry"
    },
    actors: [
      {
        scenarioId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
        actorId: "oneweb-0386-leo-display-context",
        label: "OneWeb LEO context",
        orbitClass: "leo",
        displayRole: "leo-context-actor",
        operatorContext: "OneWeb",
        sourceLineage: {
          sourceProvider: "CelesTrak",
          sourceProduct: "NORAD GP TLE",
          sourceUrl:
            "https://celestrak.org/NORAD/elements/gp.php?CATNR=49312&FORMAT=tle",
          fetchedAtUtc: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC,
          sourceRecordName: "ONEWEB-0386",
          tleLine1:
            "1 49312U 21090AK  26114.89813104  .00000077  00000+0  15761-3 0  9995",
          tleLine2:
            "2 49312  87.9151 285.0623 0001970  99.8552 260.2804 13.20769788222787"
        },
        sourceEpochUtc: "2026-04-24T21:33:18.000Z",
        projectionEpochUtc: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC,
        freshnessClass:
          "source-epoch-offset-from-replay-marked-display-context",
        positionPrecision: "tle-propagated-display-context",
        motionMode: "replay-driven",
        evidenceClass: "display-context",
        modelAssetId: FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        nonClaims: FIRST_INTAKE_ORBIT_CONTEXT_REQUIRED_NON_CLAIMS
      },
      {
        scenarioId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
        actorId: "intelsat-905-geo-display-context",
        label: "Intelsat GEO continuity anchor",
        orbitClass: "geo",
        displayRole: "geo-context-anchor",
        operatorContext: "Intelsat",
        sourceLineage: {
          sourceProvider: "CelesTrak",
          sourceProduct: "NORAD GP TLE",
          sourceUrl:
            "https://celestrak.org/NORAD/elements/gp.php?CATNR=27438&FORMAT=tle",
          fetchedAtUtc: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC,
          sourceRecordName: "INTELSAT 905 (IS-905)",
          tleLine1:
            "1 27438U 02027A   26114.64446779  .00000083  00000+0  00000+0 0  9995",
          tleLine2:
            "2 27438   6.6218  70.4310 0003311 335.6291 261.4170  1.00272573 50824"
        },
        sourceEpochUtc: "2026-04-24T15:28:02.000Z",
        projectionEpochUtc: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_EPOCH_UTC,
        freshnessClass:
          "source-epoch-offset-from-replay-marked-display-context",
        positionPrecision: "tle-fixed-earth-relative-display-context",
        motionMode: "fixed-earth-relative",
        evidenceClass: "display-context",
        modelAssetId: FIRST_INTAKE_GENERIC_SATELLITE_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        nonClaims: FIRST_INTAKE_ORBIT_CONTEXT_REQUIRED_NON_CLAIMS
      }
    ]
  };
