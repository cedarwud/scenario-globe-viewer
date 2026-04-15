/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string;
}

interface Window {
  CESIUM_BASE_URL?: string;
}
