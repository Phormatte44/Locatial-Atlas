import type { GeographicPoint, ScreenPoint } from "./projection";

/** Geographic selection reported by Atlas interaction. */
export interface GeoSelectEvent {
  featureId: string | null;
  screen: ScreenPoint | null;
  geo: GeographicPoint | null;
}

export type GeoSelectListener = (event: GeoSelectEvent) => void;
