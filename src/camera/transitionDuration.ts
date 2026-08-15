import type { CameraState } from "../types/camera";
import type { CameraPathFamily } from "../types/cameraTransition";
import {
  DEPARTURE_ARRIVAL_ARC_DURATION_MS,
  HIGH_ARC_DURATION_MS,
  LOCAL_GLIDE_DURATION_MS,
  ORBIT_REVEAL_DURATION_MS,
  STRAIGHT_DURATION_MS,
  selectPathFamily
} from "./paths";

/** Distance-aware transition timing for Atlas camera paths. */
export function computeTransitionDurationMs(
  from: CameraState,
  to: CameraState,
  pathFamily?: CameraPathFamily
): number {
  const family = pathFamily ?? selectPathFamily(from, to);

  if (family === "local-glide") {
    return LOCAL_GLIDE_DURATION_MS;
  }

  if (family === "orbit-reveal") {
    return ORBIT_REVEAL_DURATION_MS;
  }

  if (family === "straight") {
    return STRAIGHT_DURATION_MS;
  }

  if (family === "high-arc") {
    return HIGH_ARC_DURATION_MS;
  }

  return DEPARTURE_ARRIVAL_ARC_DURATION_MS;
}
