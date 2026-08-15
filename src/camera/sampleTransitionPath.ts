import type { CameraState } from "../types/camera";
import {
  sampleDepartureArrivalArcCameraState,
  sampleLocalGlideCameraState,
  sampleOrbitRevealCameraState,
  selectPathFamily
} from "./paths";
import type { CameraPathFamily } from "./paths";
import { sampleHighArcCameraState } from "./paths/high-arc";
import { sampleStraightCameraState } from "./paths/straight";

/** Sample canonical camera state along a solved transition path. */
export function sampleTransitionCameraState(
  from: CameraState,
  to: CameraState,
  progress: number,
  pathFamily?: CameraPathFamily
): CameraState {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const family = pathFamily ?? selectPathFamily(from, to);

  if (family === "local-glide") {
    return sampleLocalGlideCameraState(from, to, clampedProgress);
  }

  if (family === "orbit-reveal") {
    return sampleOrbitRevealCameraState(from, to, clampedProgress);
  }

  if (family === "straight") {
    return sampleStraightCameraState(from, to, clampedProgress);
  }

  if (family === "high-arc") {
    return sampleHighArcCameraState(from, to, clampedProgress);
  }

  return sampleDepartureArrivalArcCameraState(from, to, clampedProgress);
}

export { selectPathFamily };
