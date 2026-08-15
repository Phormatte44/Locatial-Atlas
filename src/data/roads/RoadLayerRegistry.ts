import type { RoadLayerDefinition } from "../../types/roadLayer";

export class RoadLayerRegistry {
  private readonly layers: Map<string, RoadLayerDefinition>;

  constructor(layers: RoadLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): RoadLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): RoadLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: RoadLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Road layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Road layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("Road layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("Road layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultRoadLayerRegistry = new RoadLayerRegistry();
