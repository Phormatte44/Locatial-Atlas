import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import type { RoadLayerDefinition } from "../../types/roadLayer";
import { mergeRoadStyle, roadStyleUsesCasing } from "../../data/roads/roadDefaults";
import { formatRoadFeatureId } from "../../interaction/roadFeatureIds";

export const ATLAS_ROAD_PREFIX = "atlas-road";

export function roadSourceId(layerId: string): string {
  return `${ATLAS_ROAD_PREFIX}-source-${layerId}`;
}

export function roadCasingLayerId(layerId: string): string {
  return `${ATLAS_ROAD_PREFIX}-${layerId}-casing`;
}

export function roadLineLayerId(layerId: string): string {
  return `${ATLAS_ROAD_PREFIX}-${layerId}-line`;
}

export function roadLayerIdsForDefinition(definition: RoadLayerDefinition): string[] {
  const style = mergeRoadStyle(definition.style);
  if (roadStyleUsesCasing(style)) {
    return [roadCasingLayerId(definition.id), roadLineLayerId(definition.id)];
  }

  return [roadLineLayerId(definition.id)];
}

function highlightExpression<T extends string | number>(
  defaultValue: T,
  highlightValue: T
): ["case", ["boolean", ["feature-state", "highlight"], false], T, T] {
  return [
    "case",
    ["boolean", ["feature-state", "highlight"], false],
    highlightValue,
    defaultValue
  ];
}

function dashArrayExpression(
  dashArray: number[] | undefined
): ["literal", number[]] | undefined {
  if (!dashArray || dashArray.length === 0) {
    return undefined;
  }

  return ["literal", dashArray];
}

export function addRoadLayerToMap(map: MapLibreMap, definition: RoadLayerDefinition): void {
  removeRoadLayerFromMap(map, definition.id);

  const sourceId = roadSourceId(definition.id);
  const casingLayerId = roadCasingLayerId(definition.id);
  const lineLayerId = roadLineLayerId(definition.id);
  const style = mergeRoadStyle(definition.style);
  const useCasing = roadStyleUsesCasing(style);
  const geoJsonData =
    typeof definition.source.data === "string"
      ? definition.source.data
      : (definition.source.data as GeoJSON.FeatureCollection);

  map.addSource(sourceId, {
    type: "geojson",
    data: geoJsonData,
    generateId: true
  });

  if (useCasing) {
    map.addLayer({
      id: casingLayerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": highlightExpression(style.casingColor, style.highlightCasingColor),
        "line-width": highlightExpression(style.casingWidth, style.highlightWidth + 1),
        "line-opacity": style.opacity
      }
    });
  }

  const linePaint: Record<string, unknown> = {
    "line-color": highlightExpression(style.color, style.highlightColor),
    "line-width": highlightExpression(style.width, style.highlightWidth),
    "line-opacity": style.opacity
  };

  const dashExpression = dashArrayExpression(style.dashArray);
  if (dashExpression) {
    linePaint["line-dasharray"] = dashExpression;
  }

  map.addLayer({
    id: lineLayerId,
    type: "line",
    source: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: linePaint
  });
}

export function removeRoadLayerFromMap(map: MapLibreMap, layerId: string): void {
  const casingLayerId = roadCasingLayerId(layerId);
  const lineLayerId = roadLineLayerId(layerId);
  const sourceId = roadSourceId(layerId);

  if (map.getLayer(lineLayerId)) {
    map.removeLayer(lineLayerId);
  }

  if (map.getLayer(casingLayerId)) {
    map.removeLayer(casingLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncRoadLayersOnMap(
  map: MapLibreMap,
  definitions: RoadLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_ROAD_PREFIX}-`) || !layer.id.endsWith("-line")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_ROAD_PREFIX}-`.length, -"-line".length);
      if (!nextIds.has(layerId)) {
        removeRoadLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addRoadLayerToMap(map, definition);
  }
}

export interface RoadPickResult {
  featureId: string;
  layerId: string;
  featureKey: string;
}

function featureKeyFromRenderedFeature(feature: MapGeoJSONFeature, layerId: string): string {
  if (feature.id !== undefined) {
    return String(feature.id);
  }

  const properties = feature.properties;
  if (properties?.id !== undefined && properties.id !== null) {
    return String(properties.id);
  }

  if (properties?.name !== undefined && properties.name !== null) {
    return String(properties.name);
  }

  return `${layerId}-unknown`;
}

export function queryRoadFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): RoadPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = enabledLayerIds.flatMap((layerId) => [
    roadLineLayerId(layerId),
    roadCasingLayerId(layerId)
  ]);

  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const base = `${ATLAS_ROAD_PREFIX}-`;
  if (!feature.layer.id.startsWith(base)) {
    return null;
  }

  const withoutPrefix = feature.layer.id.slice(base.length);
  let atlasLayerId = "";

  if (withoutPrefix.endsWith("-line")) {
    atlasLayerId = withoutPrefix.slice(0, -"-line".length);
  } else if (withoutPrefix.endsWith("-casing")) {
    atlasLayerId = withoutPrefix.slice(0, -"-casing".length);
  }

  if (!atlasLayerId) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId: formatRoadFeatureId(atlasLayerId, featureKey)
  };
}

export function setRoadFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous) {
    const previousSourceId = roadSourceId(previous.layerId);
    if (map.getSource(previousSourceId)) {
      const previousId = Number.isFinite(Number(previous.featureKey))
        ? Number(previous.featureKey)
        : previous.featureKey;

      map.setFeatureState({ source: previousSourceId, id: previousId }, { highlight: false });
    }
  }

  if (!featureKey || !layerId) {
    return;
  }

  const sourceId = roadSourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}
