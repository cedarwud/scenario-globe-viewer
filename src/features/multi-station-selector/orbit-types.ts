export type OrbitClass = "LEO" | "MEO" | "GEO";

export interface TleRecord {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly format?: "tle-3le";
  readonly tleLine1: string;
  readonly tleLine2: string;
  readonly epochUtc?: string | null;
  readonly noradCatalogId?: number | null;
  readonly classification?: string | null;
  readonly cosparDesignator?: string | null;
  readonly meanMotionFirstDerivative?: number | null;
  readonly meanMotionFirstDerivativeRaw?: string | null;
  readonly meanMotionSecondDerivative?: number | null;
  readonly meanMotionSecondDerivativeRaw?: string | null;
  readonly bstarDragTerm?: number | null;
  readonly bstarDragTermRaw?: string | null;
}

export type OmmPropagationFields = Readonly<Record<string, string | number | null>>;

export interface OmmRuntimeOrbitRecord {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly format: "omm-json" | "omm-csv";
  readonly ommFields: OmmPropagationFields;
  readonly epochUtc: string | null;
  readonly noradCatalogId?: number | null;
  readonly classification?: string | null;
  readonly cosparDesignator?: string | null;
  readonly meanMotionFirstDerivative?: number | null;
  readonly meanMotionFirstDerivativeRaw?: string | null;
  readonly meanMotionSecondDerivative?: number | null;
  readonly meanMotionSecondDerivativeRaw?: string | null;
  readonly bstarDragTerm?: number | null;
  readonly bstarDragTermRaw?: string | null;
}

export type RuntimeOrbitRecord = TleRecord | OmmRuntimeOrbitRecord;

export interface TlePropagationStats {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly sampleCadenceSeconds: number;
  readonly attemptedSampleCount: number;
  readonly propagatedSampleCount: number;
  readonly failedSampleCount: number;
  readonly sgp4ErrorCode: number | null;
  readonly firstPropagatedUtc: string | null;
  readonly lastPropagatedUtc: string | null;
}

export interface TleRecordMetadata {
  readonly noradCatalogId: number | null;
  readonly classification: string | null;
  readonly cosparDesignator: string | null;
  readonly meanMotionFirstDerivative: number | null;
  readonly meanMotionFirstDerivativeRaw: string | null;
  readonly meanMotionSecondDerivative: number | null;
  readonly meanMotionSecondDerivativeRaw: string | null;
  readonly bstarDragTerm: number | null;
  readonly bstarDragTermRaw: string | null;
}
