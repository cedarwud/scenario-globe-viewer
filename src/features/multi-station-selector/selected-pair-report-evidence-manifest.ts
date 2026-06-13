export type SelectedPairEvidenceStatus =
  | "available"
  | "partial"
  | "not-attached"
  | "source-gap";

export interface SelectedPairExternalEvidenceEntry {
  readonly evidenceId: string;
  readonly requirementIds: ReadonlyArray<string>;
  readonly status: SelectedPairEvidenceStatus;
  readonly artifactRefs: ReadonlyArray<string>;
  readonly evidenceValue: string;
  readonly howToRead: string;
  readonly boundary: string;
}

export interface SelectedPairMissingEvidenceEntry {
  readonly gapId: string;
  readonly requirementIds: ReadonlyArray<string>;
  readonly missingEvidence: string;
  readonly neededSource: string;
  readonly impact: string;
  readonly boundary: string;
}

export const SELECTED_PAIR_EXTERNAL_EVIDENCE: ReadonlyArray<SelectedPairExternalEvidenceEntry> = [
  {
    evidenceId: "selected-pair-report-smoke",
    requirementIds: ["R1-F5 / K-E5"],
    status: "available",
    artifactRefs: [
      "tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs",
      "output/selected-pair-source-report/smoke-manifest.json"
    ],
    evidenceValue:
      "Report smoke verifies tabs, requirement rows, source tables, Evidence Detail, HTML report, and CSV export.",
    howToRead:
      "Use this as smoke evidence for report packaging and the readable evidence page, not as external measurement data.",
    boundary:
      "It does not create external packet-test, traffic bridge, DUT, or final written report evidence."
  },
  {
    evidenceId: "selected-pair-external-source-reconciliation",
    requirementIds: [
      "R1-F1 / K-E1",
      "K-A2",
      "K-A3-b",
      "K-F2",
      "(irreducible-1)",
      "(irreducible-2)",
      "(irreducible-3)"
    ],
    status: "partial",
    artifactRefs: [
      "deliverable/selected-pair-source-evidence/external-source-reconciliation.md",
      "deliverable/selected-pair-source-evidence/evidence-manifest.json"
    ],
    evidenceValue:
      "Retained reconciliation compares the selected-pair station values, recovers the Open-Elevation source method for legacy selected-pair elevation cache values, source tier, TLE/standards method, DEM/rain repair paths, and non-observable packet/RF claims against public sources.",
    howToRead:
      "Use this to decide which slide-facing values are verified, compatible, partial, source-conflicting, source gaps, or not externally observable.",
    boundary:
      "It does not prove packet-test traces, native RF handover, active serving route, station RF hardware truth, DUT traffic-generator runs, or final acceptance thresholds."
  },
  {
    evidenceId: "selected-pair-dem-rain-repair-sources",
    requirementIds: ["K-A3-b", "K-F2", "(irreducible-3)"],
    status: "partial",
    artifactRefs: [
      "deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json",
      "deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json",
      "deliverable/selected-pair-source-evidence/rain-source-repair-candidates-2026-06-12.json",
      "deliverable/selected-pair-source-evidence/local-rain-calibration-2026-06-13.json"
    ],
    evidenceValue:
      "Retained repair-source artifacts record selected-pair Copernicus GLO-30 tile/cell/datum samples, a selected-pair public-DEM-derived terrain mask, candidate NASA GPM / CWA rain-calibration source paths, and a public CWA local rain statistic mapped to a 5 mm/h demo preset.",
    howToRead:
      "Use these artifacts to explain which DEM and rain sources repair selected-pair gaps, which stronger claims remain bounded, and how the public local-rain statistic is bounded.",
    boundary:
      "They do not provide surveyed RF horizon, full-registry DEM terrain replacement, link-measured weather, long-term R0.01 rain calibration, or packet/RF behavior."
  },
  {
    evidenceId: "selected-pair-route-governance",
    requirementIds: ["R1-T4 / K-D3", "K-F7"],
    status: "available",
    artifactRefs: ["scripts/verify-selected-pair-route-governance.mjs"],
    evidenceValue:
      "Route governance gate preserves the boundary between the selected-pair route and the legacy fixture route.",
    howToRead:
      "Use this to confirm the report and selected-pair route did not fall back to the old fixture-only flow.",
    boundary:
      "Route governance is not handover authenticity, commercial routing, or packet-test evidence."
  },
  {
    evidenceId: "phase7-0-24h-soak",
    requirementIds: ["R1-D4"],
    status: "available",
    artifactRefs: [
      "output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json"
    ],
    evidenceValue:
      "Retained soak artifact records passed=true, durationMs=86400000, failureCount=0, and sampleCount=1289.",
    howToRead:
      "Use this as retained run evidence for 24-hour stable operation.",
    boundary:
      "Opening the selected-pair report does not rerun the 24-hour soak."
  },
  {
    evidenceId: "multi-orbit-scale-validation",
    requirementIds: ["R1-F1 / K-E1"],
    status: "available",
    artifactRefs: [
      "output/validation/phase7.1/2026-05-15T09-04-53.180Z-multi-orbit-scale-1000/summary.json"
    ],
    evidenceValue:
      "Scale artifact records observed LEO=600, MEO=65, GEO=30, with targetLeoCount=500 passed.",
    howToRead:
      "Use this to support source inventory scale, TLE/SGP4 geometry-ranked runtime caps, and visible actor layering in the selected-pair report.",
    boundary:
      "Scale validation does not mean all source actors must be visible at once in the selected-pair view."
  },
  {
    evidenceId: "external-infra-validation-summary",
    requirementIds: ["K-A5", "K-B1", "K-C1", "K-F5", "K-F6"],
    status: "partial",
    artifactRefs: [
      "output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json"
    ],
    evidenceValue:
      "External validation summary retains local environment details and records that tunnel, NAT, DUT, traffic-generator, ping, and iperf evidence are still missing.",
    howToRead:
      "Use it to keep class-C external infrastructure evidence separate from the selected-pair runtime report.",
    boundary:
      "A partial external package must not be read as passed tunnel, NAT, DUT, or traffic-generator validation."
  }
] as const;

export const SELECTED_PAIR_MISSING_EVIDENCE: ReadonlyArray<SelectedPairMissingEvidenceEntry> = [
  {
    gapId: "packet-test-trace",
    requirementIds: ["R1-F3 / K-E3", "(irreducible-1)", "K-A2"],
    missingEvidence:
      "No ping/iperf or equivalent packet-test time series.",
    neededSource:
      "Needs retained packet-test logs with endpoint, direction, duration, latency, jitter, loss, or throughput fields.",
    impact:
      "Communication time and handover policy can only be read as model-calculated time and model-selected events.",
    boundary:
      "Model values cannot be upgraded into packet-test or real connection evidence."
  },
  {
    gapId: "acceptance-threshold-script",
    requirementIds: ["(irreducible-2)"],
    missingEvidence:
      "No external acceptance scenario script or pass/fail threshold package.",
    neededSource:
      "Needs retained scenario cases, thresholds, expected pass/fail results, and reviewer verdict.",
    impact:
      "The report can present an evidence map, but cannot decide acceptance by itself.",
    boundary:
      "Requirement coverage table is not a procurement acceptance decision."
  },
  {
    gapId: "local-rain-calibration",
    requirementIds: ["K-A3-b", "(irreducible-3)"],
    missingEvidence:
      "No measured-for-link local weather, SANSA rainfall sample, scenario-window rain source, or long-term R0.01 calibration.",
    neededSource:
      "Needs measured local weather for the selected link or long-term station/grid statistics accepted as a climate calibration source.",
    impact:
      "Rain impact remains a standards-derived model response to scenario input; the retained CWA sample only supports a public local rain statistic and a 5 mm/h demo preset.",
    boundary:
      "Not measured-for-link weather or R0.01 availability calibration."
  },
  {
    gapId: "operator-rf-hardware-truth",
    requirementIds: ["K-A3-a", "K-F2"],
    missingEvidence:
      "Selected-pair payload has no operator station RF hardware source for real dish size, EIRP, polarization, beamwidth, or pattern.",
    neededSource:
      "Needs station RF hardware sources covering real gain, beamwidth, pattern, EIRP, and polarization if a stronger-than-assumed claim is required.",
    impact:
      "K-A3-a/K-F2 can be read as standards-derived model evidence with assumed Tier-B antenna parameters, but not as operator hardware evidence.",
    boundary:
      "Assumed antenna parameters are not operator hardware truth or measured RF evidence."
  },
  {
    gapId: "external-network-bridge",
    requirementIds: ["K-F1", "K-B1", "K-C1"],
    missingEvidence:
      "No successful tunnel, bridge, NAT, packet path, or simulated-to-real traffic transcript.",
    neededSource:
      "Needs topology, interface inventory, route/NAT rules, bridge/tunnel logs, and successful traffic transcript.",
    impact:
      "Class-C network bridge rows can only be marked as external evidence / source gap.",
    boundary:
      "Modeled visibility or handover rows cannot prove a physical network bridge."
  },
  {
    gapId: "dut-traffic-generator-run",
    requirementIds: ["K-F5", "K-F6"],
    missingEvidence:
      "No virtual DUT testbench run and no physical DUT / traffic-generator retained result.",
    neededSource:
      "Needs DUT identity, traffic profile, command transcript, raw result, redaction policy, and reviewer verdict.",
    impact:
      "The selected-pair report cannot validate DUT or traffic-generator deliverables.",
    boundary:
      "Globe projection data is not a testbench program or traffic-generator result."
  },
  {
    gapId: "final-written-report-package",
    requirementIds: ["K-F8", "R1-D5"],
    missingEvidence:
      "No final written report package or technical evaluation report artifact is attached.",
    neededSource:
      "Needs a formal written report, appendix index, artifact references, and reviewer-facing conclusions.",
    impact:
      "HTML report can be an evidence appendix candidate, but cannot replace the formal report.",
    boundary:
      "Downloadable HTML is not the final written report."
  }
] as const;
