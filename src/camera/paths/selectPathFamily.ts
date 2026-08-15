import { haversineDistanceMeters } from "../../world/distance";
import type { CameraState } from "../../types/camera";
import type { CameraPathFamily } from "../../types/cameraTransition";

export const LOCAL_GLIDE_THRESHOLD_METERS = 3_000;
export const ORBIT_REVEAL_THRESHOLD_METERS = 500_000;

/** Choose a live path family from horizontal geographic distance. */
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
