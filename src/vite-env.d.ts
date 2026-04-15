/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string;
  readonly VITE_CESIUM_TERRAIN_URL?: string;
}

interface Window {
  CESIUM_BASE_URL?: string;
}
