# Layers

Geographic visual layers such as boundaries, labels, roads, areas, buildings, terrain, and imagery.

## Registered layer stacks

Applications register provider-agnostic layer definitions at runtime and enable them through `AtlasEngine`:

| Layer kind | Registry | Enable API | Feature id prefix |
| --- | --- | --- | --- |
| Boundaries | `registerBoundaryLayer()` | `setBoundaryLayers(ids[])` | `boundary:` |
| Areas | `registerAreaLayer()` | `setAreaLayers(ids[])` | `area:` |
| Buildings | `registerBuildingLayer()` | `setBuildingLayers(ids[])` | `building:` |
| Roads | `registerRoadLayer()` | `setRoadLayers(ids[])` | `road:` |
| Labels | `registerLabelLayer()` | `setLabelLayers(ids[])` | `label:` |

**Render order (bottom → top):** boundaries → areas → buildings → roads → labels → Three overlay.

**Pick order (first match wins):** world markup → labels → roads → buildings → areas → boundaries.

Building layers use MapLibre `fill-extrusion` for native 3D footprints aligned with the basemap. See `DECISIONS.md` Foundation 42 for globe and height-data limitations.

**Async URL loading (Foundation 43):** layers with a GeoJSON URL load through `LayerSourceLoader`; query lifecycle via `getLayerLoadState` / `onLayerLoadChange`. Inline GeoJSON is synchronous.
