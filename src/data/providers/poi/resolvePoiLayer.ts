import { PoiLayerRegistry, defaultPoiLayerRegistry } from "../../pois/PoiLayerRegistry";
import type { PoiLayerDefinition } from "../../../types/poiLayer";

export function listAvailablePoiLayers(
  registry: PoiLayerRegistry = defaultPoiLayerRegistry
): PoiLayerDefinition[] {
  return registry.list();
}

export function getPoiLayerDefinition(
  id: string,
  registry: PoiLayerRegistry = defaultPoiLayerRegistry
): PoiLayerDefinition | undefined {
  return registry.get(id);
}

export function registerPoiLayer(
  def: PoiLayerDefinition,
  registry: PoiLayerRegistry = defaultPoiLayerRegistry
): void {
  registry.register(def);
}

export function resolvePoiLayers(
  ids: string[],
  registry: PoiLayerRegistry = defaultPoiLayerRegistry
): PoiLayerDefinition[] {
  const resolved: PoiLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown POI layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
