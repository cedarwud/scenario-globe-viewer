import {
  createPhysicalInputSourceCatalog,
  resolvePhysicalInputSourceEntry,
  type PhysicalInputSourceCatalog,
  type PhysicalInputSourceEntry
} from "../features/physical-input/physical-input";
import {
  adaptFirstIntakeSeedToPhysicalInputSourceEntry,
  type FirstIntakePathProjectionSeed
} from "../features/physical-input/path-projection-adapter";
import {
  ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
} from "../features/physical-input/static-bounded-metric-profile";

export const FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE =
  "dedicated-non-bootstrap-source";
export const FIRST_INTAKE_PHYSICAL_INPUT_CONTEXT_LABEL =
  "First-intake bounded service-switching proxy";
export const FIRST_INTAKE_PHYSICAL_INPUT_SEED_PATH =
  "itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json";
export const FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK = "not-used";

export interface FirstIntakePhysicalInputSourceLineage {
  seedPath: typeof FIRST_INTAKE_PHYSICAL_INPUT_SEED_PATH;
  adapter: "adaptFirstIntakeSeedToPhysicalInputSourceEntry";
  boundedMetricProfile:
    "ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE";
  boundedMetricProfileId: string;
  bootstrapFallback: typeof FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK;
}

export interface FirstIntakePhysicalInputSourceCatalog {
  entries: ReadonlyArray<PhysicalInputSourceEntry>;
  adoptionMode: typeof FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE;
  sourceLineage: FirstIntakePhysicalInputSourceLineage;
}

function toPhysicalInputSourceCatalog(
  catalog: FirstIntakePhysicalInputSourceCatalog
): PhysicalInputSourceCatalog {
  return createPhysicalInputSourceCatalog(catalog.entries);
}

export function createFirstIntakePhysicalInputSourceCatalog(
  seeds: ReadonlyArray<FirstIntakePathProjectionSeed>
): FirstIntakePhysicalInputSourceCatalog {
  return {
    entries: seeds.map((seed) =>
      adaptFirstIntakeSeedToPhysicalInputSourceEntry(
        seed,
        ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
      )
    ),
    adoptionMode: FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE,
    sourceLineage: {
      seedPath: FIRST_INTAKE_PHYSICAL_INPUT_SEED_PATH,
      adapter: "adaptFirstIntakeSeedToPhysicalInputSourceEntry",
      boundedMetricProfile:
        "ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE",
      boundedMetricProfileId:
        ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE.profileId,
      bootstrapFallback: FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK
    }
  };
}

export function resolveFirstIntakePhysicalInputSourceEntry(
  catalog: FirstIntakePhysicalInputSourceCatalog,
  scenarioId: string
): PhysicalInputSourceEntry {
  return resolvePhysicalInputSourceEntry(
    toPhysicalInputSourceCatalog(catalog),
    scenarioId
  );
}
