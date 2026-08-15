import {
  AreaLayerRegistry,
  defaultAreaLayerRegistry
} from "../../areas/AreaLayerRegistry";
import type { AreaLayerDefinition } from "../../../types/areaLayer";

export function listAvailableAreaLayers(
  registry: AreaLayerRegistry = defaultAreaLayerRegistry
): AreaLayerDefinition[] {
  return registry.list();
}

export function getAreaLayerDefinition(
  id: string,
  registry: AreaLayerRegistry = defaultAreaLayerRegistry
): AreaLayerDefinition | undefined {
  return registry.get(id);
}

export function registerAreaLayer(
  def: AreaLayerDefinition,
  registry: AreaLayerRegistry = defaultAreaLayerRegistry
): void {
  registry.register(def);
}

export function resolveAreaLayers(
  ids: string[],
  registry: AreaLayerRegistry = defaultAreaLayerRegistry
): AreaLayerDefinition[] {
  const resolved: AreaLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown area layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
