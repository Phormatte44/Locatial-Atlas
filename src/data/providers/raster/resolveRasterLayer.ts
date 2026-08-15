import {
  RasterLayerRegistry,
  defaultRasterLayerRegistry
} from "../../rasters/RasterLayerRegistry";
import type { RasterLayerDefinition } from "../../../types/rasterLayer";

export function listAvailableRasterLayers(
  registry: RasterLayerRegistry = defaultRasterLayerRegistry
): RasterLayerDefinition[] {
  return registry.list();
}

export function getRasterLayerDefinition(
  id: string,
  registry: RasterLayerRegistry = defaultRasterLayerRegistry
): RasterLayerDefinition | undefined {
  return registry.get(id);
}

export function registerRasterLayer(
  def: RasterLayerDefinition,
  registry: RasterLayerRegistry = defaultRasterLayerRegistry
): void {
  registry.register(def);
}

export function resolveRasterLayers(
  ids: string[],
  registry: RasterLayerRegistry = defaultRasterLayerRegistry
): RasterLayerDefinition[] {
  const resolved: RasterLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown raster layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
