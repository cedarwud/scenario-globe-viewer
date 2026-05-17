export const M8A_V411_SCENE_CONTEXT_CHIP_VERSION =
  "m8a-v4.11-scene-context-chip-conv1-runtime.v1";

export const M8A_V411_SCENE_CONTEXT_CHIP_COPY =
  "Scale evidence (≥500 LEO) lives in Phase 7.1; this route remains a 13-actor bounded demo";

export const M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX = 600;
export const M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX = 28;
export const M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX = 14;

export function ensureM8aV411SceneContextChip(root: HTMLElement): void {
  root.querySelector("[data-m8a-v411-scene-context-chip='true']")?.remove();
}

export function syncM8aV411SceneContextChip(root: HTMLElement): void {
  root.querySelector("[data-m8a-v411-scene-context-chip='true']")?.remove();
}
