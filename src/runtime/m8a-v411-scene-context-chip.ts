export const M8A_V411_SCENE_CONTEXT_CHIP_VERSION =
  "m8a-v4.11-scene-context-chip-conv1-runtime.v1";

export const M8A_V411_SCENE_CONTEXT_CHIP_COPY =
  "Scale evidence (≥500 LEO) lives in Phase 7.1; this route remains a 13-actor bounded demo";

export const M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX = 600;
export const M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX = 28;
export const M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX = 14;

export function ensureM8aV411SceneContextChip(root: HTMLElement): void {
  if (!root.querySelector("[data-m8a-v411-scene-context-chip='true']")) {
    root.insertAdjacentHTML(
      "afterbegin",
      `<div class="m8a-v411-product-ux__scene-context-chip" data-m8a-v411-scene-context-chip="true" data-m8a-v411-scene-context-chip-version="${M8A_V411_SCENE_CONTEXT_CHIP_VERSION}" data-m8a-v411-scene-context-chip-copy="${M8A_V411_SCENE_CONTEXT_CHIP_COPY}" data-m8a-v48-info-class="fixed" role="note" aria-label="Scene scope context">${M8A_V411_SCENE_CONTEXT_CHIP_COPY}</div>`
    );
  }
}

export function syncM8aV411SceneContextChip(root: HTMLElement): void {
  const chip = root.querySelector<HTMLElement>(
    "[data-m8a-v411-scene-context-chip='true']"
  );
  if (!chip) {
    return;
  }
  chip.textContent = M8A_V411_SCENE_CONTEXT_CHIP_COPY;
  chip.dataset.m8aV411SceneContextChipCopy = M8A_V411_SCENE_CONTEXT_CHIP_COPY;
  chip.dataset.m8aV411SceneContextChipVersion =
    M8A_V411_SCENE_CONTEXT_CHIP_VERSION;
  chip.dataset.m8aV411SceneContextChipMaxWidthPx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX
  );
  chip.dataset.m8aV411SceneContextChipMaxHeightPx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX
  );
  chip.dataset.m8aV411SceneContextChipFontSizePx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX
  );
  chip.hidden = false;
  chip.setAttribute("aria-hidden", "false");
}
