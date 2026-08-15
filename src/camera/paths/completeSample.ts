import type { CameraState } from "../../types/camera";
import { lerp } from "../easing";

/** Shared arrival fields every path family must emit. */
export function completeCameraSample(
  pose: {
    lng: number;
    lat: number;
    altitudeMeters: number;
    headingDegrees: number;
    pitchDegrees: number;
  },
  from: CameraState,
  to: CameraState,
  progress: number
): CameraState {
  return {
    lng: pose.lng,
    lat: pose.lat,
    altitudeMeters: pose.altitudeMeters,
    headingDegrees: pose.headingDegrees,
    pitchDegrees: pose.pitchDegrees,
    rollDegrees: lerp(from.rollDegrees, to.rollDegrees, progress),
    fovDegrees: lerp(from.fovDegrees, to.fovDegrees, progress),
    targetLng: to.targetLng ?? to.lng,
    targetLat: to.targetLat ?? to.lat,
    targetAltitudeMeters: to.targetAltitudeMeters ?? 0,
    transitionProgress: progress
  };
}
