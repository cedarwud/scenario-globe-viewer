import type { RuntimeProjectionResult } from "./runtime-projection";
import type { OrbitClass } from "./visibility-utils";

interface Wave1BaselineEvent {
  readonly handoverAtUtc: string;
  readonly reasonKind: RuntimeProjectionResult["handoverEvents"][number]["reasonKind"];
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
}

export interface Wave1Baseline {
  readonly stationAId: string;
  readonly stationBId: string;
  readonly totalCommunicatingMs: number;
  readonly handoverCount: number;
  readonly meanLinkDwellMs: number;
  readonly linkSelectionEventCount: number;
  readonly events: ReadonlyArray<Wave1BaselineEvent>;
  readonly throughputMbps: Readonly<Partial<Record<OrbitClass, number>>>;
}

const WAVE1_BASELINES: ReadonlyArray<Wave1Baseline> = [
  {
    stationAId: "ksat-svalsat-svalbard",
    stationBId: "ksat-tromso",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 1,
    meanLinkDwellMs: 10_800_000,
    linkSelectionEventCount: 2,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0210 (GALILEO 13)"
      },
      {
        handoverAtUtc: "2026-05-17T05:24:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0210 (GALILEO 13)",
        toSatelliteId: "GSAT0226 (GALILEO 31)"
      }
    ],
    throughputMbps: { LEO: 198.932, MEO: 99.712, GEO: 48.841 }
  },
  {
    stationAId: "ksat-svalsat-svalbard",
    stationBId: "ksat-trollsat-antarctica",
    totalCommunicatingMs: 0,
    handoverCount: 0,
    meanLinkDwellMs: 0,
    linkSelectionEventCount: 0,
    events: [],
    throughputMbps: {}
  },
  {
    stationAId: "intelsat-fuchsstadt",
    stationBId: "intelsat-atlanta",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 2,
    meanLinkDwellMs: 7_200_000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0213 (GALILEO 17)"
      },
      {
        handoverAtUtc: "2026-05-17T03:35:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0213 (GALILEO 17)",
        toSatelliteId: "GSAT0227 (GALILEO 30)"
      },
      {
        handoverAtUtc: "2026-05-17T05:20:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0227 (GALILEO 30)",
        toSatelliteId: "GSAT0205 (GALILEO 9)"
      }
    ],
    throughputMbps: { MEO: 99.712, GEO: 48.841 }
  },
  {
    stationAId: "singtel-bukit-timah",
    stationBId: "measat-cyberjaya",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 0,
    meanLinkDwellMs: 21_600_000,
    linkSelectionEventCount: 1,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "ASIASTAR"
      }
    ],
    throughputMbps: { LEO: 198.932, GEO: 48.841 }
  },
  {
    stationAId: "cht-yangmingshan",
    stationBId: "sansa-hartebeesthoek",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 2,
    meanLinkDwellMs: 7_200_000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "INMARSAT 3-F3"
      },
      {
        handoverAtUtc: "2026-05-17T02:24:30.000Z",
        reasonKind: "better-candidate-available",
        fromSatelliteId: "INMARSAT 3-F3",
        toSatelliteId: "GSAT0203 (GALILEO 7)"
      },
      {
        handoverAtUtc: "2026-05-17T04:31:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0203 (GALILEO 7)",
        toSatelliteId: "INMARSAT 3-F3"
      }
    ],
    throughputMbps: { LEO: 198.932, MEO: 99.712, GEO: 48.841 }
  }
];

function baselineKey(stationAId: string, stationBId: string): string {
  return [stationAId, stationBId].sort().join("|");
}

export const WAVE1_BASELINE_BY_PAIR: ReadonlyMap<string, Wave1Baseline> =
  new Map(
    WAVE1_BASELINES.map((baseline) => [
      baselineKey(baseline.stationAId, baseline.stationBId),
      baseline
    ])
  );
