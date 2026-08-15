import { haversineDistanceMeters } from "../../world/distance";
import { lerp } from "../easing";
import { headingToward, interpolateOrbitReveal } from "../geodesicInterpolation";
import { completeCameraSample } from "./completeSample";
import type { CameraPathSampler } from "./types";

export const ORBIT_REVEAL_DURATION_MS = 3_000;

/** Mid-range lateral reveal. See `orbit-reveal.md`. */
export const sampleOrbitRevealCameraState: CameraPathSampler = (from, to, progress) => {
  const distanceMeters = haversineDistanceMeters(from.lng, from.lat, to.lng, to.lat);
  const position = interpolateOrbitReveal(
    from.lng,
    from.lat,
    to.lng,
    to.lat,
    progress,
    distanceMeters
  );
  const baseAltitude = lerp(from.altitudeMeters, to.altitudeMeters, progress);
  const lift =
    Math.max(from.altitudeMeters, to.altitudeMeters) * 0.12 * Math.sin(Math.PI * progress);
  const routeHeading = headingToward(from.lng, from.lat, to.lng, to.lat);
  const orbitSweep = Math.sin(Math.PI * progress) * 40;
  const headingDegrees =
    progress > 0.85
      ? lerp(routeHeading + orbitSweep, to.headingDegrees, (progress - 0.85) / 0.15)
      : routeHeading + orbitSweep;

  return completeCameraSample(
    {
      lng: position.lng,
      lat: position.lat,
      altitudeMeters: baseAltitude + lift,
      headingDegrees,
      pitchDegrees: lerp(from.pitchDegrees, to.pitchDegrees, progress)
    },
    from,
    to,
    progress
  );
};
