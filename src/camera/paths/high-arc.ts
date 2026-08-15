import { haversineDistanceMeters } from "../../world/distance";
import { lerp } from "../easing";
import { headingToward, interpolateGeodesic } from "../geodesicInterpolation";
import { completeCameraSample } from "./completeSample";
import type { CameraPathSampler } from "./types";

export const HIGH_ARC_DURATION_MS = 4_000;

function sampleHighArcAltitudeMeters(
  progress: number,
  fromAltitudeMeters: number,
  toAltitudeMeters: number,
  apexAltitudeMeters: number
): number {
  const baseAltitude = lerp(fromAltitudeMeters, toAltitudeMeters, progress);
  const arcLift = (apexAltitudeMeters - baseAltitude) * Math.sin(Math.PI * progress);
  return baseAltitude + Math.max(0, arcLift);
}

/** Geodesic A→B with a single mid-flight altitude peak. Manual-only — not auto-selected. */
export const sampleHighArcCameraState: CameraPathSampler = (from, to, progress) => {
  const distanceMeters = haversineDistanceMeters(from.lng, from.lat, to.lng, to.lat);
  const baseAltitude = Math.max(from.altitudeMeters, to.altitudeMeters);
  const apexAltitudeMeters = baseAltitude + Math.min(distanceMeters * 0.55, 12_000_000);
  const position = interpolateGeodesic(from.lng, from.lat, to.lng, to.lat, progress);
  const routeHeading = headingToward(from.lng, from.lat, to.lng, to.lat);

  return completeCameraSample(
    {
      lng: position.lng,
      lat: position.lat,
      altitudeMeters: sampleHighArcAltitudeMeters(
        progress,
        from.altitudeMeters,
        to.altitudeMeters,
        apexAltitudeMeters
      ),
      headingDegrees: lerp(from.headingDegrees, routeHeading, progress),
      pitchDegrees: lerp(from.pitchDegrees, to.pitchDegrees, progress)
    },
    from,
    to,
    progress
  );
};
