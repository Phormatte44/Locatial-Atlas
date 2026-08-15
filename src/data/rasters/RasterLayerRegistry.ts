import type { RasterLayerDefinition } from "../../types/rasterLayer";

export class RasterLayerRegistry {
  private readonly layers: Map<string, RasterLayerDefinition>;

  constructor(layers: RasterLayerDefinition[] = []) {
    this.layers = new Map(layers.map((layer) => [layer.id, layer]));
  }

  list(): RasterLayerDefinition[] {
    return [...this.layers.values()];
  }

  get(id: string): RasterLayerDefinition | undefined {
    return this.layers.get(id);
  }

  register(def: RasterLayerDefinition): void {
    if (!def.id.trim()) {
      throw new Error("Raster layer id is required");
    }

    if (!def.label.trim()) {
      throw new Error("Raster layer label is required");
    }

    if (def.source.type !== "raster") {
      throw new Error("Raster layer source must be raster");
    }

    const hasTiles = Array.isArray(def.source.tiles) && def.source.tiles.length > 0;
    const hasUrl = typeof def.source.url === "string" && def.source.url.trim().length > 0;

    if (!hasTiles && !hasUrl) {
      throw new Error("Raster layer requires source.tiles[] or source.url");
    }

    this.layers.set(def.id, def);
  }
}

export const defaultRasterLayerRegistry = new RasterLayerRegistry();
