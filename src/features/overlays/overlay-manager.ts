import type { SatelliteOverlayAdapter } from "../satellites";

export type OverlayId = string;

export interface OverlayManagerEntryState {
  overlayId: OverlayId;
  adapterAttached: boolean;
  visible: boolean;
}

export interface OverlayManagerState {
  entries: ReadonlyArray<OverlayManagerEntryState>;
}

// App-facing overlay state stays plain-data and serializable. The manager owns
// adapter attach/detach, top-level visibility, and final disposal; adapters do
// not widen this boundary with fixture-specific details.
export interface OverlayManager {
  getState(): OverlayManagerState;
  attach(
    overlayId: OverlayId,
    adapter: SatelliteOverlayAdapter
  ): Promise<void>;
  detach(overlayId: OverlayId): Promise<void>;
  setVisible(overlayId: OverlayId, visible: boolean): Promise<void>;
  toggle(overlayId: OverlayId): Promise<boolean>;
  dispose(): Promise<void>;
}
