import type { GeographicPoint, ScreenPoint } from "./projection";

/** Geographic hover state reported by Atlas interaction. */
export interface GeoHoverEvent {
  featureId: string | null;
  screen: ScreenPoint | null;
  geo: GeographicPoint | null;
  /** Batch-table / EXT_structural_metadata properties when hovering a 3D Tiles feature. */
  tilesetFeatureProperties?: Record<string, unknown> | null;
}

export type GeoHoverListener = (event: GeoHoverEvent) => void;
