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
    totalCommunicatingMs: 21600000,
    handoverCount: 58,
    meanLinkDwellMs: 366102,
    linkSelectionEventCount: 59,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        fromSatelliteId: null,
        toSatelliteId: "ONEWEB-0615",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:10:30.000Z",
        fromSatelliteId: "ONEWEB-0615",
        toSatelliteId: "ONEWEB-0611",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:20:00.000Z",
        fromSatelliteId: "ONEWEB-0611",
        toSatelliteId: "ONEWEB-0601",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:25:00.000Z",
        fromSatelliteId: "ONEWEB-0601",
        toSatelliteId: "ONEWEB-0585",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:27:30.000Z",
        fromSatelliteId: "ONEWEB-0585",
        toSatelliteId: "ONEWEB-0610",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:30:00.000Z",
        fromSatelliteId: "ONEWEB-0610",
        toSatelliteId: "ONEWEB-0545",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:32:00.000Z",
        fromSatelliteId: "ONEWEB-0545",
        toSatelliteId: "ONEWEB-0574",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:34:30.000Z",
        fromSatelliteId: "ONEWEB-0574",
        toSatelliteId: "ONEWEB-0239",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:44:00.000Z",
        fromSatelliteId: "ONEWEB-0239",
        toSatelliteId: "ONEWEB-0222",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T00:52:00.000Z",
        fromSatelliteId: "ONEWEB-0222",
        toSatelliteId: "ONEWEB-0211",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:00:30.000Z",
        fromSatelliteId: "ONEWEB-0211",
        toSatelliteId: "ONEWEB-0229",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:11:30.000Z",
        fromSatelliteId: "ONEWEB-0229",
        toSatelliteId: "ONEWEB-0245",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:18:30.000Z",
        fromSatelliteId: "ONEWEB-0245",
        toSatelliteId: "ONEWEB-0232",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:23:00.000Z",
        fromSatelliteId: "ONEWEB-0232",
        toSatelliteId: "ONEWEB-0247",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:25:30.000Z",
        fromSatelliteId: "ONEWEB-0247",
        toSatelliteId: "ONEWEB-0244",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:30:00.000Z",
        fromSatelliteId: "ONEWEB-0244",
        toSatelliteId: "ONEWEB-0210",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:32:00.000Z",
        fromSatelliteId: "ONEWEB-0210",
        toSatelliteId: "ONEWEB-0237",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:34:30.000Z",
        fromSatelliteId: "ONEWEB-0237",
        toSatelliteId: "ONEWEB-0551",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:36:30.000Z",
        fromSatelliteId: "ONEWEB-0551",
        toSatelliteId: "ONEWEB-0011",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:42:30.000Z",
        fromSatelliteId: "ONEWEB-0011",
        toSatelliteId: "ONEWEB-0515",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:51:30.000Z",
        fromSatelliteId: "ONEWEB-0515",
        toSatelliteId: "ONEWEB-0321",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:01:00.000Z",
        fromSatelliteId: "ONEWEB-0321",
        toSatelliteId: "ONEWEB-0510",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:11:00.000Z",
        fromSatelliteId: "ONEWEB-0510",
        toSatelliteId: "ONEWEB-0385",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:20:30.000Z",
        fromSatelliteId: "ONEWEB-0385",
        toSatelliteId: "ONEWEB-0563",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:25:30.000Z",
        fromSatelliteId: "ONEWEB-0563",
        toSatelliteId: "ONEWEB-0536",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:28:00.000Z",
        fromSatelliteId: "ONEWEB-0536",
        toSatelliteId: "ONEWEB-0223",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:31:30.000Z",
        fromSatelliteId: "ONEWEB-0223",
        toSatelliteId: "ONEWEB-0349",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:40:00.000Z",
        fromSatelliteId: "ONEWEB-0349",
        toSatelliteId: "ONEWEB-0534",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:42:30.000Z",
        fromSatelliteId: "ONEWEB-0534",
        toSatelliteId: "ONEWEB-0386",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:45:00.000Z",
        fromSatelliteId: "ONEWEB-0386",
        toSatelliteId: "ONEWEB-0191",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T02:53:00.000Z",
        fromSatelliteId: "ONEWEB-0191",
        toSatelliteId: "ONEWEB-0189",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:02:00.000Z",
        fromSatelliteId: "ONEWEB-0189",
        toSatelliteId: "ONEWEB-0652",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:11:00.000Z",
        fromSatelliteId: "ONEWEB-0652",
        toSatelliteId: "ONEWEB-0640",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:18:00.000Z",
        fromSatelliteId: "ONEWEB-0640",
        toSatelliteId: "ONEWEB-0674",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:27:00.000Z",
        fromSatelliteId: "ONEWEB-0674",
        toSatelliteId: "ONEWEB-0182",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:29:30.000Z",
        fromSatelliteId: "ONEWEB-0182",
        toSatelliteId: "ONEWEB-0383",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:32:00.000Z",
        fromSatelliteId: "ONEWEB-0383",
        toSatelliteId: "ONEWEB-0199",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:34:00.000Z",
        fromSatelliteId: "ONEWEB-0199",
        toSatelliteId: "ONEWEB-0206",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:36:30.000Z",
        fromSatelliteId: "ONEWEB-0206",
        toSatelliteId: "ONEWEB-0648",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:38:30.000Z",
        fromSatelliteId: "ONEWEB-0648",
        toSatelliteId: "ONEWEB-0379",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:41:00.000Z",
        fromSatelliteId: "ONEWEB-0379",
        toSatelliteId: "ONEWEB-0183",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:43:00.000Z",
        fromSatelliteId: "ONEWEB-0183",
        toSatelliteId: "ONEWEB-0186",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:45:30.000Z",
        fromSatelliteId: "ONEWEB-0186",
        toSatelliteId: "ONEWEB-0374",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:47:30.000Z",
        fromSatelliteId: "ONEWEB-0374",
        toSatelliteId: "ONEWEB-0535",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:58:00.000Z",
        fromSatelliteId: "ONEWEB-0535",
        toSatelliteId: "ONEWEB-0525",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:07:00.000Z",
        fromSatelliteId: "ONEWEB-0525",
        toSatelliteId: "ONEWEB-0501",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:14:00.000Z",
        fromSatelliteId: "ONEWEB-0501",
        toSatelliteId: "ONEWEB-0644",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:18:30.000Z",
        fromSatelliteId: "ONEWEB-0644",
        toSatelliteId: "GSAT0226 (GALILEO 31)",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T05:18:00.000Z",
        fromSatelliteId: "GSAT0226 (GALILEO 31)",
        toSatelliteId: "ONEWEB-0522",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T05:29:00.000Z",
        fromSatelliteId: "ONEWEB-0522",
        toSatelliteId: "ONEWEB-0160",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:31:00.000Z",
        fromSatelliteId: "ONEWEB-0160",
        toSatelliteId: "ONEWEB-0333",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:33:00.000Z",
        fromSatelliteId: "ONEWEB-0333",
        toSatelliteId: "ONEWEB-0168",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:35:30.000Z",
        fromSatelliteId: "ONEWEB-0168",
        toSatelliteId: "ONEWEB-0101",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:38:00.000Z",
        fromSatelliteId: "ONEWEB-0101",
        toSatelliteId: "ONEWEB-0328",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:40:30.000Z",
        fromSatelliteId: "ONEWEB-0328",
        toSatelliteId: "ONEWEB-0166",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:43:00.000Z",
        fromSatelliteId: "ONEWEB-0166",
        toSatelliteId: "ONEWEB-0151",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:45:30.000Z",
        fromSatelliteId: "ONEWEB-0151",
        toSatelliteId: "ONEWEB-0172",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:48:00.000Z",
        fromSatelliteId: "ONEWEB-0172",
        toSatelliteId: "ONEWEB-0429",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:58:30.000Z",
        fromSatelliteId: "ONEWEB-0429",
        toSatelliteId: "ONEWEB-0418",
        reasonKind: "current-link-unavailable"
      }
    ],
    throughputMbps: {
      LEO: 177.349,
      MEO: 89.848,
      GEO: 44.009
    }
  },
  {
    stationAId: "ksat-svalsat-svalbard",
    stationBId: "ksat-trollsat-antarctica",
    totalCommunicatingMs: 0,
    handoverCount: 0,
    meanLinkDwellMs: 0,
    linkSelectionEventCount: 0,
    events: [],
    throughputMbps: {
      LEO: 177.349,
      MEO: 89.848,
      GEO: 44.009
    }
  },
  {
    stationAId: "intelsat-fuchsstadt",
    stationBId: "intelsat-atlanta",
    totalCommunicatingMs: 21600000,
    handoverCount: 2,
    meanLinkDwellMs: 7200000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0213 (GALILEO 17)",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:35:00.000Z",
        fromSatelliteId: "GSAT0213 (GALILEO 17)",
        toSatelliteId: "GSAT0227 (GALILEO 30)",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:20:00.000Z",
        fromSatelliteId: "GSAT0227 (GALILEO 30)",
        toSatelliteId: "GSAT0205 (GALILEO 9)",
        reasonKind: "current-link-unavailable"
      }
    ],
    throughputMbps: {
      MEO: 89.848,
      GEO: 44.009
    }
  },
  {
    stationAId: "singtel-bukit-timah",
    stationBId: "measat-cyberjaya",
    totalCommunicatingMs: 21600000,
    handoverCount: 21,
    meanLinkDwellMs: 981818,
    linkSelectionEventCount: 22,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        fromSatelliteId: null,
        toSatelliteId: "ASIASTAR",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:05:00.000Z",
        fromSatelliteId: "ASIASTAR",
        toSatelliteId: "ONEWEB-0114",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T01:18:30.000Z",
        fromSatelliteId: "ONEWEB-0114",
        toSatelliteId: "ONEWEB-0296",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:23:00.000Z",
        fromSatelliteId: "ONEWEB-0296",
        toSatelliteId: "ONEWEB-0310",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:25:30.000Z",
        fromSatelliteId: "ONEWEB-0310",
        toSatelliteId: "ONEWEB-0127",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T01:28:00.000Z",
        fromSatelliteId: "ONEWEB-0127",
        toSatelliteId: "ASIASTAR",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T02:11:00.000Z",
        fromSatelliteId: "ASIASTAR",
        toSatelliteId: "ONEWEB-0461",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T02:24:00.000Z",
        fromSatelliteId: "ONEWEB-0461",
        toSatelliteId: "ASIASTAR",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T03:07:30.000Z",
        fromSatelliteId: "ASIASTAR",
        toSatelliteId: "ONEWEB-0031",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T03:21:00.000Z",
        fromSatelliteId: "ONEWEB-0031",
        toSatelliteId: "ONEWEB-0715",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:23:00.000Z",
        fromSatelliteId: "ONEWEB-0715",
        toSatelliteId: "ONEWEB-0713",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T03:30:30.000Z",
        fromSatelliteId: "ONEWEB-0713",
        toSatelliteId: "ASIASTAR",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T04:07:30.000Z",
        fromSatelliteId: "ASIASTAR",
        toSatelliteId: "ONEWEB-0473",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T04:20:30.000Z",
        fromSatelliteId: "ONEWEB-0473",
        toSatelliteId: "ONEWEB-0449",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:25:30.000Z",
        fromSatelliteId: "ONEWEB-0449",
        toSatelliteId: "ONEWEB-0439",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:28:00.000Z",
        fromSatelliteId: "ONEWEB-0439",
        toSatelliteId: "ONEWEB-0425",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:30:30.000Z",
        fromSatelliteId: "ONEWEB-0425",
        toSatelliteId: "ONEWEB-0464",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T04:32:30.000Z",
        fromSatelliteId: "ONEWEB-0464",
        toSatelliteId: "ASIASTAR",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T04:57:00.000Z",
        fromSatelliteId: "ASIASTAR",
        toSatelliteId: "ONEWEB-0258",
        reasonKind: "cross-orbit-migration"
      },
      {
        handoverAtUtc: "2026-05-17T05:10:30.000Z",
        fromSatelliteId: "ONEWEB-0258",
        toSatelliteId: "ONEWEB-0264",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:16:00.000Z",
        fromSatelliteId: "ONEWEB-0264",
        toSatelliteId: "ONEWEB-0013",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:29:00.000Z",
        fromSatelliteId: "ONEWEB-0013",
        toSatelliteId: "ASIASTAR",
        reasonKind: "cross-orbit-migration"
      }
    ],
    throughputMbps: {
      LEO: 177.349,
      GEO: 44.009
    }
  },
  {
    stationAId: "cht-yangmingshan",
    stationBId: "sansa-hartebeesthoek",
    totalCommunicatingMs: 5940000,
    handoverCount: 1,
    meanLinkDwellMs: 1980000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:39:30.000Z",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0220 (GALILEO 24)",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:00:00.000Z",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0215 (GALILEO 19)",
        reasonKind: "current-link-unavailable"
      },
      {
        handoverAtUtc: "2026-05-17T05:46:30.000Z",
        fromSatelliteId: "GSAT0215 (GALILEO 19)",
        toSatelliteId: "GSAT0210 (GALILEO 13)",
        reasonKind: "current-link-unavailable"
      }
    ],
    throughputMbps: {
      LEO: 177.349,
      MEO: 89.848,
      GEO: 44.009
    }
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
