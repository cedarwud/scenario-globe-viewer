import type { ReplayClock } from "../time";

export type OverlayId = string;

export interface OverlayManagerEntryState {
  overlayId: OverlayId;
  adapterAttached: boolean;
  visible: boolean;
}

export interface OverlayManagerState {
  entries: ReadonlyArray<OverlayManagerEntryState>;
}

// Phase 3.6 stops at the manager-owned lifecycle boundary. Future overlay
// adapters may bind to the replay clock here, but fixture ingestion, Cesium
// classes, and overlay-specific runtime details stay outside this contract.
export interface OverlayManagerAdapterHandle {
  attachToClock?(clock: ReplayClock): void;
  setVisible(visible: boolean): void;
  dispose(): Promise<void>;
}

// App-facing overlay state stays plain-data and serializable. The manager owns
// adapter attach/detach, top-level visibility, and final disposal; adapters do
// not widen this boundary with fixture-specific details.
export interface OverlayManager {
  getState(): OverlayManagerState;
  attach(overlayId: OverlayId, adapter: OverlayManagerAdapterHandle): Promise<void>;
  detach(overlayId: OverlayId): Promise<void>;
  setVisible(overlayId: OverlayId, visible: boolean): Promise<void>;
  toggle(overlayId: OverlayId): Promise<boolean>;
  dispose(): Promise<void>;
}
