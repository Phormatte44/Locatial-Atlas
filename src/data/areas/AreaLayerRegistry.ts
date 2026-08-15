import type { AreaLayerDefinition } from "../../types/areaLayer";

export class AreaLayerRegistry {
  private readonly layers: Map<string, AreaLayerDefinition>;

  constructor(layers: AreaLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): AreaLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): AreaLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: AreaLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Area layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Area layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("Area layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("Area layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultAreaLayerRegistry = new AreaLayerRegistry();
