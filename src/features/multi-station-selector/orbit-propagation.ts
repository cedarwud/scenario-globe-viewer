import {
  json2satrec,
  twoline2satrec
} from "../../vendor/satellite-js-runtime";
import type { RuntimeOrbitRecord } from "./visibility-utils";

type RuntimeSatrec = ReturnType<typeof twoline2satrec>;

export interface RuntimeSatrecResult {
  readonly satrec: RuntimeSatrec | null;
  readonly errorCode: number | null;
}

function isOmmRuntimeRecord(
  record: RuntimeOrbitRecord
): record is Extract<RuntimeOrbitRecord, { readonly ommFields: unknown }> {
  return "ommFields" in record;
}

export function createRuntimeSatrec(
  record: RuntimeOrbitRecord
): RuntimeSatrecResult {
  let satrec: RuntimeSatrec | null;
  try {
    satrec = isOmmRuntimeRecord(record)
      ? json2satrec(record.ommFields as Parameters<typeof json2satrec>[0])
      : twoline2satrec(record.tleLine1, record.tleLine2);
  } catch {
    return { satrec: null, errorCode: -1 };
  }

  if (!satrec) {
    return { satrec: null, errorCode: -1 };
  }
  if (satrec.error) {
    return { satrec: null, errorCode: satrec.error };
  }
  return { satrec, errorCode: null };
}
