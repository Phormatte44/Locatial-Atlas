import { lerp } from "../easing";
import { interpolateGeodesic } from "../geodesicInterpolation";
import { completeCameraSample } from "./completeSample";
import type { CameraPathSampler } from "./types";

export const STRAIGHT_DURATION_MS = 1_200;

/** Geodesic A→B with no altitude flourish. See `linear.md`. Manual-only — not auto-selected. */
export const sampleStraightCameraState: CameraPathSampler = (from, to, progress) => {
  const position = interpolateGeodesic(from.lng, from.lat, to.lng, to.lat, progress);

  return completeCameraSample(
    {
      lng: position.lng,
      lat: position.lat,
      altitudeMeters: lerp(from.altitudeMeters, to.altitudeMeters, progress),
      headingDegrees: lerp(from.headingDegrees, to.headingDegrees, progress),
      pitchDegrees: lerp(from.pitchDegrees, to.pitchDegrees, progress)
    },
    from,
    to,
    progress
  );
};
