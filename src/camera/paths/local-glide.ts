import { lerp } from "../easing";
import { interpolateGeodesic } from "../geodesicInterpolation";
import { completeCameraSample } from "./completeSample";
import type { CameraPathSampler } from "./types";

export const LOCAL_GLIDE_DURATION_MS = 1_200;

/** Neighborhood-scale geodesic glide. See `local-glide.md`. */
export const sampleLocalGlideCameraState: CameraPathSampler = (from, to, progress) => {
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
