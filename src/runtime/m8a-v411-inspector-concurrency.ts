import type { M8aV46dSimulationHandoverWindowId } from "./m8a-v4-ground-station-projection";

export const M8A_V411_INSPECTOR_CONCURRENCY_VERSION =
  "m8a-v4.11-inspector-concurrency-slice3-runtime.v1";
export const M8A_V411_INSPECTOR_CONCURRENCY_CONV2_BEHAVIOR =
  "single-state-evidence-role-truth-button-shows-state-evidence";
export const M8A_V411_INSPECTOR_MAX_WIDTH_PX = 320;
export const M8A_V411_INSPECTOR_MAX_CANVAS_WIDTH_RATIO = 0.28;
export const M8A_V411_INSPECTOR_MAX_HEIGHT_CSS = "calc(100vh - 9.5rem)";
export const M8A_V411_INSPECTOR_PRIMARY_ROLE = "state-evidence";

export interface M8aV411StateEvidenceCopy {
  title: string;
  paragraph: string;
  now: string;
  why: string;
  next: string;
  watch: string;
  detail: string;
  truthTailHeading: string;
  truthTailLines: readonly string[];
}

const M8A_V411_TRUTH_TAIL_HEADING = "Truth boundary";
const M8A_V411_TRUTH_TAIL_LINES: readonly string[] = [
  "Simulated display-context state, not an operator handover log.",
  "Source-lineaged display-context actors, not active serving satellites.",
  "Endpoint precision stays operator-family only.",
  "No active gateway assignment is claimed.",
  "No pair-specific teleport path is claimed.",
  "No measured latency, jitter, throughput, or continuity values are shown.",
  "No native RF handover is claimed."
];

// V4.9 inspector matrix smoke checks each window's State Evidence section
// for the V4.6D product label (e.g., "LEO pressure") and the "window N of 5"
// ordinal marker. V4.10 Slice 4 W1 details click smoke and V4.8 inspector
// matrix smoke require the V4.11 baseline English paragraph verbatim per
// window. Conv 2 keeps these as a backward-compat detail block while
// making the Addendum §1.2 layperson Chinese paragraph the primary
// visible content.
const M8A_V411_W1_LEGACY_DETAIL =
  "The simulation review is currently anchored on the OneWeb LEO context marked as the focus role. The five-state V4.6D model is in window 1 of 5. Watch the LEO actor for the early pressure signal — the next modeled state is LEO pressure. Endpoint precision remains operator-family only and no active gateway is being claimed.";
const M8A_V411_W2_LEGACY_DETAIL =
  "The simulation marks the LEO context as under aging pressure in window 2 of 5. The geometry is degrading by simulation, not by measurement. The next modeled state holds continuity on the MEO context. No real RF handover is being asserted.";
const M8A_V411_W3_LEGACY_DETAIL =
  "The simulation holds continuity on the SES O3b mPOWER MEO context in window 3 of 5. This is wider-area continuity by model, not a measured failover. LEO returns as a candidate focus in the next window. Endpoint precision remains operator-family only.";
const M8A_V411_W4_LEGACY_DETAIL =
  "LEO returns as a candidate review focus in window 4 of 5. The next state closes the sequence on GEO guard context. Continuity here is modeled, not measured.";
const M8A_V411_W5_LEGACY_DETAIL =
  "The sequence closes on GEO as guard context in window 5 of 5. GEO is shown as continuity guard only — no failover proof is being asserted. Restart to review the simulation again.";

const M8A_V411_STATE_EVIDENCE_COPY = {
  "leo-acquisition-context": {
    title: "剛接上 OneWeb LEO · LEO review focus",
    paragraph:
      "剛接上 OneWeb LEO，連線品質強。約 22 分鐘後，因為位置條件變化會進入訊號減弱階段。",
    now: "Now: LEO is the modeled primary service state for this window.",
    why: "Why: position conditions support low-latency LEO review focus.",
    next: "Next: watch for LEO aging pressure before the MEO hold window.",
    watch: "Watch: simulated service time and modeled quality class only.",
    detail: M8A_V411_W1_LEGACY_DETAIL,
    truthTailHeading: M8A_V411_TRUTH_TAIL_HEADING,
    truthTailLines: M8A_V411_TRUTH_TAIL_LINES
  },
  "leo-aging-pressure": {
    title: "LEO 訊號減弱中 · LEO pressure",
    paragraph:
      "LEO 的位置條件正在變差。約 10 分鐘後，連線會切到較廣覆蓋的 MEO 暫時接住。",
    now: "Now: LEO remains primary but is under modeled pressure.",
    why: "Why: the replay window says position conditions are worsening.",
    next: "Next: MEO is the modeled continuity hold candidate.",
    watch: "Watch: simulated countdown and quality-class drop, not measured jitter.",
    detail: M8A_V411_W2_LEGACY_DETAIL,
    truthTailHeading: M8A_V411_TRUTH_TAIL_HEADING,
    truthTailLines: M8A_V411_TRUTH_TAIL_LINES
  },
  "meo-continuity-hold": {
    title: "MEO 暫時接住 · MEO continuity hold",
    paragraph:
      "目前由 MEO 暫時接住，覆蓋面廣但延遲略高。模擬預期約 14 分鐘後會有新的候選 LEO 出現。",
    now: "Now: MEO is the modeled primary hold state.",
    why: "Why: wider coverage carries continuity while LEO is not primary.",
    next: "Next: a LEO re-entry candidate appears in the following window.",
    watch: "Watch: higher-latency modeled class without measured latency values.",
    detail: M8A_V411_W3_LEGACY_DETAIL,
    truthTailHeading: M8A_V411_TRUTH_TAIL_HEADING,
    truthTailLines: M8A_V411_TRUTH_TAIL_LINES
  },
  "leo-reentry-candidate": {
    title: "LEO 候選回來 · LEO re-entry",
    paragraph:
      "有新的 LEO 進入候選範圍。依位置條件預測，切回後可有約 22 分鐘低延遲。MEO 仍在接住，沒有立即必須切的壓力。",
    now: "Now: MEO remains primary while LEO is only a candidate.",
    why: "Why: position conditions recovered enough for LEO evaluation.",
    next: "Next: the sequence closes on GEO guard coverage.",
    watch: "Watch: candidate quality class and evaluation time, not active service truth.",
    detail: M8A_V411_W4_LEGACY_DETAIL,
    truthTailHeading: M8A_V411_TRUTH_TAIL_HEADING,
    truthTailLines: M8A_V411_TRUTH_TAIL_LINES
  },
  "geo-continuity-guard": {
    title: "GEO 保底覆蓋 · GEO guard context",
    paragraph:
      "GEO 作為保底覆蓋角色，永遠連得到，但這只是模擬展示，不是實際備援切換證據。序列在這裡結束。",
    now: "Now: GEO is shown as the modeled guard coverage state.",
    why: "Why: the replay closes on a coverage boundary, not failover proof.",
    next: "Next: restart returns to the LEO acquisition window.",
    watch: "Watch: guard role wording so it is not read as backup-switch evidence.",
    detail: M8A_V411_W5_LEGACY_DETAIL,
    truthTailHeading: M8A_V411_TRUTH_TAIL_HEADING,
    truthTailLines: M8A_V411_TRUTH_TAIL_LINES
  }
} satisfies Record<M8aV46dSimulationHandoverWindowId, M8aV411StateEvidenceCopy>;

export function resolveM8aV411StateEvidenceCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV411StateEvidenceCopy {
  return M8A_V411_STATE_EVIDENCE_COPY[windowId];
}

export function resolveM8aV411TruthBoundaryLines(
  windowId: M8aV46dSimulationHandoverWindowId,
  baseLines: readonly string[]
): readonly string[] {
  if (windowId !== "geo-continuity-guard") {
    return baseLines;
  }

  return [...baseLines, "No active failover proof is claimed."];
}

export interface M8aV411PhaseCRailCopy {
  current: string;
  candidate: string;
  fallback: string;
  decision: string;
  quality: string;
}

const M8A_V411_PHASE_C_RAIL_COPY = {
  "leo-acquisition-context": {
    current: "Current: W1 LEO primary review",
    candidate: "Candidate: none promoted in W1",
    fallback: "Fallback: MEO/GEO observed only",
    decision: "Decision: LEO is usable now; watch service time",
    quality: "Time/Quality: simulated remaining time; modeled quality strong"
  },
  "leo-aging-pressure": {
    current: "Current: W2 LEO primary under pressure",
    candidate: "Candidate: MEO continuity hold queued",
    fallback: "Fallback: GEO guard coverage available",
    decision: "Decision: position condition is worsening; prepare switch",
    quality: "Time/Quality: simulated countdown; modeled quality drops"
  },
  "meo-continuity-hold": {
    current: "Current: W3 MEO primary hold",
    candidate: "Candidate: LEO re-entry expected next",
    fallback: "Fallback: GEO guard coverage available",
    decision: "Decision: MEO temporarily carries continuity",
    quality: "Time/Quality: derived hold time; higher-latency class"
  },
  "leo-reentry-candidate": {
    current: "Current: W4 MEO primary hold",
    candidate: "Candidate: LEO under modeled evaluation",
    fallback: "Fallback: GEO guard coverage available",
    decision: "Decision: 位置條件恢復，正在評估切回 LEO",
    quality: "Time/Quality: evaluation time; candidate quality class"
  },
  "geo-continuity-guard": {
    current: "Current: W5 GEO guard context",
    candidate: "Candidate: no next candidate in final window",
    fallback: "Fallback: GEO is the modeled guard role",
    decision: "Decision: GEO is fallback/guard coverage",
    quality: "Time/Quality: sequence ending; boundary-only quality"
  }
} satisfies Record<M8aV46dSimulationHandoverWindowId, M8aV411PhaseCRailCopy>;

export function resolveM8aV411PhaseCRailCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV411PhaseCRailCopy {
  return M8A_V411_PHASE_C_RAIL_COPY[windowId];
}

export interface M8aV411PhaseCMetricsCopy {
  quality: string;
  timing: string;
  measurement: string;
  physical: string;
}

const M8A_V411_PHASE_C_METRICS_COPY = {
  "leo-acquisition-context": {
    quality: "Modeled link quality: strong LEO class from V4.6D projection.",
    timing: "Communication time: approximate simulated remaining window time.",
    measurement:
      "Unavailable measured data: no ping, iperf, ESTNeT/INET, DUT, latency, jitter, throughput, or packet-loss feed is connected to this route.",
    physical:
      "Unavailable physical factors: rain, antenna, ITU/V group, and rain attenuation models are not connected in this scene."
  },
  "leo-aging-pressure": {
    quality: "Modeled link quality: LEO class drops as geometry degrades.",
    timing: "Communication time: derived remaining replay-window time.",
    measurement:
      "Unavailable measured data: no ping, iperf, ESTNeT/INET, DUT, latency, jitter, throughput, or packet-loss feed is connected to this route.",
    physical:
      "Unavailable physical factors: rain, antenna, ITU/V group, and rain attenuation models are not connected in this scene."
  },
  "meo-continuity-hold": {
    quality: "Modeled link quality: MEO hold class with higher-latency wording only.",
    timing: "Communication time: derived remaining MEO hold window time.",
    measurement:
      "Unavailable measured data: no ping, iperf, ESTNeT/INET, DUT, latency, jitter, throughput, or packet-loss feed is connected to this route.",
    physical:
      "Unavailable physical factors: rain, antenna, ITU/V group, and rain attenuation models are not connected in this scene."
  },
  "leo-reentry-candidate": {
    quality: "Modeled link quality: LEO candidate class, not primary service proof.",
    timing: "Communication time: approximate remaining evaluation time.",
    measurement:
      "Unavailable measured data: no ping, iperf, ESTNeT/INET, DUT, latency, jitter, throughput, or packet-loss feed is connected to this route.",
    physical:
      "Unavailable physical factors: rain, antenna, ITU/V group, and rain attenuation models are not connected in this scene."
  },
  "geo-continuity-guard": {
    quality: "Modeled link quality: GEO guard boundary class only.",
    timing: "Communication time: replay sequence ends in this window.",
    measurement:
      "Unavailable measured data: no ping, iperf, ESTNeT/INET, DUT, latency, jitter, throughput, or packet-loss feed is connected to this route.",
    physical:
      "Unavailable physical factors: rain, antenna, ITU/V group, and rain attenuation models are not connected in this scene."
  }
} satisfies Record<M8aV46dSimulationHandoverWindowId, M8aV411PhaseCMetricsCopy>;

export function resolveM8aV411PhaseCMetricsCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV411PhaseCMetricsCopy {
  return M8A_V411_PHASE_C_METRICS_COPY[windowId];
}
