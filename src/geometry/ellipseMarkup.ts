import { destination } from "@turf/turf";
import type { GeoRing, WorldEllipseMarkup } from "../types/worldMarkup";
import { MAX_CIRCLE_SEGMENTS, MIN_CIRCLE_SEGMENTS } from "./circleMarkup";

/** Minimum ring segments for geodesic ellipses (smooth at city scale). */
export const MIN_ELLIPSE_SEGMENTS = MIN_CIRCLE_SEGMENTS;

/** Performance cap for geodesic ellipse rings (uniform sampling around center). */
export const MAX_ELLIPSE_SEGMENTS = MAX_CIRCLE_SEGMENTS;

function approximateEllipsePerimeter(radiusXMeters: number, radiusYMeters: number): number {
  const a = radiusXMeters;
  const b = radiusYMeters;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Choose segment count from axis radii; capped between {@link MIN_ELLIPSE_SEGMENTS} and {@link MAX_ELLIPSE_SEGMENTS}. */
export function resolveEllipseSegmentCount(radiusXMeters: number, radiusYMeters: number): number {
  const estimated = Math.ceil(approximateEllipsePerimeter(radiusXMeters, radiusYMeters) / 50);
  return Math.min(MAX_ELLIPSE_SEGMENTS, Math.max(MIN_ELLIPSE_SEGMENTS, estimated));
}

/** Sample a closed geodesic ellipse ring from center using turf destination. */
export function sampleGeodesicEllipseRing(
  lng: number,
  lat: number,
  radiusXMeters: number,
  radiusYMeters: number,
  bearingDegrees = 0,
  segmentCount = resolveEllipseSegmentCount(radiusXMeters, radiusYMeters)
): GeoRing {
  const center = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat] as [number, number]
    }
  };

  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const cosBearing = Math.cos(bearingRad);
  const sinBearing = Math.sin(bearingRad);

  return Array.from({ length: segmentCount }, (_, index) => {
    const theta = (2 * Math.PI * index) / segmentCount;
    const localEast = radiusXMeters * Math.cos(theta);
    const localNorth = radiusYMeters * Math.sin(theta);
    const eastMeters = localEast * cosBearing - localNorth * sinBearing;
    const northMeters = localEast * sinBearing + localNorth * cosBearing;
    const distanceKm = Math.hypot(eastMeters, northMeters) / 1_000;
    const azimuthDegrees = (Math.atan2(eastMeters, northMeters) * 180) / Math.PI;
    const point = destination(center, distanceKm, azimuthDegrees, { units: "kilometers" });
    return point.geometry.coordinates as [number, number];
  });
}

export function ellipseMarkupFromCenter(
  id: string,
  lng: number,
  lat: number,
  radiusXMeters: number,
  radiusYMeters: number,
  bearingDegrees = 0,
  altitudeMeters?: number
): WorldEllipseMarkup {
  return {
    kind: "ellipse",
    id,
    lng,
    lat,
    radiusXMeters,
    radiusYMeters,
    bearingDegrees,
    altitudeMeters
  };
}
