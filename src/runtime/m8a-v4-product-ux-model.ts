import {
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  type M8aV46dActorId,
  type M8aV46dSimulationHandoverWindow,
  type M8aV46dSimulationHandoverWindowId,
  type M8aV4OrbitClass
} from "./m8a-v4-ground-station-projection";
import type { ReplayClockState } from "../features/time";

export const M8A_V47_PRODUCT_UX_VERSION =
  "m8a-v4.7.1-handover-product-ux-correction-runtime.v1";
export const M8A_V48_UI_IA_VERSION =
  "m8a-v4.8-handover-demonstration-ui-ia-phase3-runtime.v1";
export const M8A_V49_PRODUCT_COMPREHENSION_VERSION =
  "m8a-v4.9-product-comprehension-slice4-runtime.v1";
export const M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION =
  "m8a-v4.10-first-viewport-composition-slice1-runtime.v1";
export const M8A_V410_HANDOVER_SEQUENCE_RAIL_VERSION =
  "m8a-v4.10-handover-sequence-rail-slice2-runtime.v1";
export const M8A_V410_BOUNDARY_AFFORDANCE_VERSION =
  "m8a-v4.10-boundary-affordance-separation-slice3-runtime.v1";
export const M8A_V410_INSPECTOR_EVIDENCE_VERSION =
  "m8a-v4.10-inspector-evidence-redesign-slice4-runtime.v1";
export const M8A_V410_PRODUCT_UX_STRUCTURE_VERSION =
  "m8a-v4.11-product-ux-structure-policy-rule-controls-runtime.v1";
export const M8A_V4_ITRI_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION =
  "itri-demo-view-focus-choreography-runtime.v1";
export const M8A_V47_GUIDED_REVIEW_MULTIPLIER = 30;
export const M8A_V47_PRODUCT_DEFAULT_MULTIPLIER = 60;
export const M8A_V47_QUICK_SCAN_MULTIPLIER = 120;
export const M8A_V47_DEBUG_TEST_MULTIPLIER = 240;
export const M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS = [
  M8A_V47_GUIDED_REVIEW_MULTIPLIER,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_QUICK_SCAN_MULTIPLIER
] as const;
export const M8A_V47_FINAL_HOLD_DURATION_MS = 4_000;
export const M8A_V47_FINAL_HOLD_MIN_MS = 3_000;
export const M8A_V47_FINAL_HOLD_MAX_MS = 5_000;
export const M8A_V47_TRUTH_BADGES = [
  "simulation output",
  "operator-family precision",
  "display-context actors"
] as const;
export const M8A_V47_DISCLOSURE_LINES = [
  "Simulated display-context state, not an operator handover log.",
  "Source-lineaged display-context actors, not active serving satellites.",
  "Endpoint precision stays operator-family only.",
  "No active gateway assignment is claimed.",
  "No pair-specific teleport path is claimed.",
  "No measured latency, jitter, throughput, or continuity values are shown.",
  "No native RF handover is claimed."
] as const;
export const M8A_V49_PERSISTENT_ALLOWED_CONTENT = [
  "current-state",
  "state-ordinal",
  "play-pause",
  "restart",
  "30x",
  "60x",
  "120x",
  "compact-truth-affordance",
  "details-trigger"
] as const;
export const M8A_V49_PERSISTENT_DENIED_DEFAULT_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "long-truth-badge-row",
  "duplicate-product-progress"
] as const;
export const M8A_V49_SCENE_NEAR_RELIABLE_VISIBLE_CONTENT = [
  "orbit-class-token",
  "product-label",
  "first-read-line",
  "watch-cue-label",
  "next-line"
] as const;
export const M8A_V49_SCENE_NEAR_FALLBACK_VISIBLE_CONTENT = [
  "product-label",
  "state-ordinal",
  "first-read-line",
  "no-reliable-scene-attachment"
] as const;
export const M8A_V410_SCENE_NARRATIVE_VISIBLE_CONTENT = [
  "active-state-title",
  "orbit-class-token",
  "first-read-line",
  "watch-cue-or-fallback",
  "next-line"
] as const;
export const M8A_V410_SEQUENCE_RAIL_VISIBLE_CONTENT = [
  "five-state-path",
  "active-state-mark",
  "next-state-mark",
  "transition-event-link"
] as const;
export const M8A_V410_BOUNDARY_AFFORDANCE_VISIBLE_CONTENT = [
  "compact-boundary-line",
  "focused-boundary-surface",
  "full-truth-disclosure",
  "details-independent-state"
] as const;
export const M8A_V410_INSPECTOR_EVIDENCE_STRUCTURE = [
  "current-replay-event-evidence",
  "sequence-selected-window-context",
  "source-and-boundary-notes",
  "not-being-claimed"
] as const;
export const M8A_V410_INSPECTOR_DENIED_FIRST_READ_ROLES = [
  "operator-log",
  "claim-panel",
  "mission-narrative",
  "primary-product-narrative"
] as const;
export const M8A_V410_INSPECTOR_NOT_CLAIMED_CONTENT = [
  "not-active-satellite",
  "not-active-gateway-or-path",
  "not-measured-metric",
  "not-native-rf",
  "not-operator-log-truth"
] as const;
export const M8A_V410_BOUNDARY_COMPACT_COPY =
  "Simulation review - not operator log";
export const M8A_V410_BOUNDARY_SECONDARY_COPY =
  "No active satellite, gateway, path, or measured metric claim.";
export const M8A_V49_TRANSITION_EVENT_DURATION_MS = 2_600;
export const M8A_V49_TRANSITION_EVENT_VISIBLE_CONTENT = [
  "transition-summary",
  "transition-context"
] as const;
export const M8A_V49_TRANSITION_EVENT_DENIED_VISIBLE_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "full-truth-boundary-disclosure",
  "user-action-required"
] as const;
export const M8A_V49_INSPECTOR_PRIMARY_VISIBLE_CONTENT = [
  "current-state",
  "why-this-state-exists",
  "what-changed-from-previous-state",
  "what-to-watch-now",
  "what-happens-next",
  "boundary-summary"
] as const;
export const M8A_V49_INSPECTOR_DENIED_PRIMARY_CONTENT = [
  "raw-actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "selected-relation-corridor-ids",
  "anchor-metadata",
  "full-candidate-context-arrays",
  "full-fallback-context-arrays"
] as const;
export const M8A_V49_INSPECTOR_DEBUG_EVIDENCE_CONTENT = [
  "representative-actor-id",
  "candidate-context-actor-id-array",
  "fallback-context-actor-id-array",
  "selected-anchor-id",
  "selected-relation-cue-id",
  "selected-corridor-id",
  "anchor-runtime-metadata"
] as const;
export const M8A_V49_PRODUCT_COPY = {
  "leo-acquisition-context": {
    productLabel: "LEO review focus",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO is the simulated review focus for this corridor.",
    watchCueLabel: "Watch: representative LEO cue.",
    nextLine: "Next: watch for pressure before the MEO hold.",
    transitionRole: "review focus"
  },
  "leo-aging-pressure": {
    productLabel: "LEO pressure",
    orbitClassToken: "LEO",
    firstReadMessage: "The LEO review context is under simulated pressure.",
    watchCueLabel: "Watch: LEO pressure cue.",
    nextLine: "Next: continuity shifts to MEO context.",
    transitionRole: "pressure before continuity shift"
  },
  "meo-continuity-hold": {
    productLabel: "MEO continuity hold",
    orbitClassToken: "MEO",
    firstReadMessage: "MEO context is holding continuity in this simulation.",
    watchCueLabel: "Watch: MEO representative cue.",
    nextLine: "Next: LEO returns as a candidate focus.",
    transitionRole: "continuity hold"
  },
  "leo-reentry-candidate": {
    productLabel: "LEO re-entry",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO returns as a candidate review focus.",
    watchCueLabel: "Watch: returning LEO cue.",
    nextLine: "Next: GEO closes the sequence as guard context.",
    transitionRole: "re-entry candidate"
  },
  "geo-continuity-guard": {
    productLabel: "GEO guard context",
    orbitClassToken: "GEO",
    firstReadMessage: "GEO is shown only as guard context, not active failover proof.",
    watchCueLabel: "Watch: GEO guard cue.",
    nextLine: "Restart to review the sequence again.",
    transitionRole: "final guard"
  }
} satisfies Record<
  M8aV46dSimulationHandoverWindowId,
  {
    productLabel: string;
    orbitClassToken: "LEO" | "MEO" | "GEO";
    firstReadMessage: string;
    watchCueLabel: string;
    nextLine: string;
    transitionRole: string;
  }
>;
export const M8A_V4_ITRI_DEMO_VIEW_FOCUS_VISIBLE_CONTENT = [
  "single-primary-focus",
  "state-specific-briefing",
  "next-focus-preview",
  "secondary-context-dimmed",
  "truth-boundary-short"
] as const;
export const M8A_V4_ITRI_DEMO_VIEW_FOCUS_TRUTH_BOUNDARY =
  "modeled replay focus only; not operator log, measured metric, live policy control, or RF handover truth";
export const M8A_V4_ITRI_DEMO_VIEW_FOCUS_COPY = {
  "leo-acquisition-context": {
    ordinalLabel: "W1",
    focusId: "w1-leo-primary-focus",
    primaryFocusLabel: "W1 · LEO 主服務",
    focusOrbitClassToken: "LEO",
    focusRole: "primary-service",
    briefingLine: "只看 LEO：目前低延遲服務成立，MEO/GEO 只是背景。",
    decisionNow: "LEO 是本視窗唯一主焦點。",
    decisionWhy: "位置條件支援 LEO；尚未進入壓力視窗。",
    decisionWatch: "看 LEO focus cue 與模擬服務時長，不看實測吞吐。",
    nextFocusHint: "下一焦點：LEO 品質下降。",
    visualCue: "representative-leo-focus",
    sceneCueLabel: "Focus: LEO only"
  },
  "leo-aging-pressure": {
    ordinalLabel: "W2",
    focusId: "w2-leo-pressure-focus",
    primaryFocusLabel: "W2 · LEO 壓力",
    focusOrbitClassToken: "LEO",
    focusRole: "pressure",
    briefingLine: "只看 LEO 壓力：品質正在下降，MEO 只是下一步候選。",
    decisionNow: "LEO 仍是主焦點，但處於 modeled pressure。",
    decisionWhy: "replay window 顯示位置條件變差；不是實測 jitter 或 latency。",
    decisionWatch: "看倒數與品質 class 下滑，MEO 不搶主焦點。",
    nextFocusHint: "下一焦點：MEO 暫時接住。",
    visualCue: "leo-pressure-cue",
    sceneCueLabel: "Focus: LEO pressure"
  },
  "meo-continuity-hold": {
    ordinalLabel: "W3",
    focusId: "w3-meo-hold-focus",
    primaryFocusLabel: "W3 · MEO 接續",
    focusOrbitClassToken: "MEO",
    focusRole: "continuity-hold",
    briefingLine: "只看 MEO：它承接連續性，LEO 回歸先不要搶焦點。",
    decisionNow: "MEO 是本視窗 modeled hold 狀態。",
    decisionWhy: "LEO 不再是主焦點，MEO 用較廣覆蓋承接中段。",
    decisionWatch: "看 MEO hold cue；沒有 measured failover claim。",
    nextFocusHint: "下一焦點：LEO 回到候選。",
    visualCue: "representative-meo-hold",
    sceneCueLabel: "Focus: MEO hold"
  },
  "leo-reentry-candidate": {
    ordinalLabel: "W4",
    focusId: "w4-leo-candidate-focus",
    primaryFocusLabel: "W4 · LEO 候選",
    focusOrbitClassToken: "LEO",
    focusRole: "candidate-review",
    briefingLine: "只看候選 LEO：MEO 仍在接住，LEO 是可評估的回歸候選。",
    decisionNow: "LEO 回到候選焦點；MEO 仍維持連續性。",
    decisionWhy: "位置條件回復到可評估，但這不是 operator command。",
    decisionWatch: "看候選 LEO cue 與 MEO hold 的對比。",
    nextFocusHint: "下一焦點：GEO guard 收尾。",
    visualCue: "returning-leo-candidate",
    sceneCueLabel: "Focus: LEO candidate"
  },
  "geo-continuity-guard": {
    ordinalLabel: "W5",
    focusId: "w5-geo-guard-focus",
    primaryFocusLabel: "W5 · GEO 保底",
    focusOrbitClassToken: "GEO",
    focusRole: "guard-context",
    briefingLine: "只看 GEO guard：它是保底覆蓋語意，不是備援切換證據。",
    decisionNow: "GEO 是最後的 modeled guard context。",
    decisionWhy: "序列用 GEO 關閉邊界，不宣稱 failover pass。",
    decisionWatch: "看 guard wording，避免解讀成硬體切換。",
    nextFocusHint: "重新開始：回到 W1 LEO 主服務。",
    visualCue: "geo-guard-boundary",
    sceneCueLabel: "Focus: GEO guard"
  }
} satisfies Record<
  M8aV46dSimulationHandoverWindowId,
  {
    ordinalLabel: "W1" | "W2" | "W3" | "W4" | "W5";
    focusId: string;
    primaryFocusLabel: string;
    focusOrbitClassToken: "LEO" | "MEO" | "GEO";
    focusRole:
      | "primary-service"
      | "pressure"
      | "continuity-hold"
      | "candidate-review"
      | "guard-context";
    briefingLine: string;
    decisionNow: string;
    decisionWhy: string;
    decisionWatch: string;
    nextFocusHint: string;
    visualCue: string;
    sceneCueLabel: string;
  }
>;
export const M8A_V48_REVIEW_COPY = {
  "leo-acquisition-context": {
    reviewPurpose:
      "Evidence source: the deterministic V4.6D replay selects the initial LEO review window for the accepted corridor.",
    whatChangedFromPreviousState:
      "Replay event: the sequence starts with representative LEO context emphasized.",
    whatToWatch:
      "Scene evidence context: representative LEO display cue near the endpoint corridor.",
    nextStateHint:
      "Sequence context: next window moves into LEO pressure context.",
    sceneAnchorType: "representative-actor-if-visible"
  },
  "leo-aging-pressure": {
    reviewPurpose:
      "Evidence source: the deterministic V4.6D replay marks LEO context under simulated pressure.",
    whatChangedFromPreviousState:
      "Replay event: the selected window moved from LEO review focus into pressure context.",
    whatToWatch:
      "Scene evidence context: LEO candidate relation emphasis without measured metric truth.",
    nextStateHint:
      "Sequence context: next window shifts from LEO pressure to MEO continuity hold.",
    sceneAnchorType: "representative-actor-if-visible"
  },
  "meo-continuity-hold": {
    reviewPurpose:
      "Evidence source: the deterministic V4.6D replay selects MEO context as continuity hold.",
    whatChangedFromPreviousState:
      "Replay event: representative context changed from LEO pressure to MEO hold.",
    whatToWatch:
      "Scene evidence context: MEO representative cue while candidate and guard context stay secondary.",
    nextStateHint:
      "Sequence context: next window returns LEO as a candidate review focus.",
    sceneAnchorType: "representative-meo-actor-if-visible"
  },
  "leo-reentry-candidate": {
    reviewPurpose:
      "Evidence source: the deterministic V4.6D replay selects LEO re-entry as candidate context.",
    whatChangedFromPreviousState:
      "Replay event: LEO context reappears after the MEO continuity hold.",
    whatToWatch:
      "Scene evidence context: returning LEO cue and its transition relationship.",
    nextStateHint:
      "Sequence context: next window enters final GEO guard context.",
    sceneAnchorType: "representative-leo-actor-if-visible"
  },
  "geo-continuity-guard": {
    reviewPurpose:
      "Evidence source: the deterministic V4.6D replay selects GEO as final guard context.",
    whatChangedFromPreviousState:
      "Replay event: the selected window moved from LEO re-entry into final guard context.",
    whatToWatch:
      "Scene evidence context: GEO guard cue and final hold semantics.",
    nextStateHint:
      "Sequence context: restart returns the review to LEO review focus.",
    sceneAnchorType: "geo-guard-cue-or-representative-geo-anchor"
  }
} satisfies Record<
  M8aV46dSimulationHandoverWindowId,
  {
    reviewPurpose: string;
    whatChangedFromPreviousState: string;
    whatToWatch: string;
    nextStateHint: string;
    sceneAnchorType:
      | "representative-actor-if-visible"
      | "representative-meo-actor-if-visible"
      | "representative-leo-actor-if-visible"
      | "geo-guard-cue-or-representative-geo-anchor";
  }
>;

export const M8A_V46E_TIMELINE_LABELS = {
  "leo-acquisition-context": "LEO review focus",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO continuity hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard context"
} satisfies Record<M8aV46dSimulationHandoverWindowId, string>;
export const M8A_V410_TRANSITION_LABELS = {
  "leo-acquisition-context": "LEO review",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard"
} satisfies Record<M8aV46dSimulationHandoverWindowId, string>;
export const M8A_V46E_RELATION_ROLE_LABELS = {
  displayRepresentative: "representative context ribbon",
  candidateContext: "candidate context ribbon",
  fallbackContext: "GEO guard cue"
} satisfies Record<M8aV4RelationRole, string>;
export const M8A_V4_LINK_FLOW_CUE_VERSION =
  "m8a-v4-link-flow-direction-cue-runtime.v1";
export const M8A_V4_LINK_FLOW_CUE_MODE =
  "uplink-downlink-arrow-segments-with-moving-packet-trails";
export const M8A_V4_LINK_FLOW_TRUTH_BOUNDARY =
  "modeled-direction-cue-not-packet-capture-or-measured-throughput";
export const M8A_V4_LINK_FLOW_RELATION_ROLES = [
  "displayRepresentative",
  "candidateContext"
] as const;
export const M8A_V4_LINK_FLOW_DIRECTIONS = ["uplink", "downlink"] as const;
export const M8A_V4_LINK_FLOW_PULSE_OFFSETS = [0, 0.34, 0.68] as const;
export const M8A_V4_LINK_FLOW_REPLAY_CYCLES = 11;

export type M8aV47ProductPlaybackMultiplier =
  (typeof M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS)[number];
export type M8aV47PlaybackMultiplier =
  | M8aV47ProductPlaybackMultiplier
  | typeof M8A_V47_DEBUG_TEST_MULTIPLIER;
export type M8aV47PlaybackMode =
  | "guided-review"
  | "product-default"
  | "quick-scan"
  | "debug-test";
export type M8aV47PlaybackStatus = "playing" | "paused" | "final-hold";
export type M8aV47DisclosureState = "closed" | "open";
export const M8A_V411_INSPECTOR_TABS = [
  "decision",
  "metrics",
  "evidence"
] as const;
export type M8aV411InspectorTab = (typeof M8A_V411_INSPECTOR_TABS)[number];

export type M8aV4RelationRole =
  | "displayRepresentative"
  | "candidateContext"
  | "fallbackContext";
export type M8aV4LinkFlowRelationRole =
  (typeof M8A_V4_LINK_FLOW_RELATION_ROLES)[number];
export type M8aV4LinkFlowDirection =
  (typeof M8A_V4_LINK_FLOW_DIRECTIONS)[number];

export type M8aV48InfoClass = "fixed" | "dynamic" | "disclosure" | "control";

export interface M8aV48ReviewActorReference {
  actorId: M8aV46dActorId;
  label: string;
  orbitClass: M8aV4OrbitClass;
}

export type M8aV48RelationCueId =
  | "m8a-v46e-simulation-displayRepresentative-context-ribbon"
  | "m8a-v46e-simulation-geo-guard-cue";

export type M8aV48EndpointCorridorId =
  "m8a-v4-operator-family-endpoint-context-ribbon";

export type M8aV48SelectedSceneAnchorType =
  | "display-representative-actor"
  | "display-representative-relation-cue"
  | "endpoint-corridor-anchor"
  | "geo-guard-cue";

export type M8aV48SceneAnchorStateId =
  | "representative-actor-anchor"
  | "representative-meo-actor-anchor"
  | "representative-leo-actor-anchor"
  | "geo-guard-cue-anchor";

export type M8aV48SceneAnchorRuntimeStatus =
  | "geometry-reliable"
  | "fallback";

export type M8aV49SceneNearDisplayMode =
  | "scene-near-meaning"
  | "persistent-layer-fallback";

export type M8aV49SceneNearAttachmentClaim =
  | "display-context-cue-attachment-only-when-geometry-reliable"
  | "no-scene-attachment-claimed";

export type M8aV48SceneAnchorFallbackReason =
  | "anchor-not-projected"
  | "anchor-outside-viewport"
  | "anchor-behind-camera"
  | "protection-rect-obstructed";

export interface M8aV48SceneAnchorState {
  state: M8aV48SceneAnchorStateId;
  selectedAnchorType: M8aV48SelectedSceneAnchorType;
  selectedActorId: M8aV46dActorId | null;
  selectedRelationCueId: M8aV48RelationCueId | null;
  selectedCorridorId: M8aV48EndpointCorridorId | null;
  anchorStatus: "requires-render-geometry-validation";
  fallbackReason: null;
  anchorClaim: "selected-display-context-cue-not-service-truth";
}

export interface M8aV48SceneAnchorProtectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface M8aV48SceneAnchorPlacement {
  anchorActorId: M8aV46dActorId | "";
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  projected: boolean;
  selectedAnchorType: M8aV48SelectedSceneAnchorType | "non-scene-fallback";
  selectedActorId: M8aV46dActorId | "";
  selectedRelationCueId: M8aV48RelationCueId | "";
  selectedCorridorId: M8aV48EndpointCorridorId | "";
  anchorStatus: M8aV48SceneAnchorRuntimeStatus;
  fallbackReason: M8aV48SceneAnchorFallbackReason | "";
  connectorStartX: number;
  connectorStartY: number;
  connectorEndX: number;
  connectorEndY: number;
  connectorLength: number;
  connectorAngleDegrees: number;
  connectorEndpointDistancePx: number;
  connectorThresholdPx: number;
  protectionRect: M8aV48SceneAnchorProtectionRect;
}

export interface M8aV48RelationCueRole {
  primary: "displayRepresentative";
  secondary: "candidateContext";
  displayLabel: "displayRepresentative primary; candidateContext secondary";
}

export interface M8aV48HandoverReviewViewModel {
  version: typeof M8A_V48_UI_IA_VERSION;
  windowId: M8aV46dSimulationHandoverWindowId;
  productLabel: string;
  stateIndex: number;
  stateCount: number;
  stateOrdinalLabel: string;
  representativeActor: M8aV48ReviewActorReference;
  candidateContextActors: ReadonlyArray<M8aV48ReviewActorReference>;
  fallbackContextActors: ReadonlyArray<M8aV48ReviewActorReference>;
  reviewPurpose: string;
  whatChangedFromPreviousState: string;
  whatToWatch: string;
  nextStateHint: string;
  relationCueRole: M8aV48RelationCueRole;
  sceneAnchorState: M8aV48SceneAnchorState;
  truthBoundarySummary:
    "Simulation review only; no active satellite, gateway, path, measured metric, native RF, or operator-log truth.";
}

export interface M8aV49WindowProductCopy {
  windowId: M8aV46dSimulationHandoverWindowId;
  productLabel: string;
  orbitClassToken: "LEO" | "MEO" | "GEO";
  firstReadMessage: string;
  watchCueLabel: string;
  nextLine: string;
  transitionRole: string;
}

export interface M8aV4ItriDemoFocusChoreographyRuntime {
  version: typeof M8A_V4_ITRI_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION;
  scope: "L1-per-window-focus-choreography";
  visibleContent: typeof M8A_V4_ITRI_DEMO_VIEW_FOCUS_VISIBLE_CONTENT;
  windowId: M8aV46dSimulationHandoverWindowId;
  ordinalLabel: "W1" | "W2" | "W3" | "W4" | "W5";
  focusId: string;
  primaryFocusLabel: string;
  focusOrbitClassToken: "LEO" | "MEO" | "GEO";
  focusRole:
    | "primary-service"
    | "pressure"
    | "continuity-hold"
    | "candidate-review"
    | "guard-context";
  briefingLine: string;
  decisionNow: string;
  decisionWhy: string;
  decisionWatch: string;
  nextFocusHint: string;
  visualCue: string;
  sceneCueLabel: string;
  secondaryActorPolicy: "dim-candidate-fallback-context-keep-next-visible";
  secondaryActorEmphasisRoles: readonly ["candidate", "fallback", "context"];
  nextContextVisible: true;
  truthBoundary: typeof M8A_V4_ITRI_DEMO_VIEW_FOCUS_TRUTH_BOUNDARY;
}

export interface M8aV410FirstViewportCompositionRuntime {
  version: typeof M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION;
  scope: "slice1-first-viewport-composition";
  sceneNarrativeVisibleContent: typeof M8A_V410_SCENE_NARRATIVE_VISIBLE_CONTENT;
  controlsPriority: "secondary";
  inspectorDefaultOpen: false;
  routePreservation: typeof M8A_V4_GROUND_STATION_QUERY_VALUE;
  endpointPairPreserved:
    typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.endpointPairId;
  sequenceRailScope: "slice2-handover-sequence-rail";
}

export interface M8aV410SequenceRailItem {
  windowId: M8aV46dSimulationHandoverWindowId;
  stateIndex: number;
  stateCount: number;
  ordinalLabel: string;
  railLabel: string;
  productLabel: string;
  orbitClassToken: M8aV49WindowProductCopy["orbitClassToken"];
  isActive: boolean;
  isNext: boolean;
  isTransitionFrom: boolean;
  isTransitionTo: boolean;
}

export interface M8aV410HandoverSequenceRailRuntime {
  version: typeof M8A_V410_HANDOVER_SEQUENCE_RAIL_VERSION;
  scope: "slice2-handover-sequence-rail";
  visibleContent: typeof M8A_V410_SEQUENCE_RAIL_VISIBLE_CONTENT;
  viewportPolicy: "desktop-visible-narrow-compact";
  windowIds: ReadonlyArray<M8aV46dSimulationHandoverWindowId>;
  activeWindowId: M8aV46dSimulationHandoverWindowId;
  nextWindowId: M8aV46dSimulationHandoverWindowId;
  activeProductLabel: string;
  nextProductLabel: string;
  activeOrdinalLabel: string;
  nextOrdinalLabel: string;
  items: ReadonlyArray<M8aV410SequenceRailItem>;
  transitionEvent: {
    visible: boolean;
    fromWindowId: M8aV46dSimulationHandoverWindowId | "";
    toWindowId: M8aV46dSimulationHandoverWindowId | "";
  };
}

export interface M8aV410BoundaryAffordanceRuntime {
  version: typeof M8A_V410_BOUNDARY_AFFORDANCE_VERSION;
  scope: "slice3-boundary-affordance-separation";
  visibleContent: typeof M8A_V410_BOUNDARY_AFFORDANCE_VISIBLE_CONTENT;
  compactCopy: typeof M8A_V410_BOUNDARY_COMPACT_COPY;
  secondaryCopy: typeof M8A_V410_BOUNDARY_SECONDARY_COPY;
  triggerLabel: "Truth";
  defaultVisible: true;
  detailsBehavior:
    "focused-boundary-surface-not-generic-details-inspector";
  detailsSheetState: M8aV47DisclosureState;
  boundarySurfaceState: M8aV47DisclosureState;
  fullTruthDisclosureState: M8aV47DisclosureState;
  fullTruthDisclosurePlacement:
    "boundary-surface-and-details-secondary-disclosure";
  forbiddenBehavior: readonly [
    "truth-does-not-open-generic-details-inspector",
    "truth-and-details-do-not-share-open-state",
    "truth-and-details-do-not-share-sheet-surface"
  ];
}

export interface M8aV49TransitionEventRuntime {
  fromWindowId: M8aV46dSimulationHandoverWindowId;
  toWindowId: M8aV46dSimulationHandoverWindowId;
  fromProductLabel: string;
  toProductLabel: string;
  summaryText: string;
  contextText: string;
  durationMs: typeof M8A_V49_TRANSITION_EVENT_DURATION_MS;
  startedAtEpochMs: number;
  expiresAtEpochMs: number;
  source: "active-v46d-window-id-change";
  stateTruthSource: "persistent-and-scene-near-layers";
  blocksControls: false;
  requiresUserAction: false;
}

export interface M8aV49ProductComprehensionRuntime {
  version: typeof M8A_V49_PRODUCT_COMPREHENSION_VERSION;
  scope: "slice4-inspector-details-hierarchy-redesign";
  firstViewportComposition: M8aV410FirstViewportCompositionRuntime;
  handoverSequenceRail: M8aV410HandoverSequenceRailRuntime;
  boundaryAffordance: M8aV410BoundaryAffordanceRuntime;
  windowIds: ReadonlyArray<M8aV46dSimulationHandoverWindowId>;
  activeWindowCopy: M8aV49WindowProductCopy;
  focusChoreography: M8aV4ItriDemoFocusChoreographyRuntime;
  copyInventory: ReadonlyArray<M8aV49WindowProductCopy>;
  persistentLayer: {
    defaultVisibleContent: typeof M8A_V49_PERSISTENT_ALLOWED_CONTENT;
    deniedDefaultVisibleContent: typeof M8A_V49_PERSISTENT_DENIED_DEFAULT_CONTENT;
    truthAffordanceLabel: "Truth";
    longTruthBadgesDefaultVisible: false;
    metadataDefaultVisible: false;
    compactOnNarrowViewport: true;
  };
  sceneNearMeaningLayer: {
    scope: "slice2-scene-near-meaning-layer-correction";
    reliableAnchorRequired: true;
    reliableVisibleContent: typeof M8A_V49_SCENE_NEAR_RELIABLE_VISIBLE_CONTENT;
    fallbackVisibleContent: typeof M8A_V49_SCENE_NEAR_FALLBACK_VISIBLE_CONTENT;
    fallbackPolicy: "persistent-layer-wording-without-scene-attachment";
    connectorPolicy: "visible-only-when-anchor-geometry-reliable";
    activeMeaning: string;
    activeWatchCueLabel: string;
    activeOrbitClassToken: M8aV49WindowProductCopy["orbitClassToken"];
  };
  transitionEventLayer: {
    scope: "slice3-transition-event-layer";
    trigger: "active-v46d-window-id-change";
    durationMs: typeof M8A_V49_TRANSITION_EVENT_DURATION_MS;
    visibleContent: typeof M8A_V49_TRANSITION_EVENT_VISIBLE_CONTENT;
    deniedVisibleContent: typeof M8A_V49_TRANSITION_EVENT_DENIED_VISIBLE_CONTENT;
    currentStateTruthSource: "persistent-and-scene-near-layers";
    blockingPolicy: "non-blocking-no-user-action";
    placementPolicy: "avoid-reliable-scene-near-cue";
    activeEvent: M8aV49TransitionEventRuntime | null;
  };
  inspectorLayer: {
    scope: "slice4-inspector-details-hierarchy-redesign";
    v410EvidenceRedesignVersion: typeof M8A_V410_INSPECTOR_EVIDENCE_VERSION;
    evidenceStructure: typeof M8A_V410_INSPECTOR_EVIDENCE_STRUCTURE;
    primaryVisibleContent: typeof M8A_V49_INSPECTOR_PRIMARY_VISIBLE_CONTENT;
    deniedPrimaryVisibleContent: typeof M8A_V49_INSPECTOR_DENIED_PRIMARY_CONTENT;
    debugEvidenceContent: typeof M8A_V49_INSPECTOR_DEBUG_EVIDENCE_CONTENT;
    debugEvidenceDefaultOpen: false;
    firstReadRole: "secondary-evidence-inspector";
    deniedFirstReadRoles: typeof M8A_V410_INSPECTOR_DENIED_FIRST_READ_ROLES;
    truthBoundaryPlacement: "concise-primary-summary-full-secondary-disclosure";
    metadataPolicy: "raw-ids-and-arrays-collapsed-implementation-evidence";
    notClaimedContent: typeof M8A_V410_INSPECTOR_NOT_CLAIMED_CONTENT;
    surfaceSeparation:
      "details-inspector-and-truth-boundary-are-separate-states-and-surfaces";
  };
}

export interface M8aV49SceneNearRenderState {
  mode: M8aV49SceneNearDisplayMode;
  heading: string;
  productLabel: string;
  stateMeaning: string;
  watchCueLabel: string;
  fallbackText: string;
  meaningVisible: boolean;
  cueVisible: boolean;
  fallbackVisible: boolean;
  attachmentClaim: M8aV49SceneNearAttachmentClaim;
}

export interface M8aV4ProductUxSimulationHandoverRuntime {
  window: M8aV46dSimulationHandoverWindow;
  timeline: ReadonlyArray<M8aV46dSimulationHandoverWindow>;
}

export function resolveTimelineLabel(
  windowId: M8aV46dSimulationHandoverWindowId
): string {
  return M8A_V46E_TIMELINE_LABELS[windowId];
}

export function resolveReviewActorReference(
  actorId: M8aV46dActorId
): M8aV48ReviewActorReference {
  const actor = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.find(
    (candidate) => candidate.actorId === actorId
  );

  if (!actor) {
    throw new Error(`Missing V4.8 review actor ${actorId}.`);
  }

  return {
    actorId,
    label: actor.label,
    orbitClass: actor.orbitClass
  };
}

export function resolveV48StateOrdinalLabel(
  timeline: ReadonlyArray<M8aV46dSimulationHandoverWindow>,
  windowId: M8aV46dSimulationHandoverWindowId
): {
  stateIndex: number;
  stateCount: number;
  stateOrdinalLabel: string;
} {
  const stateCount = timeline.length;
  const zeroBasedIndex = timeline.findIndex((windowDefinition) => {
    return windowDefinition.windowId === windowId;
  });
  const stateIndex = zeroBasedIndex >= 0 ? zeroBasedIndex + 1 : 1;

  return {
    stateIndex,
    stateCount,
    stateOrdinalLabel: `State ${stateIndex} of ${stateCount}`
  };
}

export function buildV48SceneAnchorState(
  windowDefinition: M8aV46dSimulationHandoverWindow
): M8aV48SceneAnchorState {
  const selectedRelationCueId =
    windowDefinition.windowId === "geo-continuity-guard"
      ? "m8a-v46e-simulation-geo-guard-cue"
      : "m8a-v46e-simulation-displayRepresentative-context-ribbon";
  const selectedCorridorId: M8aV48EndpointCorridorId | null =
    windowDefinition.windowId === "leo-acquisition-context"
      ? "m8a-v4-operator-family-endpoint-context-ribbon"
      : null;

  switch (windowDefinition.windowId) {
    case "meo-continuity-hold":
      return {
        state: "representative-meo-actor-anchor",
        selectedAnchorType: "display-representative-actor",
        selectedActorId: windowDefinition.displayRepresentativeActorId,
        selectedRelationCueId,
        selectedCorridorId,
        anchorStatus: "requires-render-geometry-validation",
        fallbackReason: null,
        anchorClaim: "selected-display-context-cue-not-service-truth"
      };
    case "leo-reentry-candidate":
      return {
        state: "representative-leo-actor-anchor",
        selectedAnchorType: "display-representative-actor",
        selectedActorId: windowDefinition.displayRepresentativeActorId,
        selectedRelationCueId,
        selectedCorridorId,
        anchorStatus: "requires-render-geometry-validation",
        fallbackReason: null,
        anchorClaim: "selected-display-context-cue-not-service-truth"
      };
    case "geo-continuity-guard":
      return {
        state: "geo-guard-cue-anchor",
        selectedAnchorType: "geo-guard-cue",
        selectedActorId: windowDefinition.displayRepresentativeActorId,
        selectedRelationCueId,
        selectedCorridorId,
        anchorStatus: "requires-render-geometry-validation",
        fallbackReason: null,
        anchorClaim: "selected-display-context-cue-not-service-truth"
      };
    case "leo-acquisition-context":
    case "leo-aging-pressure":
      return {
        state: "representative-actor-anchor",
        selectedAnchorType: "display-representative-actor",
        selectedActorId: windowDefinition.displayRepresentativeActorId,
        selectedRelationCueId,
        selectedCorridorId,
        anchorStatus: "requires-render-geometry-validation",
        fallbackReason: null,
        anchorClaim: "selected-display-context-cue-not-service-truth"
      };
  }
}

export function buildV48HandoverReviewViewModel(
  simulationHandoverModel: M8aV4ProductUxSimulationHandoverRuntime
): M8aV48HandoverReviewViewModel {
  const windowDefinition = simulationHandoverModel.window;
  const productLabel = resolveTimelineLabel(windowDefinition.windowId);
  const ordinal = resolveV48StateOrdinalLabel(
    simulationHandoverModel.timeline,
    windowDefinition.windowId
  );
  const reviewCopy = M8A_V48_REVIEW_COPY[windowDefinition.windowId];

  return {
    version: M8A_V48_UI_IA_VERSION,
    windowId: windowDefinition.windowId,
    productLabel,
    ...ordinal,
    representativeActor: resolveReviewActorReference(
      windowDefinition.displayRepresentativeActorId
    ),
    candidateContextActors: windowDefinition.candidateContextActorIds.map(
      resolveReviewActorReference
    ),
    fallbackContextActors: windowDefinition.fallbackContextActorIds.map(
      resolveReviewActorReference
    ),
    reviewPurpose: reviewCopy.reviewPurpose,
    whatChangedFromPreviousState: reviewCopy.whatChangedFromPreviousState,
    whatToWatch: reviewCopy.whatToWatch,
    nextStateHint: reviewCopy.nextStateHint,
    relationCueRole: {
      primary: "displayRepresentative",
      secondary: "candidateContext",
      displayLabel:
        "displayRepresentative primary; candidateContext secondary"
    },
    sceneAnchorState: {
      ...buildV48SceneAnchorState(windowDefinition)
    },
    truthBoundarySummary:
      "Simulation review only; no active satellite, gateway, path, measured metric, native RF, or operator-log truth."
  };
}

export function resolveV49WindowProductCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV49WindowProductCopy {
  const copy = M8A_V49_PRODUCT_COPY[windowId];

  return {
    windowId,
    productLabel: copy.productLabel,
    orbitClassToken: copy.orbitClassToken,
    firstReadMessage: copy.firstReadMessage,
    watchCueLabel: copy.watchCueLabel,
    nextLine: copy.nextLine,
    transitionRole: copy.transitionRole
  };
}

export function resolveM8aV4ItriDemoFocusChoreography(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV4ItriDemoFocusChoreographyRuntime {
  const copy = M8A_V4_ITRI_DEMO_VIEW_FOCUS_COPY[windowId];

  return {
    version: M8A_V4_ITRI_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
    scope: "L1-per-window-focus-choreography",
    visibleContent: M8A_V4_ITRI_DEMO_VIEW_FOCUS_VISIBLE_CONTENT,
    windowId,
    ordinalLabel: copy.ordinalLabel,
    focusId: copy.focusId,
    primaryFocusLabel: copy.primaryFocusLabel,
    focusOrbitClassToken: copy.focusOrbitClassToken,
    focusRole: copy.focusRole,
    briefingLine: copy.briefingLine,
    decisionNow: copy.decisionNow,
    decisionWhy: copy.decisionWhy,
    decisionWatch: copy.decisionWatch,
    nextFocusHint: copy.nextFocusHint,
    visualCue: copy.visualCue,
    sceneCueLabel: copy.sceneCueLabel,
    secondaryActorPolicy: "dim-candidate-fallback-context-keep-next-visible",
    secondaryActorEmphasisRoles: ["candidate", "fallback", "context"],
    nextContextVisible: true,
    truthBoundary: M8A_V4_ITRI_DEMO_VIEW_FOCUS_TRUTH_BOUNDARY
  };
}

export function resolveV49TransitionContextText(
  toCopy: M8aV49WindowProductCopy
): string {
  switch (toCopy.orbitClassToken) {
    case "MEO":
      return "Continuity shifts to MEO review context";
    case "GEO":
      return "Continuity guard shifts to GEO guard context";
    case "LEO":
      return "Review context shifts to LEO focus";
  }
}

export function resolveV410TransitionLabel(
  windowId: M8aV46dSimulationHandoverWindowId
): string {
  return M8A_V410_TRANSITION_LABELS[windowId];
}

export function resolveNextV410SequenceWindowId(
  windowIds: ReadonlyArray<M8aV46dSimulationHandoverWindowId>,
  activeWindowId: M8aV46dSimulationHandoverWindowId
): M8aV46dSimulationHandoverWindowId {
  const activeIndex = windowIds.findIndex((windowId) => {
    return windowId === activeWindowId;
  });
  const nextIndex =
    activeIndex >= 0 ? (activeIndex + 1) % windowIds.length : 0;

  return windowIds[nextIndex] ?? activeWindowId;
}

export function buildV410HandoverSequenceRailRuntime(
  simulationHandoverModel: M8aV4ProductUxSimulationHandoverRuntime,
  activeTransitionEvent: M8aV49TransitionEventRuntime | null
): M8aV410HandoverSequenceRailRuntime {
  const windowIds = simulationHandoverModel.timeline.map(
    (windowDefinition) => windowDefinition.windowId
  );
  const activeWindowId = simulationHandoverModel.window.windowId;
  const nextWindowId = resolveNextV410SequenceWindowId(
    windowIds,
    activeWindowId
  );
  const activeCopy = resolveV49WindowProductCopy(activeWindowId);
  const nextCopy = resolveV49WindowProductCopy(nextWindowId);
  const activeOrdinal = resolveV48StateOrdinalLabel(
    simulationHandoverModel.timeline,
    activeWindowId
  );
  const nextOrdinal = resolveV48StateOrdinalLabel(
    simulationHandoverModel.timeline,
    nextWindowId
  );
  const transitionFromWindowId =
    activeTransitionEvent?.fromWindowId ?? "";
  const transitionToWindowId = activeTransitionEvent?.toWindowId ?? "";

  return {
    version: M8A_V410_HANDOVER_SEQUENCE_RAIL_VERSION,
    scope: "slice2-handover-sequence-rail",
    visibleContent: M8A_V410_SEQUENCE_RAIL_VISIBLE_CONTENT,
    viewportPolicy: "desktop-visible-narrow-compact",
    windowIds,
    activeWindowId,
    nextWindowId,
    activeProductLabel: activeCopy.productLabel,
    nextProductLabel: nextCopy.productLabel,
    activeOrdinalLabel: activeOrdinal.stateOrdinalLabel,
    nextOrdinalLabel: nextOrdinal.stateOrdinalLabel,
    items: simulationHandoverModel.timeline.map((windowDefinition) => {
      const ordinal = resolveV48StateOrdinalLabel(
        simulationHandoverModel.timeline,
        windowDefinition.windowId
      );
      const copy = resolveV49WindowProductCopy(windowDefinition.windowId);

      return {
        windowId: windowDefinition.windowId,
        stateIndex: ordinal.stateIndex,
        stateCount: ordinal.stateCount,
        ordinalLabel: ordinal.stateOrdinalLabel,
        railLabel: resolveV410TransitionLabel(windowDefinition.windowId),
        productLabel: copy.productLabel,
        orbitClassToken: copy.orbitClassToken,
        isActive: windowDefinition.windowId === activeWindowId,
        isNext: windowDefinition.windowId === nextWindowId,
        isTransitionFrom:
          windowDefinition.windowId === transitionFromWindowId,
        isTransitionTo: windowDefinition.windowId === transitionToWindowId
      };
    }),
    transitionEvent: {
      visible: Boolean(activeTransitionEvent),
      fromWindowId: transitionFromWindowId,
      toWindowId: transitionToWindowId
    }
  };
}

export function buildV410BoundaryAffordanceRuntime({
  detailsSheetState,
  boundarySurfaceState,
  fullTruthDisclosureState
}: {
  detailsSheetState: M8aV47DisclosureState;
  boundarySurfaceState: M8aV47DisclosureState;
  fullTruthDisclosureState: M8aV47DisclosureState;
}): M8aV410BoundaryAffordanceRuntime {
  return {
    version: M8A_V410_BOUNDARY_AFFORDANCE_VERSION,
    scope: "slice3-boundary-affordance-separation",
    visibleContent: M8A_V410_BOUNDARY_AFFORDANCE_VISIBLE_CONTENT,
    compactCopy: M8A_V410_BOUNDARY_COMPACT_COPY,
    secondaryCopy: M8A_V410_BOUNDARY_SECONDARY_COPY,
    triggerLabel: "Truth",
    defaultVisible: true,
    detailsBehavior:
      "focused-boundary-surface-not-generic-details-inspector",
    detailsSheetState,
    boundarySurfaceState,
    fullTruthDisclosureState,
    fullTruthDisclosurePlacement:
      "boundary-surface-and-details-secondary-disclosure",
    forbiddenBehavior: [
      "truth-does-not-open-generic-details-inspector",
      "truth-and-details-do-not-share-open-state",
      "truth-and-details-do-not-share-sheet-surface"
    ]
  };
}

export function buildV49TransitionEvent(
  fromWindowId: M8aV46dSimulationHandoverWindowId,
  toWindowId: M8aV46dSimulationHandoverWindowId,
  startedAtEpochMs: number
): M8aV49TransitionEventRuntime {
  const fromCopy = resolveV49WindowProductCopy(fromWindowId);
  const toCopy = resolveV49WindowProductCopy(toWindowId);

  return {
    fromWindowId,
    toWindowId,
    fromProductLabel: fromCopy.productLabel,
    toProductLabel: toCopy.productLabel,
    summaryText: `${resolveV410TransitionLabel(
      fromWindowId
    )} -> ${resolveV410TransitionLabel(toWindowId)}`,
    contextText: resolveV49TransitionContextText(toCopy),
    durationMs: M8A_V49_TRANSITION_EVENT_DURATION_MS,
    startedAtEpochMs,
    expiresAtEpochMs: startedAtEpochMs + M8A_V49_TRANSITION_EVENT_DURATION_MS,
    source: "active-v46d-window-id-change",
    stateTruthSource: "persistent-and-scene-near-layers",
    blocksControls: false,
    requiresUserAction: false
  };
}

export function buildV49ProductComprehensionRuntime(
  simulationHandoverModel: M8aV4ProductUxSimulationHandoverRuntime,
  activeTransitionEvent: M8aV49TransitionEventRuntime | null,
  detailsSheetState: M8aV47DisclosureState,
  boundarySurfaceState: M8aV47DisclosureState,
  fullTruthDisclosureState: M8aV47DisclosureState
): M8aV49ProductComprehensionRuntime {
  const windowIds = simulationHandoverModel.timeline.map(
    (windowDefinition) => windowDefinition.windowId
  );
  const copyInventory = windowIds.map(resolveV49WindowProductCopy);
  const activeWindowCopy = resolveV49WindowProductCopy(
    simulationHandoverModel.window.windowId
  );
  const focusChoreography = resolveM8aV4ItriDemoFocusChoreography(
    simulationHandoverModel.window.windowId
  );

  return {
    version: M8A_V49_PRODUCT_COMPREHENSION_VERSION,
    scope: "slice4-inspector-details-hierarchy-redesign",
    firstViewportComposition: {
      version: M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION,
      scope: "slice1-first-viewport-composition",
      sceneNarrativeVisibleContent: M8A_V410_SCENE_NARRATIVE_VISIBLE_CONTENT,
      controlsPriority: "secondary",
      inspectorDefaultOpen: false,
      routePreservation: M8A_V4_GROUND_STATION_QUERY_VALUE,
      endpointPairPreserved:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel
          .endpointPairId,
      sequenceRailScope: "slice2-handover-sequence-rail"
    },
    handoverSequenceRail: buildV410HandoverSequenceRailRuntime(
      simulationHandoverModel,
      activeTransitionEvent
    ),
    boundaryAffordance: buildV410BoundaryAffordanceRuntime({
      detailsSheetState,
      boundarySurfaceState,
      fullTruthDisclosureState
    }),
    windowIds,
    activeWindowCopy,
    focusChoreography,
    copyInventory,
    persistentLayer: {
      defaultVisibleContent: M8A_V49_PERSISTENT_ALLOWED_CONTENT,
      deniedDefaultVisibleContent: M8A_V49_PERSISTENT_DENIED_DEFAULT_CONTENT,
      truthAffordanceLabel: "Truth",
      longTruthBadgesDefaultVisible: false,
      metadataDefaultVisible: false,
      compactOnNarrowViewport: true
    },
    sceneNearMeaningLayer: {
      scope: "slice2-scene-near-meaning-layer-correction",
      reliableAnchorRequired: true,
      reliableVisibleContent: M8A_V49_SCENE_NEAR_RELIABLE_VISIBLE_CONTENT,
      fallbackVisibleContent: M8A_V49_SCENE_NEAR_FALLBACK_VISIBLE_CONTENT,
      fallbackPolicy: "persistent-layer-wording-without-scene-attachment",
      connectorPolicy: "visible-only-when-anchor-geometry-reliable",
      activeMeaning: activeWindowCopy.firstReadMessage,
      activeWatchCueLabel: activeWindowCopy.watchCueLabel,
      activeOrbitClassToken: activeWindowCopy.orbitClassToken
    },
    transitionEventLayer: {
      scope: "slice3-transition-event-layer",
      trigger: "active-v46d-window-id-change",
      durationMs: M8A_V49_TRANSITION_EVENT_DURATION_MS,
      visibleContent: M8A_V49_TRANSITION_EVENT_VISIBLE_CONTENT,
      deniedVisibleContent: M8A_V49_TRANSITION_EVENT_DENIED_VISIBLE_CONTENT,
      currentStateTruthSource: "persistent-and-scene-near-layers",
      blockingPolicy: "non-blocking-no-user-action",
      placementPolicy: "avoid-reliable-scene-near-cue",
      activeEvent: activeTransitionEvent
    },
    inspectorLayer: {
      scope: "slice4-inspector-details-hierarchy-redesign",
      v410EvidenceRedesignVersion: M8A_V410_INSPECTOR_EVIDENCE_VERSION,
      evidenceStructure: M8A_V410_INSPECTOR_EVIDENCE_STRUCTURE,
      primaryVisibleContent: M8A_V49_INSPECTOR_PRIMARY_VISIBLE_CONTENT,
      deniedPrimaryVisibleContent: M8A_V49_INSPECTOR_DENIED_PRIMARY_CONTENT,
      debugEvidenceContent: M8A_V49_INSPECTOR_DEBUG_EVIDENCE_CONTENT,
      debugEvidenceDefaultOpen: false,
      firstReadRole: "secondary-evidence-inspector",
      deniedFirstReadRoles: M8A_V410_INSPECTOR_DENIED_FIRST_READ_ROLES,
      truthBoundaryPlacement: "concise-primary-summary-full-secondary-disclosure",
      metadataPolicy: "raw-ids-and-arrays-collapsed-implementation-evidence",
      notClaimedContent: M8A_V410_INSPECTOR_NOT_CLAIMED_CONTENT,
      surfaceSeparation:
        "details-inspector-and-truth-boundary-are-separate-states-and-surfaces"
    }
  };
}

export function resolvePlaybackMode(
  multiplier: number
): M8aV47PlaybackMode {
  switch (multiplier) {
    case M8A_V47_GUIDED_REVIEW_MULTIPLIER:
      return "guided-review";
    case M8A_V47_PRODUCT_DEFAULT_MULTIPLIER:
      return "product-default";
    case M8A_V47_QUICK_SCAN_MULTIPLIER:
      return "quick-scan";
    case M8A_V47_DEBUG_TEST_MULTIPLIER:
      return "debug-test";
    default:
      return "product-default";
  }
}

export function coercePlaybackMultiplier(
  multiplier: number
): M8aV47PlaybackMultiplier {
  return multiplier === M8A_V47_GUIDED_REVIEW_MULTIPLIER ||
    multiplier === M8A_V47_PRODUCT_DEFAULT_MULTIPLIER ||
    multiplier === M8A_V47_QUICK_SCAN_MULTIPLIER ||
    multiplier === M8A_V47_DEBUG_TEST_MULTIPLIER
    ? multiplier
    : M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
}

export function formatReviewClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export function buildSimulatedReplayTimeDisplay(
  replayRatio: number,
  replayDurationMs: number,
  multiplier: number
): {
  reviewElapsedDisplay: string;
  reviewDurationDisplay: string;
  simulatedReplayTimeDisplay: string;
} {
  const safeMultiplier =
    Number.isFinite(multiplier) && multiplier > 0
      ? multiplier
      : M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
  const reviewDurationSeconds = replayDurationMs / 1000 / safeMultiplier;
  const reviewElapsedSeconds = reviewDurationSeconds * replayRatio;
  const reviewElapsedDisplay = formatReviewClock(reviewElapsedSeconds);
  const reviewDurationDisplay = formatReviewClock(reviewDurationSeconds);

  return {
    reviewElapsedDisplay,
    reviewDurationDisplay,
    simulatedReplayTimeDisplay: `Sim replay ${reviewElapsedDisplay} / ${reviewDurationDisplay}`
  };
}

export function resolvePlaybackStatus(
  replayState: ReplayClockState,
  finalHoldActive: boolean
): M8aV47PlaybackStatus {
  if (finalHoldActive) {
    return "final-hold";
  }

  return replayState.isPlaying ? "playing" : "paused";
}
