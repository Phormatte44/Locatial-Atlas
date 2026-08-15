import { bbox, destination, polygon } from "@turf/turf";
import type { GeographicBounds } from "../../src";

const AREA_RADIUS_KM = 12;

function cityAreaRing(lng: number, lat: number, radiusKm: number, sides: number): Array<[number, number]> {
  const center = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat]
    }
  };

  return Array.from({ length: sides }, (_, index) => {
    const bearing = (360 / sides) * index;
    const point = destination(center, radiusKm, bearing, { units: "kilometers" });
    return point.geometry.coordinates as [number, number];
  });
}

/** Approximate metro bounds matching the Lab markup polygons. */
export function metroBoundsForPlace(
  lng: number,
  lat: number,
  sides: number
): GeographicBounds {
  const ring = cityAreaRing(lng, lat, AREA_RADIUS_KM, sides);
  const [west, south, east, north] = bbox(
    polygon([[...ring, ring[0]].map(([ringLng, ringLat]) => [ringLng, ringLat])])
  );

  return [west, south, east, north];
}
