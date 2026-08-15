import type { Tileset3DLayerDefinition } from "../../types/tileset3DLayer";

export class Tileset3DLayerRegistry {
  private readonly layers: Map<string, Tileset3DLayerDefinition>;

  constructor(layers: Tileset3DLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): Tileset3DLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): Tileset3DLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: Tileset3DLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("3D Tiles layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("3D Tiles layer label is required");
    }

    if (!def.tilesetUrl.trim()) {
      throw new Error("3D Tiles layer requires tilesetUrl");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultTileset3DLayerRegistry = new Tileset3DLayerRegistry();
