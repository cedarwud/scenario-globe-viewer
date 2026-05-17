import type { M8aV46dSimulationHandoverWindowId } from "./m8a-v4-ground-station-projection";

export const M8A_V411_FOOTER_CHIP_SYSTEM_VERSION =
  "m8a-v411-footer-chip-system-conv3-runtime.v1";
export const M8A_V411_FOOTER_CHIP_ROW_HEIGHT_PX = 24;
export const M8A_V411_FOOTER_CHIP_GAP_FROM_SEQUENCE_RAIL_PX = 8;
export const M8A_V411_FOOTER_CHIP_ROW_BOTTOM_OFFSET_PX = 24;
export const M8A_V411_SEQUENCE_RAIL_HEIGHT_PX = 56;
export const M8A_V411_SEQUENCE_RAIL_BOTTOM_OFFSET_PX = 56;
export const M8A_V411_BOTTOM_LAYOUT_MAX_HEIGHT_PX = 100;
export const M8A_V411_FOOTER_CHIP_AMBIENT_FONT_SIZE_PX = 12;
export const M8A_V411_FOOTER_CHIP_W5_WARNING_FONT_SIZE_PX = 14;
export const M8A_V411_FOOTER_CHIP_W5_WARNING_COLOR = "#ff6b3d";

export const M8A_V411_FOOTER_CHIP_SIMULATION_DISPLAY = "Simulation view";
export const M8A_V411_FOOTER_CHIP_PRECISION_TEXT = "operator-family precision";
export const M8A_V411_FOOTER_CHIP_TLE_SOURCE = "CelesTrak NORAD GP";
export const M8A_V411_FOOTER_CHIP_TLE_DATE = "2026-04-26";
export const M8A_V411_FOOTER_CHIP_TLE_TEXT = `TLE: ${M8A_V411_FOOTER_CHIP_TLE_SOURCE} · ${M8A_V411_FOOTER_CHIP_TLE_DATE}`;
export const M8A_V411_FOOTER_CHIP_W5_WARNING_TEXT = "⚠ Not actual failover evidence";

export interface M8aV411FooterChipSyncOptions {
  activeWindowId: M8aV46dSimulationHandoverWindowId;
  actorCount: number;
  boundaryDisclosureOpen: boolean;
}

export function ensureM8aV411FooterChipRow(root: HTMLElement): void {
  root.querySelector("[data-m8a-v411-footer-chip-row='true']")?.remove();
}

export function syncM8aV411FooterChipRow(
  root: HTMLElement,
  opts: M8aV411FooterChipSyncOptions
): void {
  void opts;
  root.querySelector("[data-m8a-v411-footer-chip-row='true']")?.remove();
}
