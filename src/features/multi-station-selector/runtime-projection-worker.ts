import {
  computeRuntimeProjection,
  type RuntimeProjectionInput,
  type RuntimeProjectionResult
} from "./runtime-projection";

interface RuntimeProjectionWorkerRequest {
  readonly id: number;
  readonly input: RuntimeProjectionInput;
}

type RuntimeProjectionWorkerResponse =
  | {
      readonly id: number;
      readonly ok: true;
      readonly result: RuntimeProjectionResult;
    }
  | {
      readonly id: number;
      readonly ok: false;
      readonly message: string;
    };

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown failure while computing runtime projection.";
}

self.addEventListener("message", (event: MessageEvent<RuntimeProjectionWorkerRequest>) => {
  const { id, input } = event.data;
  try {
    const result = computeRuntimeProjection(input);
    self.postMessage({
      id,
      ok: true,
      result
    } satisfies RuntimeProjectionWorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      message: toErrorMessage(error)
    } satisfies RuntimeProjectionWorkerResponse);
  }
});
