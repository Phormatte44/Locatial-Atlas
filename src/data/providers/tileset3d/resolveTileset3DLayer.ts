import {
  Tileset3DLayerRegistry,
  defaultTileset3DLayerRegistry
} from "../../tilesets3d/Tileset3DLayerRegistry";
import type { Tileset3DLayerDefinition } from "../../../types/tileset3DLayer";

export function listAvailableTileset3DLayers(
  registry: Tileset3DLayerRegistry = defaultTileset3DLayerRegistry
): Tileset3DLayerDefinition[] {
  return registry.list();
}

export function getTileset3DLayerDefinition(
  id: string,
  registry: Tileset3DLayerRegistry = defaultTileset3DLayerRegistry
): Tileset3DLayerDefinition | undefined {
  return registry.get(id);
}

export function registerTileset3DLayer(
  def: Tileset3DLayerDefinition,
  registry: Tileset3DLayerRegistry = defaultTileset3DLayerRegistry
): void {
  registry.register(def);
}

export function resolveTileset3DLayers(
  ids: string[],
  registry: Tileset3DLayerRegistry = defaultTileset3DLayerRegistry
): Tileset3DLayerDefinition[] {
  const resolved: Tileset3DLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown 3D Tiles layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
