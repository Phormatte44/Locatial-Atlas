export interface AtlasPlace {
  id: string;
  name: string;
  lng: number;
  lat: number;
  bounds?: [number, number, number, number];
  geometryId?: string;
}
