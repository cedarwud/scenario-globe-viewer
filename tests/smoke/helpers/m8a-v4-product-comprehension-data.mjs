export const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
export const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
export const EXPECTED_PRECISION = "operator-family-only";
export const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
export const EXPECTED_V48_VERSION =
  "m8a-v4.8-handover-demonstration-ui-ia-phase3-runtime.v1";
export const EXPECTED_V49_VERSION =
  "m8a-v4.9-product-comprehension-slice4-runtime.v1";
export const EXPECTED_V49_SCOPE = "slice4-inspector-details-hierarchy-redesign";
export const EXPECTED_SCENE_NEAR_SCOPE =
  "slice2-scene-near-meaning-layer-correction";
export const EXPECTED_TRANSITION_SCOPE = "slice3-transition-event-layer";
export const EXPECTED_TRANSITION_DURATION_MS = 2600;
export const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
export const EXPECTED_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
export const EXPECTED_ALLOWED_PERSISTENT_CONTENT = [
  "current-state",
  "state-ordinal",
  "play-pause",
  "restart",
  "30x",
  "60x",
  "120x",
  "compact-truth-affordance",
  "details-trigger"
];
export const EXPECTED_DENIED_PERSISTENT_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "long-truth-badge-row",
  "duplicate-product-progress"
];
export const EXPECTED_SCENE_NEAR_RELIABLE_CONTENT = [
  "orbit-class-token",
  "product-label",
  "first-read-line",
  "watch-cue-label",
  "next-line"
];
export const EXPECTED_SCENE_NEAR_FALLBACK_CONTENT = [
  "product-label",
  "state-ordinal",
  "first-read-line",
  "no-reliable-scene-attachment"
];
export const EXPECTED_TRANSITION_VISIBLE_CONTENT = [
  "transition-summary",
  "transition-context"
];
export const EXPECTED_TRANSITION_DENIED_VISIBLE_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "full-truth-boundary-disclosure",
  "user-action-required"
];
export const EXPECTED_INSPECTOR_PRIMARY_CONTENT = [
  "current-state",
  "why-this-state-exists",
  "what-changed-from-previous-state",
  "what-to-watch-now",
  "what-happens-next",
  "boundary-summary"
];
export const EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT = [
  "raw-actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "selected-relation-corridor-ids",
  "anchor-metadata",
  "full-candidate-context-arrays",
  "full-fallback-context-arrays"
];
export const EXPECTED_INSPECTOR_DEBUG_CONTENT = [
  "representative-actor-id",
  "candidate-context-actor-id-array",
  "fallback-context-actor-id-array",
  "selected-anchor-id",
  "selected-relation-cue-id",
  "selected-corridor-id",
  "anchor-runtime-metadata"
];
export const EXPECTED_INSPECTOR_LABELS = [
  "Current state",
  "Why",
  "Changed",
  "Watch",
  "Next",
  "Boundary"
];
export const EXPECTED_PRODUCT_COPY = {
  "leo-acquisition-context": {
    windowId: "leo-acquisition-context",
    ratio: 0.1,
    productLabel: "LEO review focus",
    stateOrdinalLabel: "State 1 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO is the simulated review focus for this corridor.",
    watchCueLabel: "Watch: representative LEO cue.",
    nextLine: "Next: watch for pressure before the MEO hold.",
    transitionRole: "review focus"
  },
  "leo-aging-pressure": {
    windowId: "leo-aging-pressure",
    ratio: 0.3,
    productLabel: "LEO pressure",
    stateOrdinalLabel: "State 2 of 5",
    orbitClassToken: "LEO",
    firstReadMessage:
      "The LEO review context is under simulated pressure.",
    watchCueLabel: "Watch: LEO pressure cue.",
    nextLine: "Next: continuity shifts to MEO context.",
    transitionRole: "pressure before continuity shift"
  },
  "meo-continuity-hold": {
    windowId: "meo-continuity-hold",
    ratio: 0.5,
    productLabel: "MEO continuity hold",
    stateOrdinalLabel: "State 3 of 5",
    orbitClassToken: "MEO",
    firstReadMessage: "MEO context is holding continuity in this simulation.",
    watchCueLabel: "Watch: MEO representative cue.",
    nextLine: "Next: LEO returns as a candidate focus.",
    transitionRole: "continuity hold"
  },
  "leo-reentry-candidate": {
    windowId: "leo-reentry-candidate",
    ratio: 0.7,
    productLabel: "LEO re-entry",
    stateOrdinalLabel: "State 4 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO returns as a candidate review focus.",
    watchCueLabel: "Watch: returning LEO cue.",
    nextLine: "Next: GEO closes the sequence as guard context.",
    transitionRole: "re-entry candidate"
  },
  "geo-continuity-guard": {
    windowId: "geo-continuity-guard",
    ratio: 0.92,
    productLabel: "GEO guard context",
    stateOrdinalLabel: "State 5 of 5",
    orbitClassToken: "GEO",
    firstReadMessage:
      "GEO is shown only as guard context, not active failover proof.",
    watchCueLabel: "Watch: GEO guard cue.",
    nextLine: "Restart to review the sequence again.",
    transitionRole: "final guard"
  }
};
export const EXPECTED_SLICE1_MICRO_CUES = {
  "leo-acquisition-context": "focus · LEO",
  "leo-aging-pressure": "pressure · LEO",
  "meo-continuity-hold": "hold · MEO",
  "leo-reentry-candidate": "re-entry · LEO",
  "geo-continuity-guard": "guard · GEO"
};
export const EXPECTED_TRANSITION_LABELS = {
  "leo-acquisition-context": "LEO review",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard"
};
export const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
  "active path",
  "active service",
  "pair-specific teleport path",
  "teleport path",
  "native rf handover",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "measured continuity",
  "live network time",
  "operator event time",
  "r2 runtime selector"
];
export const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\bmeasured\s+\d+(?:\.\d+)?\s*%/i
];

// §Smoke Softening Disclosure: Correction A §5.3, §5.4, and §5.5 supersede the old
// V4.9 assumption that scope/time/source disclosure is not default-visible.
// The allowed successor disclosure is limited to the top scope/time strip and
// footer chips: simulation display, TLE provenance, operator-family precision,
// 13-actor scope, and replay time. The inspector may expose the Correction A
// Decision/Metrics/Boundary/Evidence tab model. Forbidden claims, metadata
// demotion, and non-blocking transition invariants remain unchanged.
export const V411_CORRECTION_A_AMBIENT_DISCLOSURE_PATTERNS = [
  /Scale evidence \(≥500 LEO\) lives in Phase 7\.1; this route remains a 13-actor bounded demo/g,
  /Simulation view/g,
  /operator-family precision/g,
  /TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors/g,
  /TLE: CelesTrak NORAD GP · 2026-04-26/g,
  /13 actors/g,
  /Sim replay \d{2}:\d{2} \/ \d{2}:\d{2}/g
];
export const VIEWPORTS = {
  desktop: {
    name: "desktop-1440",
    width: 1440,
    height: 900,
    mobile: false,
    expectedViewportClass: "desktop"
  },
  desktopCompact: {
    name: "desktop-1280",
    width: 1280,
    height: 720,
    mobile: false,
    expectedViewportClass: "desktop"
  },
  narrow: {
    name: "narrow-390",
    width: 390,
    height: 844,
    mobile: true,
    expectedViewportClass: "narrow"
  }
};
