import { haversineDistanceMeters } from "../../world/distance";
import type { CameraState } from "../../types/camera";
import { easeInOutCubic, lerp } from "../easing";
import { headingToward, interpolateGeodesic } from "../geodesicInterpolation";
import { completeCameraSample } from "./completeSample";
import type { CameraPathSampler } from "./types";

/** Normalized progress where departure climb finishes. */
export const DEPARTURE_PHASE_END = 0.22;

/** Normalized progress where arrival descent begins. */
export const ARRIVAL_PHASE_START = 0.78;

export const DEPARTURE_ARRIVAL_ARC_DURATION_MS = 5_500;

const CRUISE_PITCH_DEGREES = 32;

function phaseProgress(progress: number, start: number, end: number): number {
  if (progress <= start) {
    return 0;
  }

  if (progress >= end) {
    return 1;
  }

  return (progress - start) / (end - start);
}

function sampleDepartureAltitude(
  progress: number,
  fromAltitudeMeters: number,
  apexAltitudeMeters: number
): number {
  const departureProgress = phaseProgress(progress, 0, DEPARTURE_PHASE_END);
  return lerp(fromAltitudeMeters, apexAltitudeMeters, easeInOutCubic(departureProgress));
}

function sampleArrivalAltitude(
  progress: number,
  apexAltitudeMeters: number,
  toAltitudeMeters: number
): number {
  const arrivalProgress = phaseProgress(progress, ARRIVAL_PHASE_START, 1);
  return lerp(apexAltitudeMeters, toAltitudeMeters, easeInOutCubic(arrivalProgress));
}

export function computeApexAltitudeMeters(
  from: CameraState,
  to: CameraState,
  distanceMeters: number
): number {
  const baseAltitude = Math.max(from.altitudeMeters, to.altitudeMeters);
  const distanceLift = Math.min(distanceMeters * 0.35, 8_000_000);
  return baseAltitude + distanceLift;
}

export function sampleDepartureArrivalAltitudeMeters(
  progress: number,
  from: CameraState,
  to: CameraState,
  apexAltitudeMeters: number
): number {
  if (progress < DEPARTURE_PHASE_END) {
    return sampleDepartureAltitude(progress, from.altitudeMeters, apexAltitudeMeters);
  }

  if (progress > ARRIVAL_PHASE_START) {
    return sampleArrivalAltitude(progress, apexAltitudeMeters, to.altitudeMeters);
  }

  return apexAltitudeMeters;
}

export function sampleDepartureArrivalPitchDegrees(
  progress: number,
  from: CameraState,
  to: CameraState
): number {
  if (progress < DEPARTURE_PHASE_END) {
    const departureProgress = phaseProgress(progress, 0, DEPARTURE_PHASE_END);
    return lerp(from.pitchDegrees, CRUISE_PITCH_DEGREES, easeInOutCubic(departureProgress));
  }

  if (progress > ARRIVAL_PHASE_START) {
    const arrivalProgress = phaseProgress(progress, ARRIVAL_PHASE_START, 1);
    return lerp(CRUISE_PITCH_DEGREES, to.pitchDegrees, easeInOutCubic(arrivalProgress));
  }

  return CRUISE_PITCH_DEGREES;
}

export function sampleDepartureArrivalHeadingDegrees(
  progress: number,
  from: CameraState,
  to: CameraState
): number {
  const routeHeading = headingToward(from.lng, from.lat, to.lng, to.lat);

  if (progress < DEPARTURE_PHASE_END) {
    const departureProgress = phaseProgress(progress, 0, DEPARTURE_PHASE_END);
    return lerp(from.headingDegrees, routeHeading, easeInOutCubic(departureProgress));
  }

  if (progress > ARRIVAL_PHASE_START) {
    const arrivalProgress = phaseProgress(progress, ARRIVAL_PHASE_START, 1);
    return lerp(routeHeading, to.headingDegrees, easeInOutCubic(arrivalProgress));
  }

  return routeHeading;
}

/** Long-range climb, cruise, and descent. See `departure-arrival-arc.md`. */
export const sampleDepartureArrivalArcCameraState: CameraPathSampler = (from, to, progress) => {
  const distanceMeters = haversineDistanceMeters(from.lng, from.lat, to.lng, to.lat);
  const apexAltitudeMeters = computeApexAltitudeMeters(from, to, distanceMeters);
  const position = interpolateGeodesic(from.lng, from.lat, to.lng, to.lat, progress);

  return completeCameraSample(
    {
      lng: position.lng,
      lat: position.lat,
      altitudeMeters: sampleDepartureArrivalAltitudeMeters(
        progress,
        from,
        to,
        apexAltitudeMeters
      ),
      headingDegrees: sampleDepartureArrivalHeadingDegrees(progress, from, to),
      pitchDegrees: sampleDepartureArrivalPitchDegrees(progress, from, to)
    },
    from,
    to,
    progress
  );
};
