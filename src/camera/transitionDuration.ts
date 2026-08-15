import type { CameraState } from "../types/camera";
import {
  DEPARTURE_ARRIVAL_ARC_DURATION_MS,
  LOCAL_GLIDE_DURATION_MS,
  ORBIT_REVEAL_DURATION_MS,
  selectPathFamily
} from "./paths";

/** Distance-aware transition timing for Atlas camera paths. */
export function computeTransitionDurationMs(from: CameraState, to: CameraState): number {
  const pathFamily = selectPathFamily(from, to);

  if (pathFamily === "local-glide") {
    return LOCAL_GLIDE_DURATION_MS;
  }

  if (pathFamily === "orbit-reveal") {
    return ORBIT_REVEAL_DURATION_MS;
  }

  return DEPARTURE_ARRIVAL_ARC_DURATION_MS;
}
