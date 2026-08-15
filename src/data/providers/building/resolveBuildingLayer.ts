import {
  BuildingLayerRegistry,
  defaultBuildingLayerRegistry
} from "../../buildings/BuildingLayerRegistry";
import type { BuildingLayerDefinition } from "../../../types/buildingLayer";

export function listAvailableBuildingLayers(
  registry: BuildingLayerRegistry = defaultBuildingLayerRegistry
): BuildingLayerDefinition[] {
  return registry.list();
}

export function getBuildingLayerDefinition(
  id: string,
  registry: BuildingLayerRegistry = defaultBuildingLayerRegistry
): BuildingLayerDefinition | undefined {
  return registry.get(id);
}

export function registerBuildingLayer(
  def: BuildingLayerDefinition,
  registry: BuildingLayerRegistry = defaultBuildingLayerRegistry
): void {
  registry.register(def);
}

export function resolveBuildingLayers(
  ids: string[],
  registry: BuildingLayerRegistry = defaultBuildingLayerRegistry
): BuildingLayerDefinition[] {
  const resolved: BuildingLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown building layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
