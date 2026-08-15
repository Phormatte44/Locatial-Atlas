import type { Map as MapLibreMap, RasterDEMSourceSpecification } from "maplibre-gl";
import type { TerrainSourceDefinition } from "../../types/terrain";

export const ATLAS_TERRAIN_SOURCE_ID = "atlas-terrain-dem";
export const ATLAS_TERRAIN_HILLSHADE_LAYER_ID = "atlas-terrain-hillshade";

function findFirstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return undefined;
  }

  for (const layer of layers) {
    if (layer.type === "symbol") {
      return layer.id;
    }
  }

  return undefined;
}

export function applyTerrainToMap(map: MapLibreMap, source: TerrainSourceDefinition): void {
  removeTerrainFromMap(map);

  const demSource: RasterDEMSourceSpecification = {
    type: "raster-dem",
    url: source.url,
    tileSize: source.tileSize,
    encoding: source.encoding
  };

  map.addSource(ATLAS_TERRAIN_SOURCE_ID, demSource);

  map.addLayer(
    {
      id: ATLAS_TERRAIN_HILLSHADE_LAYER_ID,
      type: "hillshade",
      source: ATLAS_TERRAIN_SOURCE_ID,
      paint: {
        "hillshade-illumination-direction": 315,
        "hillshade-exaggeration": 0.45,
        "hillshade-shadow-color": "rgba(30, 40, 80, 0.45)",
        "hillshade-highlight-color": "rgba(255, 240, 200, 0.35)"
      }
    },
    findFirstSymbolLayerId(map)
  );

  map.setTerrain({
    source: ATLAS_TERRAIN_SOURCE_ID,
    exaggeration: source.exaggeration
  });
}

export function removeTerrainFromMap(map: MapLibreMap): void {
  map.setTerrain(null);

  if (map.getLayer(ATLAS_TERRAIN_HILLSHADE_LAYER_ID)) {
    map.removeLayer(ATLAS_TERRAIN_HILLSHADE_LAYER_ID);
  }

  if (map.getSource(ATLAS_TERRAIN_SOURCE_ID)) {
    map.removeSource(ATLAS_TERRAIN_SOURCE_ID);
  }
}

export function queryTerrainElevationMeters(map: MapLibreMap, lng: number, lat: number): number {
  const elevation = map.queryTerrainElevation([lng, lat]);
  return elevation ?? 0;
}
