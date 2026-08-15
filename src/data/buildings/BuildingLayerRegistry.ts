import type { BuildingLayerDefinition } from "../../types/buildingLayer";

export class BuildingLayerRegistry {
  private readonly layers: Map<string, BuildingLayerDefinition>;

  constructor(layers: BuildingLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): BuildingLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): BuildingLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: BuildingLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Building layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Building layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("Building layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("Building layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultBuildingLayerRegistry = new BuildingLayerRegistry();
