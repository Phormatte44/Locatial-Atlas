import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { PoiLayerDefinition } from "../../types/poiLayer";
import {
  mergePoiCluster,
  mergePoiStyle,
  poiLayerUsesClustering
} from "../../data/pois/poiDefaults";
import { resolveInitialGeoJsonData } from "../../data/geoJsonLayerSource";
import {
  formatPoiClusterFeatureId,
  formatPoiFeatureId
} from "../../interaction/poiFeatureIds";
import { ATLAS_LABEL_PREFIX } from "./labelSetup";

export const ATLAS_POI_PREFIX = "atlas-poi";

/** Basemap stack inserts POI layers before label symbol layers when present. */
export const POI_LAYER_STACK_NOTE =
  "POI symbol and cluster layers render above roads and below label symbol layers.";

export function poiSourceId(layerId: string): string {
  return `${ATLAS_POI_PREFIX}-source-${layerId}`;
}

export function poiUnclusteredLayerId(layerId: string): string {
  return `${ATLAS_POI_PREFIX}-${layerId}-unclustered`;
}

export function poiClusterCircleLayerId(layerId: string): string {
  return `${ATLAS_POI_PREFIX}-${layerId}-clusters`;
}

export function poiClusterCountLayerId(layerId: string): string {
  return `${ATLAS_POI_PREFIX}-${layerId}-cluster-count`;
}

export function poiLayerIdsForDefinition(definition: PoiLayerDefinition): string[] {
  const ids = [poiUnclusteredLayerId(definition.id)];

  if (poiLayerUsesClustering(definition.cluster)) {
    ids.unshift(poiClusterCircleLayerId(definition.id), poiClusterCountLayerId(definition.id));
  }

  return ids;
}

function findPoiInsertBeforeLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return undefined;
  }

  for (const layer of layers) {
    if (layer.id.startsWith(`${ATLAS_LABEL_PREFIX}-`) && layer.id.endsWith("-symbol")) {
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

function styleHasGlyphs(map: MapLibreMap): boolean {
  const glyphs = map.getStyle()?.glyphs;
  return typeof glyphs === "string" && glyphs.trim().length > 0;
}

function featureKeyFromRenderedFeature(feature: MapGeoJSONFeature, layerId: string): string {
  const properties = feature.properties;

  if (properties?.point_count !== undefined) {
    const clusterId = properties.cluster_id;
    if (clusterId !== undefined && clusterId !== null) {
      return `cluster:${clusterId}`;
    }
  }

  if (feature.id !== undefined) {
    return String(feature.id);
  }

  if (properties?.id !== undefined && properties.id !== null) {
    return String(properties.id);
  }

  if (properties?.name !== undefined && properties.name !== null) {
    return String(properties.name);
  }

  return `${layerId}-unknown`;
}

export function addPoiLayerToMap(map: MapLibreMap, definition: PoiLayerDefinition): void {
  removePoiLayerFromMap(map, definition.id);

  const sourceId = poiSourceId(definition.id);
  const style = mergePoiStyle(definition.style);
  const cluster = mergePoiCluster(definition.cluster);
  const clustering = poiLayerUsesClustering(definition.cluster);
  const beforeId = findPoiInsertBeforeLayerId(map);
  const geoJsonData = resolveInitialGeoJsonData(definition.source.data);

  const sourceOptions: Parameters<MapLibreMap["addSource"]>[1] = {
    type: "geojson",
    data: geoJsonData,
    generateId: true
  };

  if (clustering) {
    Object.assign(sourceOptions, {
      cluster: true,
      clusterRadius: cluster.clusterRadius,
      clusterMaxZoom: cluster.clusterMaxZoom,
      ...(cluster.clusterProperties ? { clusterProperties: cluster.clusterProperties } : {})
    });
  }

  map.addSource(sourceId, sourceOptions);

  if (clustering) {
    map.addLayer(
      {
        id: poiClusterCircleLayerId(definition.id),
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": style.clusterColor,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            style.clusterRadius,
            10,
            style.clusterRadius + 4,
            25,
            style.clusterRadius + 8
          ],
          "circle-stroke-color": style.clusterStrokeColor,
          "circle-stroke-width": style.clusterStrokeWidth
        }
      },
      beforeId
    );

    if (styleHasGlyphs(map)) {
      map.addLayer(
        {
          id: poiClusterCountLayerId(definition.id),
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": style.clusterTextSize,
            "text-allow-overlap": true
          },
          paint: {
            "text-color": style.clusterTextColor
          }
        },
        beforeId
      );
    }
  }

  if (style.iconImage) {
    map.addLayer(
      {
        id: poiUnclusteredLayerId(definition.id),
        type: "symbol",
        source: sourceId,
        filter: clustering ? ["!", ["has", "point_count"]] : undefined,
        layout: {
          "icon-image": style.iconImage,
          "icon-size": highlightExpression(style.iconSize, style.highlightIconSize),
          "icon-allow-overlap": true
        },
        paint: {
          "icon-color": highlightExpression(style.iconColor, style.highlightIconColor)
        }
      },
      beforeId
    );
  } else {
    map.addLayer(
      {
        id: poiUnclusteredLayerId(definition.id),
        type: "circle",
        source: sourceId,
        filter: clustering ? ["!", ["has", "point_count"]] : undefined,
        paint: {
          "circle-color": highlightExpression(style.iconColor, style.highlightIconColor),
          "circle-radius": highlightExpression(style.iconRadius, style.highlightIconRadius),
          "circle-stroke-color": style.iconStrokeColor,
          "circle-stroke-width": style.iconStrokeWidth
        }
      },
      beforeId
    );
  }
}

export function removePoiLayerFromMap(map: MapLibreMap, layerId: string): void {
  const layerIds = [
    poiClusterCountLayerId(layerId),
    poiClusterCircleLayerId(layerId),
    poiUnclusteredLayerId(layerId)
  ];
  const sourceId = poiSourceId(layerId);

  for (const id of layerIds) {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function syncPoiLayersOnMap(map: MapLibreMap, definitions: PoiLayerDefinition[]): void {
  const nextIds = new Set(definitions.map((definition) => definition.id));
  const style = map.getStyle();

  if (style?.layers) {
    for (const layer of style.layers) {
      if (!layer.id.startsWith(`${ATLAS_POI_PREFIX}-`)) {
        continue;
      }

      const suffixes = ["-unclustered", "-clusters", "-cluster-count"] as const;
      for (const suffix of suffixes) {
        if (!layer.id.endsWith(suffix)) {
          continue;
        }

        const layerId = layer.id.slice(`${ATLAS_POI_PREFIX}-`.length, -suffix.length);
        if (layerId && !nextIds.has(layerId)) {
          removePoiLayerFromMap(map, layerId);
        }
      }
    }
  }

  for (const definition of definitions) {
    addPoiLayerToMap(map, definition);
  }
}

export interface PoiPickResult {
  featureId: string;
  layerId: string;
  featureKey: string;
  isCluster: boolean;
  clusterId?: number;
}

function atlasLayerIdFromMapLayerId(mapLayerId: string): string | null {
  const base = `${ATLAS_POI_PREFIX}-`;
  if (!mapLayerId.startsWith(base)) {
    return null;
  }

  const rest = mapLayerId.slice(base.length);
  for (const suffix of ["-unclustered", "-clusters", "-cluster-count"] as const) {
    if (rest.endsWith(suffix)) {
      return rest.slice(0, -suffix.length);
    }
  }

  return null;
}

function poiQueryableLayerIds(map: MapLibreMap, enabledLayerIds: string[]): string[] {
  const ids: string[] = [];

  for (const layerId of enabledLayerIds) {
    const clusterCircleId = poiClusterCircleLayerId(layerId);
    const clusterCountId = poiClusterCountLayerId(layerId);
    const unclusteredId = poiUnclusteredLayerId(layerId);

    if (map.getLayer(clusterCircleId)) {
      ids.push(clusterCircleId);
    }

    if (map.getLayer(clusterCountId)) {
      ids.push(clusterCountId);
    }

    if (map.getLayer(unclusteredId)) {
      ids.push(unclusteredId);
    }
  }

  return ids;
}

export function queryPoiFeatureAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): PoiPickResult | null {
  if (enabledLayerIds.length === 0) {
    return null;
  }

  const queryLayerIds = poiQueryableLayerIds(map, enabledLayerIds);
  if (queryLayerIds.length === 0) {
    return null;
  }

  const features = map.queryRenderedFeatures([x, y], { layers: queryLayerIds });
  if (features.length === 0) {
    return null;
  }

  const feature = features[0];
  const atlasLayerId = atlasLayerIdFromMapLayerId(feature.layer.id);
  if (!atlasLayerId || !enabledLayerIds.includes(atlasLayerId)) {
    return null;
  }

  const featureKey = featureKeyFromRenderedFeature(feature, atlasLayerId);
  const isCluster = featureKey.startsWith("cluster:");
  const clusterId = isCluster ? Number(featureKey.slice("cluster:".length)) : undefined;

  const featureId = isCluster && clusterId !== undefined && !Number.isNaN(clusterId)
    ? formatPoiClusterFeatureId(atlasLayerId, clusterId)
    : formatPoiFeatureId(atlasLayerId, featureKey);

  return {
    layerId: atlasLayerId,
    featureKey,
    featureId,
    isCluster,
    clusterId: isCluster && !Number.isNaN(clusterId) ? clusterId : undefined
  };
}

export function setPoiFeatureHighlight(
  map: MapLibreMap,
  layerId: string,
  featureKey: string | null,
  previous: { layerId: string; featureKey: string } | null
): void {
  if (previous && !previous.featureKey.startsWith("cluster:")) {
    const previousSourceId = poiSourceId(previous.layerId);
    if (map.getSource(previousSourceId)) {
      const previousId = Number.isFinite(Number(previous.featureKey))
        ? Number(previous.featureKey)
        : previous.featureKey;

      map.setFeatureState({ source: previousSourceId, id: previousId }, { highlight: false });
    }
  }

  if (!featureKey || !layerId || featureKey.startsWith("cluster:")) {
    return;
  }

  const sourceId = poiSourceId(layerId);
  if (!map.getSource(sourceId)) {
    return;
  }

  const nextId = Number.isFinite(Number(featureKey)) ? Number(featureKey) : featureKey;

  map.setFeatureState({ source: sourceId, id: nextId }, { highlight: true });
}

export interface ClusterExpansionResult {
  layerId: string;
  clusterId: number;
  expansionZoom: number;
  center: { lng: number; lat: number };
}

export async function expandClusterAtScreen(
  map: MapLibreMap,
  x: number,
  y: number,
  enabledLayerIds: string[]
): Promise<ClusterExpansionResult | null> {
  const pick = queryPoiFeatureAtScreen(map, x, y, enabledLayerIds);
  if (!pick?.isCluster || pick.clusterId === undefined) {
    return null;
  }

  const source = map.getSource(poiSourceId(pick.layerId));
  if (!source || !("getClusterExpansionZoom" in source)) {
    return null;
  }

  const geoJsonSource = source as GeoJSONSource;
  const geometry = map.queryRenderedFeatures([x, y], {
    layers: [poiClusterCircleLayerId(pick.layerId)]
  })[0]?.geometry;

  if (!geometry || geometry.type !== "Point") {
    return null;
  }

  const [lng, lat] = geometry.coordinates as [number, number];
  const expansionZoom = await geoJsonSource.getClusterExpansionZoom(pick.clusterId);

  map.easeTo({
    center: [lng, lat],
    zoom: expansionZoom
  });

  return {
    layerId: pick.layerId,
    clusterId: pick.clusterId,
    expansionZoom,
    center: { lng, lat }
  };
}

export async function frameCluster(
  map: MapLibreMap,
  layerId: string,
  clusterId: number,
  limit = 100
): Promise<{ lng: number; lat: number }[] | null> {
  const source = map.getSource(poiSourceId(layerId));
  if (!source || !("getClusterLeaves" in source)) {
    return null;
  }

  const geoJsonSource = source as GeoJSONSource;
  const leaves = await geoJsonSource.getClusterLeaves(clusterId, limit, 0);
  const coordinates: { lng: number; lat: number }[] = [];

  for (const leaf of leaves) {
    if (leaf.geometry.type === "Point") {
      const [lng, lat] = leaf.geometry.coordinates as [number, number];
      coordinates.push({ lng, lat });
    }
  }

  return coordinates.length > 0 ? coordinates : null;
}
