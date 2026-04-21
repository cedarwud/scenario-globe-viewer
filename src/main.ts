import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import {
  syncDocumentTelemetry,
  truncateDocumentTelemetryDetail
} from "./features/telemetry/document-telemetry";
import { startBootstrapComposition } from "./runtime/bootstrap/composition";
import "./styles.css";

type BootstrapState = "booting" | "ready" | "error";

function setBootstrapState(state: BootstrapState, detail?: string): void {
  syncDocumentTelemetry({
    bootstrapState: state,
    bootstrapDetail: truncateDocumentTelemetryDetail(detail)
  });
}

function serializeBootstrapError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown bootstrap error";
  }
}

setBootstrapState("booting");

window.addEventListener("error", (event) => {
  setBootstrapState("error", serializeBootstrapError(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  setBootstrapState("error", serializeBootstrapError(event.reason));
});

initializeCesiumBootstrap();

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

const composition = startBootstrapComposition(app);

setBootstrapState("ready");

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    composition.dispose();
  });
}
