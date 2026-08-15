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

**Render order (bottom → top):** boundaries → areas → buildings → roads → POIs → labels → Three overlay.

**Pick order (first match wins):** world markup → POIs → labels → roads → buildings → areas → boundaries.

Building layers use MapLibre `fill-extrusion` for native 3D footprints aligned with the basemap. See `DECISIONS.md` Foundation 42 for globe and height-data limitations.

POI layers support optional MapLibre clustering (`clusterRadius`, `clusterMaxZoom`, `clusterProperties`). Click a cluster to expand via `expandClusterAt()` or frame leaf features with `frameCluster(layerId, clusterId)`.

**Async URL loading (Foundation 43):** layers with a GeoJSON URL load through `LayerSourceLoader`; query lifecycle via `getLayerLoadState` / `onLayerLoadChange`. Inline GeoJSON is synchronous.
