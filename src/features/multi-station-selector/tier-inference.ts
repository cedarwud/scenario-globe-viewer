import operatorFamilyAliases from "../../../public/fixtures/ground-stations/operator-family-aliases.json";
import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

export type PublicPairSourceTier = "public-disclosed" | "geometric-derived";

export interface PairSourceTierAttribution {
  readonly sourceTier: PublicPairSourceTier;
  readonly badgeLabel: string;
  readonly nonClaims: ReadonlyArray<string>;
}

export interface PublicRegistryStation {
  readonly id: string;
  readonly name: string;
  readonly operator: string;
  readonly operatorFamily: string;
  readonly country: string;
  readonly region: string;
  readonly lat: number;
  readonly lon: number;
  readonly elevationM: number;
  readonly terrainMaskDeg: number;
  readonly supportedOrbits: ReadonlyArray<string>;
  readonly supportedBands: ReadonlyArray<string>;
  readonly disclosurePrecision: string;
  readonly sourceUrl: string;
}

const PUBLIC_DISCLOSED_ATTRIBUTION: PairSourceTierAttribution = {
  sourceTier: "public-disclosed",
  badgeLabel: "Public-disclosure pair · operator-stated capability",
  nonClaims: [
    "Pair shown from public operator disclosure. Commercial routing not validated by this surface."
  ]
};

const GEOMETRIC_DERIVED_ATTRIBUTION: PairSourceTierAttribution = {
  sourceTier: "geometric-derived",
  badgeLabel: "Geometric pair · visibility-derived only",
  nonClaims: [
    "Pair derivable from public station coordinates and satellite ephemerides only. No operator or contractual attestation."
  ]
};

const REGISTRY_STATIONS = registry.stations as ReadonlyArray<PublicRegistryStation>;
const OPERATOR_FAMILY_ALIASES = (
  operatorFamilyAliases as { readonly aliases?: Readonly<Record<string, string>> }
).aliases ?? {};

function normalizeOperatorFamilyKey(operatorFamily: string): string {
  return operatorFamily.trim().toLowerCase();
}

export function canonicalizeOperatorFamily(operatorFamily: string): string {
  const normalized = normalizeOperatorFamilyKey(operatorFamily);
  return OPERATOR_FAMILY_ALIASES[normalized] ?? normalized;
}

export const PUBLIC_REGISTRY_BY_ID: ReadonlyMap<string, PublicRegistryStation> = new Map(
  REGISTRY_STATIONS.map((station) => [station.id, station])
);

export function inferPairSourceTier(
  stationA: PublicRegistryStation,
  stationB: PublicRegistryStation
): PairSourceTierAttribution {
  if (
    canonicalizeOperatorFamily(stationA.operatorFamily) ===
    canonicalizeOperatorFamily(stationB.operatorFamily)
  ) {
    return PUBLIC_DISCLOSED_ATTRIBUTION;
  }
  return GEOMETRIC_DERIVED_ATTRIBUTION;
}

export function inferPairSourceTierById(
  stationAId: string,
  stationBId: string
): PairSourceTierAttribution | null {
  const stationA = PUBLIC_REGISTRY_BY_ID.get(stationAId);
  const stationB = PUBLIC_REGISTRY_BY_ID.get(stationBId);
  if (!stationA || !stationB) {
    return null;
  }
  return inferPairSourceTier(stationA, stationB);
}
