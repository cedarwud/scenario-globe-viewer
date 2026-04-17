import type {
  OverlayId,
  OverlayManager,
  OverlayManagerState
} from "../features/overlays/overlay-manager";
import type { SatelliteOverlayAdapter } from "../features/satellites";

interface RuntimeOverlayEntry {
  adapter: SatelliteOverlayAdapter;
  visible: boolean;
}

function serializeState(
  entries: ReadonlyMap<OverlayId, RuntimeOverlayEntry>
): OverlayManagerState {
  return {
    entries: Array.from(entries.entries(), ([overlayId, entry]) => ({
      overlayId,
      adapterAttached: true,
      visible: entry.visible
    }))
  };
}

export function createRuntimeOverlayManager(): OverlayManager {
  const entries = new Map<OverlayId, RuntimeOverlayEntry>();

  async function detachOverlay(overlayId: OverlayId): Promise<void> {
    const entry = entries.get(overlayId);
    if (!entry) {
      return;
    }

    entries.delete(overlayId);
    await entry.adapter.dispose();
  }

  async function setEntryVisible(
    overlayId: OverlayId,
    visible: boolean
  ): Promise<void> {
    const entry = entries.get(overlayId);
    if (!entry) {
      throw new Error(`Overlay is not attached: ${overlayId}`);
    }

    if (entry.visible === visible) {
      return;
    }

    entry.visible = visible;
    entry.adapter.setVisible(visible);
  }

  return {
    getState(): OverlayManagerState {
      return serializeState(entries);
    },

    async attach(
      overlayId: OverlayId,
      adapter: SatelliteOverlayAdapter
    ): Promise<void> {
      if (entries.has(overlayId)) {
        throw new Error(`Overlay is already attached: ${overlayId}`);
      }

      entries.set(overlayId, {
        adapter,
        visible: true
      });
      adapter.setVisible(true);
    },

    async detach(overlayId: OverlayId): Promise<void> {
      await detachOverlay(overlayId);
    },

    async setVisible(overlayId: OverlayId, visible: boolean): Promise<void> {
      await setEntryVisible(overlayId, visible);
    },

    async toggle(overlayId: OverlayId): Promise<boolean> {
      const entry = entries.get(overlayId);
      if (!entry) {
        throw new Error(`Overlay is not attached: ${overlayId}`);
      }

      const nextVisible = !entry.visible;
      await setEntryVisible(overlayId, nextVisible);
      return nextVisible;
    },

    async dispose(): Promise<void> {
      const attachedOverlayIds = Array.from(entries.keys());
      for (const overlayId of attachedOverlayIds) {
        await detachOverlay(overlayId);
      }
    }
  };
}
