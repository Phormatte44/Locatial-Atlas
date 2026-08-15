import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import type { BoundaryLayerDefinition } from "../../types/boundaryLayer";
import { mergeBoundaryStyle } from "../../data/boundaries/boundaryDefaults";
import { formatBoundaryFeatureId } from "../../interaction/boundaryFeatureIds";

export const ATLAS_BOUNDARY_PREFIX = "atlas-boundary";

export function boundarySourceId(layerId: string): string {
  return `${ATLAS_BOUNDARY_PREFIX}-source-${layerId}`;
}

export function boundaryFillLayerId(layerId: string): string {
  return `${ATLAS_BOUNDARY_PREFIX}-${layerId}-fill`;
}

export function boundaryLineLayerId(layerId: string): string {
  return `${ATLAS_BOUNDARY_PREFIX}-${layerId}-line`;
}

export function boundaryLayerIdsForDefinition(definition: BoundaryLayerDefinition): string[] {
  return [boundaryFillLayerId(definition.id), boundaryLineLayerId(definition.id)];
}

function findInsertBeforeLayerId(map: MapLibreMap): string | undefined {
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

export function addBoundaryLayerToMap(map: MapLibreMap, definition: BoundaryLayerDefinition): void {
  removeBoundaryLayerFromMap(map, definition.id);

  const sourceId = boundarySourceId(definition.id);
  const fillLayerId = boundaryFillLayerId(definition.id);
  const lineLayerId = boundaryLineLayerId(definition.id);
  const style = mergeBoundaryStyle(definition.style);
  const beforeId = findInsertBeforeLayerId(map);
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
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": highlightExpression(style.fillColor, style.highlightFillColor),
        "fill-opacity": highlightExpression(style.fillOpacity, style.highlightFillOpacity)
      }
    },
    beforeId
  );

  map.addLayer(
    {
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": highlightExpression(style.lineColor, style.highlightLineColor),
        "line-width": highlightExpression(style.lineWidth, style.highlightLineWidth),
        "line-opacity": style.lineOpacity
      }
    },
    beforeId
  );
}

export function removeBoundaryLayerFromMap(map: MapLibreMap, layerId: string): void {
  const fillLayerId = boundaryFillLayerId(layerId);
  const lineLayerId = boundaryLineLayerId(layerId);
  const sourceId = boundarySourceId(layerId);

  if (map.getLayer(lineLayerId)) {
    map.removeLayer(lineLayerId);
  }

  if (map.getLayer(fillLayerId)) {
    map.removeLayer(fillLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncBoundaryLayersOnMap(
  map: MapLibreMap,
  definitions: BoundaryLayerDefinition[]
): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_BOUNDARY_PREFIX}-`) || !layer.id.endsWith("-fill")) {
        continue;
      }

      const layerId = layer.id.slice(`${ATLAS_BOUNDARY_PREFIX}-`.length, -"-fill".length);
      if (!nextIds.has(layerId)) {
        removeBoundaryLayerFromMap(map, layerId);
      }
    }
  }

  for (const definition of definitions) {
    addBoundaryLayerToMap(map, definition);
  }
}

export interface BoundaryPickResult {
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

export function queryBoundaryFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): BoundaryPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = enabledLayerIds.flatMap((layerId) => [
    boundaryFillLayerId(layerId),
    boundaryLineLayerId(layerId)
  ]);

  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const base = `${ATLAS_BOUNDARY_PREFIX}-`;
  if (!feature.layer.id.startsWith(base)) {
    return null;
  }

  const withoutPrefix = feature.layer.id.slice(base.length);
  let atlasLayerId = "";

  if (withoutPrefix.endsWith("-fill")) {
    atlasLayerId = withoutPrefix.slice(0, -"-fill".length);
  } else if (withoutPrefix.endsWith("-line")) {
    atlasLayerId = withoutPrefix.slice(0, -"-line".length);
  }

  if (!atlasLayerId) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId: formatBoundaryFeatureId(atlasLayerId, featureKey)
  };
}

export function setBoundaryFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous) {
    const previousSourceId = boundarySourceId(previous.layerId);
    if (map.getSource(previousSourceId)) {
      const previousId = Number.isFinite(Number(previous.featureKey))
        ? Number(previous.featureKey)
        : previous.featureKey;

      map.setFeatureState(
        { source: previousSourceId, id: previousId },
        { highlight: false }
      );
    }
  }

  if (!featureKey || !layerId) {
    return;
  }

  const sourceId = boundarySourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}
