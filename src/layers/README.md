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
| 3D Tiles | `registerTileset3DLayer()` | `setTileset3DLayers(ids[])` | `tileset3d:` |

**Render order (bottom → top):** raster imagery → boundaries → areas → buildings → roads → POIs → labels → 3D Tiles overlays → Three overlay (world markup).

**Pick order (first match wins):** world markup → POIs → 3D Tiles → labels → roads → buildings → areas → boundaries.

Building layers use MapLibre `fill-extrusion` for native 3D footprints aligned with the basemap. See `DECISIONS.md` Foundation 42 for globe and height-data limitations.

POI layers support optional MapLibre clustering (`clusterRadius`, `clusterMaxZoom`, `clusterProperties`). Click a cluster to expand via `expandClusterAt()` or frame leaf features with `frameCluster(layerId, clusterId)`.

**Async URL loading (Foundation 43):** GeoJSON layers with a remote URL load through `LayerSourceLoader`; query lifecycle via `getLayerLoadState` / `onLayerLoadChange`. Inline GeoJSON is synchronous.

**Raster tile loading (Foundation 45):** raster imagery layers track tile source lifecycle via `sourcedata` events; tile failures emit `onMapError` with kind `tile-load` and `layerFamily: "raster"`. Retry with `retryLayerLoad(layerId, "raster")`.

**3D Tiles loading (Foundation 51):** 3D Tiles overlays validate `tileset.json` asynchronously, then mount a per-layer MapLibre custom layer backed by `3d-tiles-renderer` when the optional peer is installed. Query lifecycle via `getLayerLoadState` / `onLayerLoadChange` with family `tiles3d` (`loading | ready | error`). Tilesets composite with MapLibre terrain via a shared depth buffer; world markup renders above tilesets in a depth-disabled pass. Draco/KTX2 decoder paths are configurable via `AtlasEngineOptions.tileset3DDecoderBaseUrl` or per-layer `decoderBaseUrl`. Frame loaded tilesets with `flyToTilesetBounds(layerId)` or `frameTilesetOnReady(layerId)` using root OBB/AABB bounds when available. Frame a picked feature with `frameTilesetFeature(layerId, featureId)`. Raycast pick/highlight uses feature ids `tileset3d:{layerId}:{featureKey}` where `featureKey` prefers `mf:{id}@…` or `batch:{id}@…`, falling back to mesh uuid. Without `3d-tiles-renderer`, enable emits a clear install hint — never a silent no-op. Retry with `retryLayerLoad(layerId, "tiles3d")`.
