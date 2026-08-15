import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { LabelLayerDefinition } from "../../types/labelLayer";
import { mergeLabelStyle } from "../../data/labels/labelDefaults";
import { resolveInitialGeoJsonData } from "../../data/geoJsonLayerSource";
import { formatLabelFeatureId } from "../../interaction/labelFeatureIds";

export const ATLAS_LABEL_PREFIX = "atlas-label";

/** Active map styles must expose a `glyphs` URL (see locatial-editorial.json). */
export const LABEL_GLYPH_REQUIREMENT =
  "Registered label layers require the active MapLibre style to define a glyphs URL for symbol text rendering.";

export function labelSourceId(layerId: string): string {
  return `${ATLAS_LABEL_PREFIX}-source-${layerId}`;
}

export function labelSymbolLayerId(layerId: string): string {
  return `${ATLAS_LABEL_PREFIX}-${layerId}-symbol`;
}

export function labelLayerIdsForDefinition(definition: LabelLayerDefinition): string[] {
  return [labelSymbolLayerId(definition.id)];
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

function styleHasGlyphs(map: MapLibreMap): boolean {
  const glyphs = map.getStyle()?.glyphs;
  return typeof glyphs === "string" && glyphs.trim().length > 0;
}

export function addLabelLayerToMap(map: MapLibreMap, definition: LabelLayerDefinition): void {
  removeLabelLayerFromMap(map, definition.id);

  if (!styleHasGlyphs(map)) {
    console.warn(LABEL_GLYPH_REQUIREMENT);
  }

  const sourceId = labelSourceId(definition.id);
  const symbolLayerId = labelSymbolLayerId(definition.id);
  const style = mergeLabelStyle(definition.style);
  const textFieldKey = definition.textField?.trim() || "name";
  const geoJsonData = resolveInitialGeoJsonData(definition.source.data);

  map.addSource(sourceId, {
    type: "geojson",
    data: geoJsonData,
    generateId: true
  });

  map.addLayer({
    id: symbolLayerId,
    type: "symbol",
    source: sourceId,
    layout: {
      "text-field": ["get", textFieldKey],
      "text-font": style.textFont,
      "text-size": highlightExpression(style.textSize, style.highlightTextSize),
      "text-anchor": style.textAnchor,
      "text-offset": style.textOffset,
      // Map-aligned rotation/pitch keep registered labels tangent to the globe surface
      // during vertical-perspective projection (MapLibre handles mercator fallback).
      "text-rotation-alignment": "map",
      "text-pitch-alignment": "map",
      "text-allow-overlap": true,
      "text-ignore-placement": false
    },
    paint: {
      "text-color": highlightExpression(style.textColor, style.highlightTextColor),
      "text-halo-color": highlightExpression(style.textHaloColor, style.highlightTextHaloColor),
      "text-halo-width": style.textHaloWidth
    }
  });
}

export function removeLabelLayerFromMap(map: MapLibreMap, layerId: string): void {
  const symbolLayerId = labelSymbolLayerId(layerId);
  const sourceId = labelSourceId(layerId);

  if (map.getLayer(symbolLayerId)) {
    map.removeLayer(symbolLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncLabelLayersOnMap(
  map: MapLibreMap,
  definitions: LabelLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_LABEL_PREFIX}-`) || !layer.id.endsWith("-symbol")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_LABEL_PREFIX}-`.length, -"-symbol".length);
      if (!nextIds.has(layerId)) {
        removeLabelLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addLabelLayerToMap(map, definition);
  }
}

export interface LabelPickResult {
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

export function queryLabelFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): LabelPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = enabledLayerIds.map((layerId) => labelSymbolLayerId(layerId));
  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const base = `${ATLAS_LABEL_PREFIX}-`;
  if (!feature.layer.id.startsWith(base) || !feature.layer.id.endsWith("-symbol")) {
    return null;
  }

  const atlasLayerId = feature.layer.id.slice(base.length, -"-symbol".length);
  if (!atlasLayerId) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId: formatLabelFeatureId(atlasLayerId, featureKey)
  };
}

export function setLabelFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous) {
    const previousSourceId = labelSourceId(previous.layerId);
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

  const sourceId = labelSourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}
