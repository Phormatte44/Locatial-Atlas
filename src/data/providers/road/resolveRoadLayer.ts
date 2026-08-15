import {
  RoadLayerRegistry,
  defaultRoadLayerRegistry
} from "../../roads/RoadLayerRegistry";
import type { RoadLayerDefinition } from "../../../types/roadLayer";

export function listAvailableRoadLayers(
  registry: RoadLayerRegistry = defaultRoadLayerRegistry
): RoadLayerDefinition[] {
  return registry.list();
}

export function getRoadLayerDefinition(
  id: string,
  registry: RoadLayerRegistry = defaultRoadLayerRegistry
): RoadLayerDefinition | undefined {
  return registry.get(id);
}

export function registerRoadLayer(
  def: RoadLayerDefinition,
  registry: RoadLayerRegistry = defaultRoadLayerRegistry
): void {
  registry.register(def);
}

export function resolveRoadLayers(
  ids: string[],
  registry: RoadLayerRegistry = defaultRoadLayerRegistry
): RoadLayerDefinition[] {
  const resolved: RoadLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown road layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
