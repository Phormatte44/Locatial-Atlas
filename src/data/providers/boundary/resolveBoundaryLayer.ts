import {
  BoundaryLayerRegistry,
  defaultBoundaryLayerRegistry
} from "../../boundaries/BoundaryLayerRegistry";
import type { BoundaryLayerDefinition } from "../../../types/boundaryLayer";

export function listAvailableBoundaryLayers(
  registry: BoundaryLayerRegistry = defaultBoundaryLayerRegistry
): BoundaryLayerDefinition[] {
  return registry.list();
}

export function getBoundaryLayerDefinition(
  id: string,
  registry: BoundaryLayerRegistry = defaultBoundaryLayerRegistry
): BoundaryLayerDefinition | undefined {
  return registry.get(id);
}

export function registerBoundaryLayer(
  def: BoundaryLayerDefinition,
  registry: BoundaryLayerRegistry = defaultBoundaryLayerRegistry
): void {
  registry.register(def);
}

export function resolveBoundaryLayers(
  ids: string[],
  registry: BoundaryLayerRegistry = defaultBoundaryLayerRegistry
): BoundaryLayerDefinition[] {
  const resolved: BoundaryLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown boundary layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
