# Layers

Geographic visual layers such as boundaries, labels, roads, areas, buildings, POIs, terrain, and imagery.

## Registered layer stacks

Applications register provider-agnostic layer definitions at runtime and enable them through `AtlasEngine`:

| Layer kind | Registry | Enable API | Feature id prefix |
| --- | --- | --- | --- |
| Boundaries | `registerBoundaryLayer()` | `setBoundaryLayers(ids[])` | `boundary:` |
| Areas | `registerAreaLayer()` | `setAreaLayers(ids[])` | `area:` |
| Buildings | `registerBuildingLayer()` | `setBuildingLayers(ids[])` | `building:` |
| Roads | `registerRoadLayer()` | `setRoadLayers(ids[])` | `road:` |
| Labels | `registerLabelLayer()` | `setLabelLayers(ids[])` | `label:` |
| POIs | `registerPoiLayer()` | `setPoiLayers(ids[])` | `poi:` |
| Raster imagery | `registerRasterLayer()` | `setRasterLayers(ids[])` | — |
| 3D Tiles | `registerTileset3DLayer()` | `setTileset3DLayers(ids[])` | — |

**Render order (bottom → top):** raster imagery → boundaries → areas → buildings → roads → POIs → labels → Three overlay (world markup) → 3D Tiles overlays (when renderer lands).

**Pick order (first match wins):** world markup → POIs → labels → roads → buildings → areas → boundaries.

Building layers use MapLibre `fill-extrusion` for native 3D footprints aligned with the basemap. See `DECISIONS.md` Foundation 42 for globe and height-data limitations.

POI layers support optional MapLibre clustering (`clusterRadius`, `clusterMaxZoom`, `clusterProperties`). Click a cluster to expand via `expandClusterAt()` or frame leaf features with `frameCluster(layerId, clusterId)`.

**Async URL loading (Foundation 43):** GeoJSON layers with a remote URL load through `LayerSourceLoader`; query lifecycle via `getLayerLoadState` / `onLayerLoadChange`. Inline GeoJSON is synchronous.

**Raster tile loading (Foundation 45):** raster imagery layers track tile source lifecycle via `sourcedata` events; tile failures emit `onMapError` with kind `tile-load` and `layerFamily: "raster"`. Retry with `retryLayerLoad(layerId, "raster")`.

**3D Tiles loading (Foundation 47):** 3D Tiles overlays validate `tileset.json` asynchronously via fetch; query lifecycle via `getLayerLoadState` / `onLayerLoadChange` with family `tiles3d`. MapLibre GL JS 5.x has no native 3D Tiles source — F47 ships registry + validation + a stub adapter that emits a clear renderer-unavailable error on enable (never silent no-op). Retry with `retryLayerLoad(layerId, "tiles3d")`. Live rendering will use a Three.js custom layer with `3d-tiles-renderer`.
