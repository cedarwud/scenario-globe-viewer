import {
  Credit,
  ImageryLayer,
  TileMapServiceImageryProvider,
  buildModuleUrl
} from "cesium";

export function createOfflineImageryLayer(): ImageryLayer {
  // Keep the delivery-default imagery path offline-first by resolving Cesium's
  // bundled Natural Earth II tiles under the shared asset root.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-16
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/imagery-layers-texture-filters/main.js:12-20
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/TileMapServiceImageryProvider.js:18-27
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/TileMapServiceImageryProvider.js:108-149
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TileMapServiceImageryProviderSpec.js:106-119
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TileMapServiceImageryProviderSpec.js:280-296
  return ImageryLayer.fromProviderAsync(
    TileMapServiceImageryProvider.fromUrl(buildModuleUrl("Assets/Textures/NaturalEarthII"), {
      credit: new Credit("Natural Earth II", true)
    })
  );
}
