const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two geographic points, in meters. */
export function haversineDistanceMeters(
  lngA: number,
  latA: number,
  lngB: number,
  latB: number
): number {
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const latARad = toRadians(latA);
  const latBRad = toRadians(latB);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latARad) * Math.cos(latBRad) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}
