import type { CameraState } from "../types/camera";
import {
  sampleDepartureArrivalArcCameraState,
  sampleLocalGlideCameraState,
  sampleOrbitRevealCameraState,
  selectPathFamily
} from "./paths";
import type { CameraPathFamily } from "./paths";

/** Sample canonical camera state along a solved transition path. */
export function sampleTransitionCameraState(
  from: CameraState,
  to: CameraState,
  progress: number
): CameraState {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const pathFamily: CameraPathFamily = selectPathFamily(from, to);

  if (pathFamily === "local-glide") {
    return sampleLocalGlideCameraState(from, to, clampedProgress);
  }

  if (pathFamily === "orbit-reveal") {
    return sampleOrbitRevealCameraState(from, to, clampedProgress);
  }

  return sampleDepartureArrivalArcCameraState(from, to, clampedProgress);
}

export { selectPathFamily };
