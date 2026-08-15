/** Geographic marker rendered in Atlas world space (e.g. via Three.js overlay). */
export interface WorldMarker {
  id: string;
  lng: number;
  lat: number;
  altitudeMeters?: number;
}
