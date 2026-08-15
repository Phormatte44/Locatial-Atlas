import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import type { AreaLayerDefinition } from "../../types/areaLayer";
import { mergeAreaStyle } from "../../data/areas/areaDefaults";
import { formatAreaFeatureId } from "../../interaction/areaFeatureIds";
import { ATLAS_LABEL_PREFIX } from "./labelSetup";
import { ATLAS_ROAD_PREFIX } from "./roadSetup";

export const ATLAS_AREA_PREFIX = "atlas-area";

/** Basemap stack (bottom → top): boundaries → areas → roads → labels → Three overlay. */
export const AREA_LAYER_STACK_NOTE =
  "Area fill/outline layers render above boundary layers and below road and label layers.";

export function areaSourceId(layerId: string): string {
  return `${ATLAS_AREA_PREFIX}-source-${layerId}`;
}

export function areaFillLayerId(layerId: string): string {
  return `${ATLAS_AREA_PREFIX}-${layerId}-fill`;
}

export function areaOutlineLayerId(layerId: string): string {
  return `${ATLAS_AREA_PREFIX}-${layerId}-outline`;
}

export function areaLayerIdsForDefinition(definition: AreaLayerDefinition): string[] {
  return [areaFillLayerId(definition.id), areaOutlineLayerId(definition.id)];
}

function findAreaInsertBeforeLayerId(map: MapLibreMap): string | undefined {
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

export function addAreaLayerToMap(map: MapLibreMap, definition: AreaLayerDefinition): void {
  removeAreaLayerFromMap(map, definition.id);

  const sourceId = areaSourceId(definition.id);
  const fillLayerId = areaFillLayerId(definition.id);
  const outlineLayerId = areaOutlineLayerId(definition.id);
  const style = mergeAreaStyle(definition.style);
  const beforeId = findAreaInsertBeforeLayerId(map);
  const geoJsonData =
    typeof definition.source.data === "string"
      ? definition.source.data
      : (definition.source.data as GeoJSON.FeatureCollection);

  map.addSource(sourceId, {
    type: "geojson",
    data: geoJsonData,
    generateId: true
  });

  const fillPaint: Record<string, unknown> = {
    "fill-color": highlightExpression(style.fillColor, style.highlightFillColor),
    "fill-opacity": highlightExpression(style.fillOpacity, style.highlightFillOpacity)
  };

  if (style.pattern) {
    fillPaint["fill-pattern"] = highlightExpression(style.pattern, style.highlightPattern ?? style.pattern);
  }

  map.addLayer(
    {
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: fillPaint
    },
    beforeId
  );

  map.addLayer(
    {
      id: outlineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": highlightExpression(style.outlineColor, style.highlightOutlineColor),
        "line-width": highlightExpression(style.outlineWidth, style.highlightOutlineWidth)
      }
    },
    beforeId
  );
}

export function removeAreaLayerFromMap(map: MapLibreMap, layerId: string): void {
  const fillLayerId = areaFillLayerId(layerId);
  const outlineLayerId = areaOutlineLayerId(layerId);
  const sourceId = areaSourceId(layerId);

  if (map.getLayer(outlineLayerId)) {
    map.removeLayer(outlineLayerId);
  }

  if (map.getLayer(fillLayerId)) {
    map.removeLayer(fillLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncAreaLayersOnMap(
  map: MapLibreMap,
  definitions: AreaLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_AREA_PREFIX}-`) || !layer.id.endsWith("-fill")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_AREA_PREFIX}-`.length, -"-fill".length);
      if (!nextIds.has(layerId)) {
        removeAreaLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addAreaLayerToMap(map, definition);
  }
}

export interface AreaPickResult {
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

export function queryAreaFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): AreaPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = enabledLayerIds.flatMap((layerId) => [
    areaFillLayerId(layerId),
    areaOutlineLayerId(layerId)
  ]);

  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const base = `${ATLAS_AREA_PREFIX}-`;
  if (!feature.layer.id.startsWith(base)) {
    return null;
  }

  const withoutPrefix = feature.layer.id.slice(base.length);
  let atlasLayerId = "";

  if (withoutPrefix.endsWith("-fill")) {
    atlasLayerId = withoutPrefix.slice(0, -"-fill".length);
  } else if (withoutPrefix.endsWith("-outline")) {
    atlasLayerId = withoutPrefix.slice(0, -"-outline".length);
  }

  if (!atlasLayerId) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId: formatAreaFeatureId(atlasLayerId, featureKey)
  };
}

export function setAreaFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous) {
    const previousSourceId = areaSourceId(previous.layerId);
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

  const sourceId = areaSourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}
