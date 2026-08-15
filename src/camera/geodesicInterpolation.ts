import { bearing, destination, distance, point } from "@turf/turf";

export function interpolateGeodesic(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  progress: number
): { lng: number; lat: number } {
  if (progress <= 0) {
    return { lng: fromLng, lat: fromLat };
  }

  if (progress >= 1) {
    return { lng: toLng, lat: toLat };
  }

  const from = point([fromLng, fromLat]);
  const to = point([toLng, toLat]);
  const routeBearing = bearing(from, to);
  const routeDistanceKm = distance(from, to, { units: "kilometers" });
  const alongRoute = destination(from, routeDistanceKm * progress, routeBearing, {
    units: "kilometers"
  });

  return {
    lng: alongRoute.geometry.coordinates[0] ?? toLng,
    lat: alongRoute.geometry.coordinates[1] ?? toLat
  };
}

export function headingToward(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): number {
  return bearing(point([fromLng, fromLat]), point([toLng, toLat]));
}

/** Add a lateral arc offset for orbit-reveal transitions. */
export function interpolateOrbitReveal(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  progress: number,
  distanceMeters: number
): { lng: number; lat: number } {
  const midpoint = interpolateGeodesic(fromLng, fromLat, toLng, toLat, progress);
  const routeHeading = headingToward(fromLng, fromLat, toLng, toLat);
  const orbitStrength = Math.sin(Math.PI * progress);
  const maxOffsetMeters = Math.min(Math.max(distanceMeters * 0.18, 2_000), 90_000);
  const offsetKm = (maxOffsetMeters * orbitStrength) / 1_000;
  const offsetPoint = destination(
    point([midpoint.lng, midpoint.lat]),
    offsetKm,
    routeHeading + 90,
    { units: "kilometers" }
  );

  return {
    lng: offsetPoint.geometry.coordinates[0] ?? midpoint.lng,
    lat: offsetPoint.geometry.coordinates[1] ?? midpoint.lat
  };
}
