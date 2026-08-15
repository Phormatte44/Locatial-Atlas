import type { Map as MapLibreMap, RasterSourceSpecification } from "maplibre-gl";
import type { RasterLayerDefinition } from "../../types/rasterLayer";
import { mergeRasterStyle } from "../../data/rasters/rasterDefaults";

export const ATLAS_RASTER_PREFIX = "atlas-raster";

export function rasterSourceId(layerId: string): string {
  return `${ATLAS_RASTER_PREFIX}-source-${layerId}`;
}

export function rasterLayerId(layerId: string): string {
  return `${ATLAS_RASTER_PREFIX}-${layerId}`;
}

export function isAtlasRasterSourceId(sourceId: string): boolean {
  return sourceId.startsWith(`${ATLAS_RASTER_PREFIX}-source-`);
}

export function parseRasterLayerIdFromSourceId(sourceId: string): string | null {
  const prefix = `${ATLAS_RASTER_PREFIX}-source-`;
  if (!sourceId.startsWith(prefix)) {
    return null;
  }

  const layerId = sourceId.slice(prefix.length);
  return layerId.length > 0 ? layerId : null;
}

/** Raster imagery inserts below the boundary/vector overlay stack. */
function findRasterInsertBeforeLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return undefined;
  }

  for (const layer of layers) {
    if (layer.id.startsWith("atlas-boundary-")) {
      return layer.id;
    }
  }

  for (const layer of layers) {
    if (layer.type === "symbol") {
      return layer.id;
    }
  }

  return undefined;
}

function resolveRasterSourceUrl(definition: RasterLayerDefinition): string | undefined {
  if (definition.source.url?.trim()) {
    return definition.source.url.trim();
  }

  return definition.source.tiles?.[0];
}

function buildRasterSource(definition: RasterLayerDefinition): RasterSourceSpecification {
  const source: RasterSourceSpecification = {
    type: "raster",
    tileSize: definition.source.tileSize ?? 256
  };

  if (definition.source.url?.trim()) {
    source.url = definition.source.url.trim();
  } else if (definition.source.tiles?.length) {
    source.tiles = definition.source.tiles;
  }

  if (definition.bounds) {
    source.bounds = definition.bounds;
  }

  if (definition.minzoom !== undefined) {
    source.minzoom = definition.minzoom;
  }

  if (definition.maxzoom !== undefined) {
    source.maxzoom = definition.maxzoom;
  }

  if (definition.attribution) {
    source.attribution = definition.attribution;
  }

  return source;
}

export function addRasterLayerToMap(map: MapLibreMap, definition: RasterLayerDefinition): void {
  removeRasterLayerFromMap(map, definition.id);

  const sourceId = rasterSourceId(definition.id);
  const layerId = rasterLayerId(definition.id);
  const style = mergeRasterStyle(definition.style);
  const beforeId = findRasterInsertBeforeLayerId(map);

  map.addSource(sourceId, buildRasterSource(definition));

  map.addLayer(
    {
      id: layerId,
      type: "raster",
      source: sourceId,
      minzoom: definition.minzoom,
      maxzoom: definition.maxzoom,
      paint: {
        "raster-opacity": style.opacity,
        "raster-brightness-min": style.brightnessMin,
        "raster-brightness-max": style.brightnessMax,
        "raster-contrast": style.contrast
      }
    },
    beforeId
  );
}

export function removeRasterLayerFromMap(map: MapLibreMap, layerId: string): void {
  const mapLayerId = rasterLayerId(layerId);
  const sourceId = rasterSourceId(layerId);

  if (map.getLayer(mapLayerId)) {
    map.removeLayer(mapLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncRasterLayersOnMap(
  map: MapLibreMap,
  definitions: RasterLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_RASTER_PREFIX}-`) || layer.id.includes("-source-")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_RASTER_PREFIX}-`.length);
      if (!nextIds.has(layerId)) {
        removeRasterLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addRasterLayerToMap(map, definition);
  }
}

export function resolveRasterSourceUrlForTracking(definition: RasterLayerDefinition): string | undefined {
  return resolveRasterSourceUrl(definition);
}

export function getRasterLayerDefinitionBySourceId(
  definitions: RasterLayerDefinition[],
  sourceId: string
): RasterLayerDefinition | undefined {
  const layerId = parseRasterLayerIdFromSourceId(sourceId);
  if (!layerId) {
    return undefined;
  }

  return definitions.find((definition) => definition.id === layerId);
}
