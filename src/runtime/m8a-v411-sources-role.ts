import type {
  M8aV4EndpointId,
  M8aV4EndpointProjection,
  M8aV4OrbitActorProjection,
  M8aV4OrbitClass
} from "./m8a-v4-ground-station-projection";

export const M8A_V411_SOURCES_ROLE_VERSION =
  "m8a-v4.11-sources-role-slice5-runtime.v1";
export const M8A_V411_R2_READ_ONLY_LABEL =
  "R2 read-only - not promotable to runtime";

export type M8aV411SourcesTrigger =
  | "advanced-source-provenance"
  | "corner-provenance"
  | "ground-precision"
  | "ground-orbit-evidence"
  | "hover-sources";

export interface M8aV411SourcesFilter {
  trigger: M8aV411SourcesTrigger;
  endpointId: M8aV4EndpointId | "";
  orbitClass: M8aV4OrbitClass | "";
}

export interface M8aV411R2ReadOnlyCandidate {
  candidateId: string;
  stationName: string;
  countryOrRegion: string;
  blockedReason: string;
  catalogStatus: "blocked";
  readOnlyBoundary: typeof M8A_V411_R2_READ_ONLY_LABEL;
}

export const M8A_V411_R2_READ_ONLY_CANDIDATES = [
  {
    candidateId: "tw-cht-yangmingshan-taipei-fangshan-earth-station-family",
    stationName: "Taiwan site-level CHT earth-station family",
    countryOrRegion: "Taiwan",
    blockedReason:
      "blocked: site-family upgrade lacks accepted LEO/MEO site mapping",
    catalogStatus: "blocked",
    readOnlyBoundary: M8A_V411_R2_READ_ONLY_LABEL
  },
  {
    candidateId: "th-nt-sirindhorn-oneweb-snp-gateway",
    stationName: "Thailand NT Sirindhorn OneWeb SNP Gateway",
    countryOrRegion: "Thailand",
    blockedReason: "blocked: MEO evidence gap",
    catalogStatus: "blocked",
    readOnlyBoundary: M8A_V411_R2_READ_ONLY_LABEL
  },
  {
    candidateId: "sg-singtel-bukit-timah-satellite-earth-station",
    stationName: "Singapore Singtel Bukit Timah Satellite Earth Station",
    countryOrRegion: "Singapore",
    blockedReason: "blocked: MEO evidence gap and site-family split",
    catalogStatus: "blocked",
    readOnlyBoundary: M8A_V411_R2_READ_ONLY_LABEL
  },
  {
    candidateId: "jp-kddi-yamaguchi-softbank-oneweb-country-family",
    stationName: "Japan KDDI Yamaguchi / SoftBank OneWeb country family",
    countryOrRegion: "Japan",
    blockedReason: "blocked: MEO gap and split operator-family evidence",
    catalogStatus: "blocked",
    readOnlyBoundary: M8A_V411_R2_READ_ONLY_LABEL
  },
  {
    candidateId: "kr-kt-sat-kumsan-oneweb-terminal-ecosystem",
    stationName: "Korea KT SAT Kumsan / OneWeb terminal ecosystem",
    countryOrRegion: "South Korea",
    blockedReason: "blocked: MEO remains partial/planned evidence",
    catalogStatus: "blocked",
    readOnlyBoundary: M8A_V411_R2_READ_ONLY_LABEL
  }
] as const satisfies readonly M8aV411R2ReadOnlyCandidate[];

const M8A_V411_SOURCE_LEVEL_BY_REF: Readonly<Record<string, string>> = {
  "cht-multi-orbit-capability": "operator press release",
  "cht-ses-o3b-mpower-ground-station": "operator press release",
  "cht-eutelsat-oneweb-partnership": "operator press release",
  "speedcast-singapore-teleport-wta-tier4": "third-party certification",
  "speedcast-ngso-leo-meo-service": "operator source",
  "speedcast-teleport-network": "operator source"
};

export function resolveM8aV411OrbitToken(
  orbitClass: M8aV4OrbitClass
): "LEO" | "MEO" | "GEO" {
  switch (orbitClass) {
    case "leo":
      return "LEO";
    case "meo":
      return "MEO";
    case "geo":
      return "GEO";
  }
}

export function resolveM8aV411SourceLevel(sourceRefId: string): string {
  return M8A_V411_SOURCE_LEVEL_BY_REF[sourceRefId] ?? "operator source";
}

export function resolveM8aV411ActorOperatorFamily(
  actor: M8aV4OrbitActorProjection
): string {
  return actor.operatorContext;
}

export function resolveM8aV411EndpointLabel(
  endpoint: M8aV4EndpointProjection
): string {
  return endpoint.endpointLabel;
}

export function createM8aV411DefaultSourcesFilter(
  trigger: M8aV411SourcesTrigger
): M8aV411SourcesFilter {
  return {
    trigger,
    endpointId: "",
    orbitClass: ""
  };
}
