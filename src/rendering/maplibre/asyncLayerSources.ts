import type { GeoJSONSource } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { BoundaryLayerDefinition } from "../../types/boundaryLayer";
import type { LabelLayerDefinition } from "../../types/labelLayer";
import type { RoadLayerDefinition } from "../../types/roadLayer";
import type { AreaLayerDefinition } from "../../types/areaLayer";
import type { BuildingLayerDefinition } from "../../types/buildingLayer";
import type { LayerFamily } from "../../types/layerLoadState";
import { layerUsesAsyncGeoJsonUrl } from "../../data/geoJsonLayerSource";
import { boundarySourceId } from "./boundarySetup";
import { labelSourceId } from "./labelSetup";
import { roadSourceId } from "./roadSetup";
import { areaSourceId } from "./areaSetup";
import { buildingSourceId } from "./buildingSetup";

export interface AsyncLayerDescriptor {
  family: LayerFamily;
  layerId: string;
  url: string;
}

export function sourceIdForLayer(family: LayerFamily, layerId: string): string {
  switch (family) {
    case "boundary":
      return boundarySourceId(layerId);
    case "label":
      return labelSourceId(layerId);
    case "road":
      return roadSourceId(layerId);
    case "area":
      return areaSourceId(layerId);
    case "building":
      return buildingSourceId(layerId);
  }
}

export function applyGeoJsonToLayerSource(
  map: MapLibreMap,
  family: LayerFamily,
  layerId: string,
  data: import("geojson").FeatureCollection
): void {
  const sourceId = sourceIdForLayer(family, layerId);
  const source = map.getSource(sourceId);

  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
  }
}

export function collectAsyncLayerDescriptors(input: {
  boundaryLayers: BoundaryLayerDefinition[];
  labelLayers: LabelLayerDefinition[];
  roadLayers: RoadLayerDefinition[];
  areaLayers: AreaLayerDefinition[];
  buildingLayers: BuildingLayerDefinition[];
}): AsyncLayerDescriptor[] {
  const descriptors: AsyncLayerDescriptor[] = [];

  for (const definition of input.boundaryLayers) {
    if (layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      descriptors.push({
        family: "boundary",
        layerId: definition.id,
        url: definition.source.data
      });
    }
  }

  for (const definition of input.labelLayers) {
    if (layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      descriptors.push({
        family: "label",
        layerId: definition.id,
        url: definition.source.data
      });
    }
  }

  for (const definition of input.roadLayers) {
    if (layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      descriptors.push({
        family: "road",
        layerId: definition.id,
        url: definition.source.data
      });
    }
  }

  for (const definition of input.areaLayers) {
    if (layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      descriptors.push({
        family: "area",
        layerId: definition.id,
        url: definition.source.data
      });
    }
  }

  for (const definition of input.buildingLayers) {
    if (layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      descriptors.push({
        family: "building",
        layerId: definition.id,
        url: definition.source.data
      });
    }
  }

  return descriptors;
}

export function collectInlineLayerDescriptors(input: {
  boundaryLayers: BoundaryLayerDefinition[];
  labelLayers: LabelLayerDefinition[];
  roadLayers: RoadLayerDefinition[];
  areaLayers: AreaLayerDefinition[];
  buildingLayers: BuildingLayerDefinition[];
}): Array<{ family: LayerFamily; layerId: string }> {
  const inline: Array<{ family: LayerFamily; layerId: string }> = [];

  for (const definition of input.boundaryLayers) {
    if (!layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      inline.push({ family: "boundary", layerId: definition.id });
    }
  }

  for (const definition of input.labelLayers) {
    if (!layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      inline.push({ family: "label", layerId: definition.id });
    }
  }

  for (const definition of input.roadLayers) {
    if (!layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      inline.push({ family: "road", layerId: definition.id });
    }
  }

  for (const definition of input.areaLayers) {
    if (!layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      inline.push({ family: "area", layerId: definition.id });
    }
  }

  for (const definition of input.buildingLayers) {
    if (!layerUsesAsyncGeoJsonUrl(definition.source.data)) {
      inline.push({ family: "building", layerId: definition.id });
    }
  }

  return inline;
}
