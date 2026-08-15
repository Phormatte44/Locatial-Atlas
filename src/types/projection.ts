/** Screen-space point in map container pixel coordinates. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** Geographic point projected from or into screen space. */
export interface GeographicPoint {
  lng: number;
  lat: number;
  altitudeMeters?: number;
}

export type ProjectGeoFn = (lng: number, lat: number, altitudeMeters?: number) => ScreenPoint | null;
