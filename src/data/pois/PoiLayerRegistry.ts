import type { PoiLayerDefinition } from "../../types/poiLayer";

export class PoiLayerRegistry {
  private readonly layers: Map<string, PoiLayerDefinition>;

  constructor(layers: PoiLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): PoiLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): PoiLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: PoiLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("POI layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("POI layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("POI layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("POI layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultPoiLayerRegistry = new PoiLayerRegistry();
