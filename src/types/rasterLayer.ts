import type { GeographicBounds } from "./bounds";

/** Semantic role of a registered raster imagery layer. */
export type RasterSemanticType = "satellite" | "hillshade" | "thematic" | "custom";

/** Tile URL source for a raster imagery layer. */
export interface RasterTileSource {
  type: "raster";
  /** XYZ tile URL template(s). Use `{z}/{x}/{y}` placeholders. */
  tiles?: string[];
  /** TileJSON manifest URL (alternative to `tiles[]`). */
  url?: string;
  tileSize?: number;
}

/** Optional paint tokens for raster imagery layers. */
export interface RasterStyleTokens {
  opacity?: number;
  brightnessMin?: number;
  brightnessMax?: number;
  contrast?: number;
}

/** Provider-agnostic raster imagery layer descriptor exposed by Atlas. */
export interface RasterLayerDefinition {
  id: string;
  label: string;
  semanticType: RasterSemanticType;
  source: RasterTileSource;
  style?: RasterStyleTokens;
  minzoom?: number;
  maxzoom?: number;
  /** Geographic extent [west, south, east, north] in degrees. */
  bounds?: GeographicBounds;
  attribution?: string;
}
