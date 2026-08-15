import type { BoundaryLayerDefinition } from "../../types/boundaryLayer";

export class BoundaryLayerRegistry {
  private readonly layers: Map<string, BoundaryLayerDefinition>;

  constructor(layers: BoundaryLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): BoundaryLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): BoundaryLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: BoundaryLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Boundary layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Boundary layer label is required");
    }

    if (def.source.type !== "geojson") {
      throw new Error("Boundary layer source must be geojson");
    }

    if (typeof def.source.data === "string" && !def.source.data.trim()) {
      throw new Error("Boundary layer geojson url is required");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultBoundaryLayerRegistry = new BoundaryLayerRegistry();
