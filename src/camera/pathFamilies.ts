import { haversineDistanceMeters } from "../world/distance";
import type { CameraState } from "../types/camera";
import type { CameraPathFamily } from "../types/cameraTransition";

export type { CameraPathFamily };

const LOCAL_GLIDE_THRESHOLD_METERS = 3_000;
const ORBIT_REVEAL_THRESHOLD_METERS = 500_000;

export function selectPathFamily(from: CameraState, to: CameraState): CameraPathFamily {
  const distanceMeters = haversineDistanceMeters(from.lng, from.lat, to.lng, to.lat);

  if (distanceMeters < LOCAL_GLIDE_THRESHOLD_METERS) {
    return "local-glide";
  }

  if (distanceMeters < ORBIT_REVEAL_THRESHOLD_METERS) {
    return "orbit-reveal";
  }

  return "departure-arrival-arc";
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

export { LOCAL_GLIDE_THRESHOLD_METERS, ORBIT_REVEAL_THRESHOLD_METERS };
