import type { WorldCircleMarkup } from "../types/worldMarkup";

export function circleMarkupFromCenter(
  id: string,
  lng: number,
  lat: number,
  radiusMeters: number,
  altitudeMeters?: number
): WorldCircleMarkup {
  return {
    kind: "circle",
    id,
    lng,
    lat,
    radiusMeters,
    altitudeMeters
  };
}
