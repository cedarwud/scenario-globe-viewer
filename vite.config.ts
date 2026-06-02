import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  resolve: {
    alias: {
      "satellite.js": fileURLToPath(
        new URL("./src/vendor/satellite-js-runtime.ts", import.meta.url)
      )
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        // Cesium resolves runtime files from a shared base URL and a Workers prefix.
        // Keep these folders together for the future bootstrap path.
        // Evidence: node_modules/@cesium/engine/Source/Core/buildModuleUrl.js:36-46
        // Evidence: node_modules/@cesium/engine/Source/Core/TaskProcessor.js:91-125
        {
          src: "node_modules/cesium/Build/Cesium/Workers/**/*",
          dest: "cesium/Workers",
          rename: { stripBase: 5 }
        },
        {
          src: "node_modules/cesium/Build/Cesium/Assets/**/*",
          dest: "cesium/Assets",
          rename: { stripBase: 5 }
        },
        {
          src: "node_modules/cesium/Build/Cesium/ThirdParty/**/*",
          dest: "cesium/ThirdParty",
          rename: { stripBase: 5 }
        },
        {
          src: "node_modules/cesium/Build/Cesium/Widgets/**/*",
          dest: "cesium/Widgets",
          rename: { stripBase: 5 }
        }
      ]
    })
  ],
  build: {
    // Cesium is intentionally kept as one vendor chunk. Arbitrary engine-internal
    // splitting breaks browser smoke constructor wiring, while app/runtime code
    // is split below into smaller project-owned chunks.
    chunkSizeWarningLimit: 4200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            {
              name: "cesium-runtime",
              test: /node_modules[\\/](?:cesium|@cesium)[\\/]/,
              priority: 30
            },
            {
              name: "satellite-runtime",
              test: /src[\\/]vendor[\\/]satellite-js-runtime\.ts$/,
              priority: 20
            },
            {
              name: "app-runtime",
              test: /src[\\/]runtime[\\/]/,
              priority: 10,
              maxSize: 450_000
            },
            {
              name: "app-features",
              test: /src[\\/]features[\\/]/,
              priority: 8,
              maxSize: 450_000
            },
            {
              name: "app-core",
              test: /src[\\/]core[\\/]/,
              priority: 6
            }
          ]
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  }
});
