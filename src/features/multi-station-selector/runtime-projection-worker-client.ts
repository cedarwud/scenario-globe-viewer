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

interface PendingRequest {
  readonly input: RuntimeProjectionInput;
  readonly resolve: (result: RuntimeProjectionResult) => void;
  readonly reject: (error: Error) => void;
}

export interface RuntimeProjectionWorkerClient {
  compute(input: RuntimeProjectionInput): Promise<RuntimeProjectionResult>;
  dispose(): void;
}

function canCreateWorker(): boolean {
  return typeof Worker !== "undefined";
}

export function createRuntimeProjectionWorkerClient(): RuntimeProjectionWorkerClient {
  let worker: Worker | null = null;
  let workerUnavailable = !canCreateWorker();
  let disposed = false;
  let nextRequestId = 1;
  const pending = new Map<number, PendingRequest>();

  function rejectPending(error: Error): void {
    for (const request of pending.values()) {
      request.reject(error);
    }
    pending.clear();
  }

  function fallbackPending(): void {
    for (const request of pending.values()) {
      try {
        request.resolve(computeRuntimeProjection(request.input));
      } catch (error) {
        request.reject(
          error instanceof Error
            ? error
            : new Error("Unknown failure while computing runtime projection.")
        );
      }
    }
    pending.clear();
  }

  function disposeWorker(): void {
    if (!worker) {
      return;
    }
    worker.terminate();
    worker = null;
  }

  function getWorker(): Worker | null {
    if (workerUnavailable || worker) {
      return worker;
    }
    try {
      worker = new Worker(new URL("./runtime-projection-worker.ts", import.meta.url), {
        type: "module"
      });
    } catch {
      workerUnavailable = true;
      return null;
    }

    worker.addEventListener(
      "message",
      (event: MessageEvent<RuntimeProjectionWorkerResponse>) => {
        const response = event.data;
        const request = pending.get(response.id);
        if (!request) {
          return;
        }
        pending.delete(response.id);
        if (response.ok) {
          request.resolve(response.result);
        } else {
          request.reject(new Error(response.message));
        }
      }
    );
    const handleWorkerFailure = (): void => {
      workerUnavailable = true;
      disposeWorker();
      fallbackPending();
    };
    worker.addEventListener("error", handleWorkerFailure);
    worker.addEventListener("messageerror", handleWorkerFailure);
    return worker;
  }

  return {
    compute(input: RuntimeProjectionInput): Promise<RuntimeProjectionResult> {
      if (disposed) {
        return Promise.reject(new Error("Runtime projection worker client disposed."));
      }
      const activeWorker = getWorker();
      if (!activeWorker) {
        return Promise.resolve().then(() => computeRuntimeProjection(input));
      }

      const id = nextRequestId++;
      return new Promise<RuntimeProjectionResult>((resolve, reject) => {
        pending.set(id, { input, resolve, reject });
        try {
          activeWorker.postMessage({
            id,
            input
          } satisfies RuntimeProjectionWorkerRequest);
        } catch (error) {
          pending.delete(id);
          workerUnavailable = true;
          disposeWorker();
          resolve(computeRuntimeProjection(input));
        }
      });
    },

    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      disposeWorker();
      rejectPending(new Error("Runtime projection worker client disposed."));
    }
  };
}
