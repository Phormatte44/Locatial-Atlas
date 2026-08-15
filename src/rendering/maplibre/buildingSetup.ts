import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import type { BuildingLayerDefinition } from "../../types/buildingLayer";
import { mergeBuildingStyle } from "../../data/buildings/buildingDefaults";
import { formatBuildingFeatureId } from "../../interaction/buildingFeatureIds";
import { ATLAS_LABEL_PREFIX } from "./labelSetup";
import { ATLAS_ROAD_PREFIX } from "./roadSetup";

export const ATLAS_BUILDING_PREFIX = "atlas-building";

/**
 * Basemap stack (bottom → top): boundaries → areas → buildings → roads → labels → Three overlay.
 * Building fill-extrusion layers render above flat area fills and below road and label layers.
 */
export const BUILDING_LAYER_STACK_NOTE =
  "Building fill-extrusion layers render above area fills and below road and label layers.";

export function buildingSourceId(layerId: string): string {
  return `${ATLAS_BUILDING_PREFIX}-source-${layerId}`;
}

export function buildingExtrusionLayerId(layerId: string): string {
  return `${ATLAS_BUILDING_PREFIX}-${layerId}-extrusion`;
}

export function buildingLayerIdsForDefinition(definition: BuildingLayerDefinition): string[] {
  return [buildingExtrusionLayerId(definition.id)];
}

function findBuildingInsertBeforeLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return undefined;
  }

  for (const layer of layers) {
    if (layer.id.startsWith(`${ATLAS_ROAD_PREFIX}-`)) {
      return layer.id;
    }
  }

  for (const layer of layers) {
    if (layer.id.startsWith(`${ATLAS_LABEL_PREFIX}-`)) {
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

function heightExpression(
  heightProperty: string,
  fallbackHeightMeters: number
): ["coalesce", ["to-number", ["get", string], number], number] {
  return ["coalesce", ["to-number", ["get", heightProperty], fallbackHeightMeters], fallbackHeightMeters];
}

export function addBuildingLayerToMap(map: MapLibreMap, definition: BuildingLayerDefinition): void {
  removeBuildingLayerFromMap(map, definition.id);

  const sourceId = buildingSourceId(definition.id);
  const extrusionLayerId = buildingExtrusionLayerId(definition.id);
  const style = mergeBuildingStyle(definition.style);
  const beforeId = findBuildingInsertBeforeLayerId(map);
  const geoJsonData =
    typeof definition.source.data === "string"
      ? definition.source.data
      : (definition.source.data as GeoJSON.FeatureCollection);

  map.addSource(sourceId, {
    type: "geojson",
    data: geoJsonData,
    generateId: true
  });

  map.addLayer(
    {
      id: extrusionLayerId,
      type: "fill-extrusion",
      source: sourceId,
      paint: {
        "fill-extrusion-color": highlightExpression(style.color, style.highlightColor),
        "fill-extrusion-opacity": highlightExpression(style.opacity, style.highlightOpacity),
        "fill-extrusion-height": heightExpression(style.heightProperty, style.heightMeters),
        "fill-extrusion-base": 0
      }
    },
    beforeId
  );
}

export function removeBuildingLayerFromMap(map: MapLibreMap, layerId: string): void {
  const extrusionLayerId = buildingExtrusionLayerId(layerId);
  const sourceId = buildingSourceId(layerId);

  if (map.getLayer(extrusionLayerId)) {
    map.removeLayer(extrusionLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncBuildingLayersOnMap(
  map: MapLibreMap,
  definitions: BuildingLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_BUILDING_PREFIX}-`) || !layer.id.endsWith("-extrusion")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_BUILDING_PREFIX}-`.length, -"-extrusion".length);
      if (!nextIds.has(layerId)) {
        removeBuildingLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addBuildingLayerToMap(map, definition);
  }
}

export interface BuildingPickResult {
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

export function queryBuildingFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): BuildingPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = enabledLayerIds.map((layerId) => buildingExtrusionLayerId(layerId));
  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const base = `${ATLAS_BUILDING_PREFIX}-`;
  if (!feature.layer.id.startsWith(base) || !feature.layer.id.endsWith("-extrusion")) {
    return null;
  }

  const atlasLayerId = feature.layer.id.slice(base.length, -"-extrusion".length);
  if (!atlasLayerId) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId: formatBuildingFeatureId(atlasLayerId, featureKey)
  };
}

export function setBuildingFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous) {
    const previousSourceId = buildingSourceId(previous.layerId);
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

  const sourceId = buildingSourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}
