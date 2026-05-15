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
  if (root.querySelector("[data-m8a-v411-footer-chip-row='true']")) {
    return;
  }

  const row = document.createElement("div");
  row.className = "m8a-v411-footer-chip__row";
  row.dataset.m8aV411FooterChipRow = "true";
  row.dataset.m8aV411FooterChipSystem = M8A_V411_FOOTER_CHIP_SYSTEM_VERSION;
  row.dataset.m8aV411FooterChipRowHeightPx = String(
    M8A_V411_FOOTER_CHIP_ROW_HEIGHT_PX
  );
  row.dataset.m8aV411FooterChipGapPx = String(
    M8A_V411_FOOTER_CHIP_GAP_FROM_SEQUENCE_RAIL_PX
  );
  row.dataset.m8aV411FooterChipBottomOffsetPx = String(
    M8A_V411_FOOTER_CHIP_ROW_BOTTOM_OFFSET_PX
  );
  row.dataset.m8aV411SequenceRailHeightPx = String(
    M8A_V411_SEQUENCE_RAIL_HEIGHT_PX
  );
  row.dataset.m8aV411SequenceRailBottomOffsetPx = String(
    M8A_V411_SEQUENCE_RAIL_BOTTOM_OFFSET_PX
  );
  row.dataset.m8aV411BottomLayoutMaxHeightPx = String(
    M8A_V411_BOTTOM_LAYOUT_MAX_HEIGHT_PX
  );
  row.setAttribute("aria-hidden", "true");
  row.setAttribute("data-m8a-v48-info-class", "fixed");

  // data-m8a-v48-info-class keeps interactive chips in the V4.8 control bucket.
  row.innerHTML = [
    `<span class="m8a-v411-footer-chip m8a-v411-footer-chip--ambient"`,
    ` data-m8a-v411-footer-chip="simulation-display"`,
    ` data-m8a-v411-footer-chip-ambient-font-size-px="${M8A_V411_FOOTER_CHIP_AMBIENT_FONT_SIZE_PX}"`,
    ` data-m8a-v47-action="toggle-boundary"`,
    ` data-m8a-v410-boundary-affordance-trigger="true"`,
    ` data-m8a-v411-footer-chip-boundary-trigger="true"`,
    ` data-m8a-v48-info-class="control"`,
    ` role="button" tabindex="0"`,
    ` aria-expanded="false"`,
    ` aria-controls="m8a-v48-inspector-sheet"`,
    ` aria-label="Open focused truth boundary surface">`,
    M8A_V411_FOOTER_CHIP_SIMULATION_DISPLAY,
    `</span>`,

    `<span class="m8a-v411-footer-chip m8a-v411-footer-chip--ambient"`,
    ` data-m8a-v411-footer-chip="precision"`,
    ` data-m8a-v411-footer-chip-ambient-font-size-px="${M8A_V411_FOOTER_CHIP_AMBIENT_FONT_SIZE_PX}"`,
    ` data-m8a-v48-info-class="fixed">`,
    M8A_V411_FOOTER_CHIP_PRECISION_TEXT,
    `</span>`,

    `<span class="m8a-v411-footer-chip m8a-v411-footer-chip--ambient"`,
    ` data-m8a-v411-footer-chip="tle-source"`,
    ` data-m8a-v411-footer-chip-ambient-font-size-px="${M8A_V411_FOOTER_CHIP_AMBIENT_FONT_SIZE_PX}"`,
    ` data-m8a-v411-footer-chip-tle-source="${M8A_V411_FOOTER_CHIP_TLE_SOURCE}"`,
    ` data-m8a-v411-footer-chip-tle-date="${M8A_V411_FOOTER_CHIP_TLE_DATE}"`,
    ` data-m8a-v48-info-class="fixed">`,
    M8A_V411_FOOTER_CHIP_TLE_TEXT,
    `</span>`,

    `<span class="m8a-v411-footer-chip m8a-v411-footer-chip--ambient"`,
    ` data-m8a-v411-footer-chip="actor-count"`,
    ` data-m8a-v411-footer-chip-ambient-font-size-px="${M8A_V411_FOOTER_CHIP_AMBIENT_FONT_SIZE_PX}"`,
    ` data-m8a-v48-info-class="fixed">`,
    `13 actors</span>`,

    `<span class="m8a-v411-footer-chip m8a-v411-footer-chip--w5-warning"`,
    ` data-m8a-v411-footer-chip="w5-warning"`,
    ` data-m8a-v411-footer-chip-w5-warning="true"`,
    ` data-m8a-v411-footer-chip-w5-warning-font-size-px="${M8A_V411_FOOTER_CHIP_W5_WARNING_FONT_SIZE_PX}"`,
    ` data-m8a-v411-footer-chip-w5-warning-color="${M8A_V411_FOOTER_CHIP_W5_WARNING_COLOR}"`,
    ` data-m8a-v47-action="toggle-boundary"`,
    ` data-m8a-v48-info-class="control"`,
    ` role="button" tabindex="0"`,
    ` aria-expanded="false"`,
    ` aria-controls="m8a-v48-inspector-sheet"`,
    ` aria-label="W5 warning: not actual failover evidence"`,
    ` hidden>`,
    M8A_V411_FOOTER_CHIP_W5_WARNING_TEXT,
    `</span>`,

    `<button type="button" class="m8a-v411-footer-chip m8a-v411-footer-chip--explicit-disclosure"`,
    ` data-m8a-v411-footer-chip="explicit-disclosure"`,
    ` data-m8a-v47-action="toggle-boundary"`,
    ` data-m8a-v410-boundary-affordance-trigger="true"`,
    ` data-m8a-v48-info-class="control"`,
    ` aria-expanded="false"`,
    ` aria-controls="m8a-v48-inspector-sheet"`,
    ` aria-label="Open truth boundary and sources">`,
    `Boundary & Sources`,
    `</button>`
  ].join("");

  root.appendChild(row);
}

export function syncM8aV411FooterChipRow(
  root: HTMLElement,
  opts: M8aV411FooterChipSyncOptions
): void {
  const row = root.querySelector<HTMLElement>(
    "[data-m8a-v411-footer-chip-row='true']"
  );

  if (!row) {
    return;
  }

  const actorChip = row.querySelector<HTMLElement>(
    "[data-m8a-v411-footer-chip='actor-count']"
  );

  if (actorChip) {
    actorChip.textContent = `${opts.actorCount} actors`;
    actorChip.dataset.m8aV411FooterChipActorCount = String(opts.actorCount);
  }

  const w5Warning = row.querySelector<HTMLElement>(
    "[data-m8a-v411-footer-chip-w5-warning='true']"
  );

  if (w5Warning) {
    const isW5 = opts.activeWindowId === "geo-continuity-guard";

    w5Warning.hidden = !isW5;
    w5Warning.setAttribute("aria-hidden", isW5 ? "false" : "true");
    w5Warning.dataset.m8aV411FooterChipW5Active = String(isW5);
  }

  for (const chip of row.querySelectorAll<HTMLElement>(
    "[data-m8a-v47-action='toggle-boundary']"
  )) {
    chip.setAttribute(
      "aria-expanded",
      opts.boundaryDisclosureOpen ? "true" : "false"
    );
  }

  row.dataset.m8aV411FooterChipActiveWindowId = opts.activeWindowId;
  row.dataset.m8aV411FooterChipBoundaryOpen = String(opts.boundaryDisclosureOpen);
}
