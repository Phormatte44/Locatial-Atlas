import type { GeographicPoint, ScreenPoint } from "./projection";

/** Geographic hover state reported by Atlas interaction. */
export interface GeoHoverEvent {
  featureId: string | null;
  screen: ScreenPoint | null;
  geo: GeographicPoint | null;
}

export type GeoHoverListener = (event: GeoHoverEvent) => void;
