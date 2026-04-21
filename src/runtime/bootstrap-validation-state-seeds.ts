import type {
  ValidationAttachState,
  ValidationDutKind,
  ValidationEnvironmentMode,
  ValidationProvenance,
  ValidationTransportKind
} from "../features/validation-state";

interface BootstrapValidationWindowSeed {
  startRatio: number;
  stopRatio: number;
  attachState: ValidationAttachState;
}

export interface BootstrapValidationModeSeed {
  environmentMode: ValidationEnvironmentMode;
  transportKind: ValidationTransportKind;
  dutKind: ValidationDutKind;
  windows: ReadonlyArray<BootstrapValidationWindowSeed>;
}

export const BOOTSTRAP_VALIDATION_PROVENANCE: ValidationProvenance = {
  kind: "bounded-proxy",
  label: "validation bounded proxy",
  detail:
    "Scenario-bounded validation state materialized from repo-owned environment-mode, transport-kind, DUT-kind, and attach-state definitions; NAT/tunnel/bridge implementation remains external."
};

export const BOOTSTRAP_VALIDATION_MODE_SEEDS: Record<
  string,
  BootstrapValidationModeSeed
> = {
  "bootstrap-global-real-time": {
    environmentMode: "linux-direct",
    transportKind: "direct",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.18, attachState: "detached" },
      { startRatio: 0.18, stopRatio: 0.82, attachState: "attached" },
      { startRatio: 0.82, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-global-prerecorded": {
    environmentMode: "linux-direct",
    transportKind: "direct",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.12, attachState: "detached" },
      { startRatio: 0.12, stopRatio: 0.88, attachState: "attached" },
      { startRatio: 0.88, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-regional-real-time": {
    environmentMode: "windows-wsl-tunnel",
    transportKind: "tunnel",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.14, attachState: "detached" },
      { startRatio: 0.14, stopRatio: 0.76, attachState: "attached" },
      { startRatio: 0.76, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-regional-prerecorded": {
    environmentMode: "windows-wsl-tunnel",
    transportKind: "tunnel",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.1, attachState: "detached" },
      { startRatio: 0.1, stopRatio: 0.72, attachState: "attached" },
      { startRatio: 0.72, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-site-real-time": {
    environmentMode: "inet-nat-bridge",
    transportKind: "nat-bridge",
    dutKind: "physical",
    windows: [
      { startRatio: 0, stopRatio: 0.22, attachState: "detached" },
      { startRatio: 0.22, stopRatio: 0.87, attachState: "bridged" },
      { startRatio: 0.87, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-site-prerecorded": {
    environmentMode: "inet-nat-bridge",
    transportKind: "nat-bridge",
    dutKind: "physical",
    windows: [
      { startRatio: 0, stopRatio: 0.18, attachState: "detached" },
      { startRatio: 0.18, stopRatio: 0.82, attachState: "bridged" },
      { startRatio: 0.82, stopRatio: 1, attachState: "detached" }
    ]
  }
};
