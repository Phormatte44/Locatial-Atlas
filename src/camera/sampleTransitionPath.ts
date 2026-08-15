import { haversineDistanceMeters } from "../world/distance";
import type { CameraState } from "../types/camera";
import { lerp } from "./easing";
import {
  sampleDepartureArrivalAltitudeMeters,
  sampleDepartureArrivalHeadingDegrees,
  sampleDepartureArrivalPitchDegrees
} from "./departureArrivalArc";
import {
  headingToward,
  interpolateGeodesic,
  interpolateOrbitReveal
} from "./geodesicInterpolation";
import type { CameraPathFamily } from "../types/cameraTransition";
import {
  computeApexAltitudeMeters,
  selectPathFamily
} from "./pathFamilies";

function samplePosition(
  progress: number,
  from: CameraState,
  to: CameraState,
  pathFamily: CameraPathFamily,
  distanceMeters: number
): { lng: number; lat: number } {
  if (pathFamily === "orbit-reveal") {
    return interpolateOrbitReveal(from.lng, from.lat, to.lng, to.lat, progress, distanceMeters);
  }

  return interpolateGeodesic(from.lng, from.lat, to.lng, to.lat, progress);
}

function sampleAltitudeMeters(
  progress: number,
  from: CameraState,
  to: CameraState,
  pathFamily: CameraPathFamily,
  apexAltitudeMeters: number
): number {
  if (pathFamily === "local-glide") {
    return lerp(from.altitudeMeters, to.altitudeMeters, progress);
  }

  if (pathFamily === "orbit-reveal") {
    const base = lerp(from.altitudeMeters, to.altitudeMeters, progress);
    const lift = Math.max(from.altitudeMeters, to.altitudeMeters) * 0.12 * Math.sin(Math.PI * progress);
    return base + lift;
  }

  return sampleDepartureArrivalAltitudeMeters(progress, from, to, apexAltitudeMeters);
}

function samplePitchDegrees(
  progress: number,
  from: CameraState,
  to: CameraState,
  pathFamily: CameraPathFamily
): number {
  if (pathFamily === "local-glide" || pathFamily === "orbit-reveal") {
    return lerp(from.pitchDegrees, to.pitchDegrees, progress);
  }

  return sampleDepartureArrivalPitchDegrees(progress, from, to);
}

function sampleHeadingDegrees(
  progress: number,
  from: CameraState,
  to: CameraState,
  pathFamily: CameraPathFamily
): number {
  const routeHeading = headingToward(from.lng, from.lat, to.lng, to.lat);

  if (pathFamily === "local-glide") {
    return lerp(from.headingDegrees, to.headingDegrees, progress);
  }

  if (pathFamily === "orbit-reveal") {
    const orbitSweep = Math.sin(Math.PI * progress) * 40;
    if (progress > 0.85) {
      return lerp(routeHeading + orbitSweep, to.headingDegrees, (progress - 0.85) / 0.15);
    }

    return routeHeading + orbitSweep;
  }

  return sampleDepartureArrivalHeadingDegrees(progress, from, to);
}

/** Sample canonical camera state along a solved transition path. */
export function sampleTransitionCameraState(
  from: CameraState,
  to: CameraState,
  progress: number
): CameraState {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const pathFamily = selectPathFamily(from, to);
  const distanceMeters = haversineDistanceMeters(from.lng, from.lat, to.lng, to.lat);
  const apexAltitudeMeters = computeApexAltitudeMeters(from, to, distanceMeters);
  const position = samplePosition(clampedProgress, from, to, pathFamily, distanceMeters);

  return {
    lng: position.lng,
    lat: position.lat,
    altitudeMeters: sampleAltitudeMeters(
      clampedProgress,
      from,
      to,
      pathFamily,
      apexAltitudeMeters
    ),
    headingDegrees: sampleHeadingDegrees(clampedProgress, from, to, pathFamily),
    pitchDegrees: samplePitchDegrees(clampedProgress, from, to, pathFamily),
    rollDegrees: lerp(from.rollDegrees, to.rollDegrees, clampedProgress),
    fovDegrees: lerp(from.fovDegrees, to.fovDegrees, clampedProgress),
    targetLng: to.targetLng ?? to.lng,
    targetLat: to.targetLat ?? to.lat,
    targetAltitudeMeters: to.targetAltitudeMeters ?? 0,
    transitionProgress: clampedProgress
  };
}

export { selectPathFamily };
