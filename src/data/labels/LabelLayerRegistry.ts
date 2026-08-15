import type { LabelLayerDefinition } from "../../types/labelLayer";

export class LabelLayerRegistry {
  private readonly layers: Map<string, LabelLayerDefinition>;

  constructor(layers: LabelLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): LabelLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): LabelLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: LabelLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Label layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Label layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("Label layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("Label layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultLabelLayerRegistry = new LabelLayerRegistry();
