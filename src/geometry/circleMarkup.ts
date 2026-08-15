import { destination } from "@turf/turf";
import type { GeoRing, WorldCircleMarkup } from "../types/worldMarkup";

/** Minimum ring segments for geodesic circles (smooth at city scale). */
export const MIN_CIRCLE_SEGMENTS = 64;

/** Performance cap for geodesic circle rings (uniform sampling around center). */
export const MAX_CIRCLE_SEGMENTS = 128;

/** Choose segment count from radius; capped between {@link MIN_CIRCLE_SEGMENTS} and {@link MAX_CIRCLE_SEGMENTS}. */
export function resolveCircleSegmentCount(radiusMeters: number): number {
  const estimated = Math.ceil((2 * Math.PI * radiusMeters) / 50);
  return Math.min(MAX_CIRCLE_SEGMENTS, Math.max(MIN_CIRCLE_SEGMENTS, estimated));
}

/** Sample a closed geodesic ring at `radiusMeters` from center using turf destination. */
export function sampleGeodesicCircleRing(
  lng: number,
  lat: number,
  radiusMeters: number,
  segmentCount = resolveCircleSegmentCount(radiusMeters)
): GeoRing {
  const center = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat] as [number, number]
    }
  };

  return Array.from({ length: segmentCount }, (_, index) => {
    const bearing = (360 / segmentCount) * index;
    const point = destination(center, radiusMeters / 1_000, bearing, { units: "kilometers" });
    return point.geometry.coordinates as [number, number];
  });
}

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
