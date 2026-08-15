import type { TerrainSourceDefinition } from "../../types/terrain";

export const DEFAULT_TERRAIN_SOURCE_ID = "maplibre-demo-terrain";

/** Built-in terrain sources suitable for Atlas Lab development. */
export const BUILTIN_TERRAIN_SOURCES: TerrainSourceDefinition[] = [
  {
    id: "maplibre-demo-terrain",
    label: "MapLibre Demo Terrain",
    url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
    tileSize: 256,
    encoding: "terrarium",
    exaggeration: 1.25,
    attribution: "MapLibre demo terrain tiles"
  },
  {
    id: "mapterhorn",
    label: "Mapterhorn",
    url: "https://tiles.mapterhorn.com/tilejson.json",
    tileSize: 512,
    encoding: "terrarium",
    exaggeration: 1,
    attribution: "Mapterhorn open terrain tiles"
  }
];
