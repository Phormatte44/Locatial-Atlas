const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;

/** Approximate MapLibre zoom from camera altitude above the ground. */
export function altitudeToZoom(altitudeMeters: number, lat: number): number {
  const clampedAltitude = Math.max(altitudeMeters, 1);
  const latRadians = (lat * Math.PI) / 180;
  const metersPerPixel =
    (clampedAltitude * 2) / 512;
  const zoom = Math.log2(
    (EARTH_CIRCUMFERENCE_METERS * Math.cos(latRadians)) / (metersPerPixel * 512)
  );
  return Math.max(0, Math.min(22, zoom));
}

/** Approximate camera altitude from MapLibre zoom. */
export function zoomToAltitude(zoom: number, lat: number): number {
  const latRadians = (lat * Math.PI) / 180;
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_METERS * Math.cos(latRadians)) / Math.pow(2, zoom) / 512;
  return metersPerPixel * 256;
}
