import type { GeographicBounds } from "./bounds";

export interface AtlasPlace {
  id: string;
  name: string;
  lng: number;
  lat: number;
  bounds?: GeographicBounds;
  geometryId?: string;
}
