import operatorFamilyAliases from "../../../public/fixtures/ground-stations/operator-family-aliases.json";
import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

export type PublicPairSourceTier = "public-disclosed" | "geometric-derived";
export type PairSourceEvidenceKind =
  | "explicit-pair-attestation"
  | "same-operator-family-inferred"
  | "cross-family-geometric";

export interface PairSourceTierAttribution {
  readonly sourceTier: PublicPairSourceTier;
  readonly evidenceKind: PairSourceEvidenceKind;
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

export interface PublicPairAttestation {
  readonly stationAId: string;
  readonly stationBId: string;
  readonly sourceUrl?: string;
  readonly note?: string;
}

type PublicPairAttestationCandidate =
  | Partial<PublicPairAttestation>
  | null
  | undefined;

const PUBLIC_DISCLOSED_ATTRIBUTION: PairSourceTierAttribution = {
  sourceTier: "public-disclosed",
  evidenceKind: "explicit-pair-attestation",
  badgeLabel: "Public-disclosure pair · operator-stated capability",
  nonClaims: [
    "Pair-level public attestation exists for this station pair. Commercial routing, SLA, and contractual path are not validated by this surface."
  ]
};

const SAME_OPERATOR_FAMILY_INFERRED_ATTRIBUTION: PairSourceTierAttribution = {
  sourceTier: "geometric-derived",
  evidenceKind: "same-operator-family-inferred",
  badgeLabel: "Same operator family inferred · no pair attestation",
  nonClaims: [
    "Same operator family is an inference from public registry metadata, not pair-level routing, SLA, contractual path, or operator attestation.",
    "Pair visibility is derived from public station coordinates and satellite ephemerides only."
  ]
};

const GEOMETRIC_DERIVED_ATTRIBUTION: PairSourceTierAttribution = {
  sourceTier: "geometric-derived",
  evidenceKind: "cross-family-geometric",
  badgeLabel: "Geometric pair · visibility-derived only",
  nonClaims: [
    "Pair derivable from public station coordinates and satellite ephemerides only. No operator or contractual attestation."
  ]
};

const REGISTRY_STATIONS = registry.stations as ReadonlyArray<PublicRegistryStation>;
const REGISTRY_PAIR_ATTESTATIONS = (
  registry as { readonly pairAttestations?: ReadonlyArray<PublicPairAttestation> }
).pairAttestations ?? [];
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

function pairKey(stationAId: string, stationBId: string): string {
  return [stationAId, stationBId].sort().join("|");
}

function hasStationId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExplicitPairAttestation(
  stationAId: string,
  stationBId: string,
  attestations: ReadonlyArray<PublicPairAttestationCandidate> =
    REGISTRY_PAIR_ATTESTATIONS
): boolean {
  const expectedKey = pairKey(stationAId, stationBId);
  return attestations.some((attestation) => {
    if (
      !hasStationId(attestation?.stationAId) ||
      !hasStationId(attestation?.stationBId)
    ) {
      return false;
    }
    return pairKey(attestation.stationAId, attestation.stationBId) === expectedKey;
  });
}

export function inferPairSourceTier(
  stationA: PublicRegistryStation,
  stationB: PublicRegistryStation,
  attestations: ReadonlyArray<PublicPairAttestationCandidate> =
    REGISTRY_PAIR_ATTESTATIONS
): PairSourceTierAttribution {
  if (hasExplicitPairAttestation(stationA.id, stationB.id, attestations)) {
    return PUBLIC_DISCLOSED_ATTRIBUTION;
  }
  if (
    canonicalizeOperatorFamily(stationA.operatorFamily) ===
    canonicalizeOperatorFamily(stationB.operatorFamily)
  ) {
    return SAME_OPERATOR_FAMILY_INFERRED_ATTRIBUTION;
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
