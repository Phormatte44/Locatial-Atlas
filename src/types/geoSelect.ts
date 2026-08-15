import type { GeographicPoint, ScreenPoint } from "./projection";

/** Geographic selection reported by Atlas interaction. */
export interface GeoSelectEvent {
  featureId: string | null;
  screen: ScreenPoint | null;
  geo: GeographicPoint | null;
  /** Batch-table / EXT_structural_metadata properties when selecting a 3D Tiles feature. */
  tilesetFeatureProperties?: Record<string, unknown> | null;
}

export type GeoSelectListener = (event: GeoSelectEvent) => void;
