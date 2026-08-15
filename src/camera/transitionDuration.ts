import type { CameraState } from "../types/camera";
import { selectPathFamily } from "./pathFamilies";

/** Distance-aware transition timing for Atlas camera paths. */
export function computeTransitionDurationMs(from: CameraState, to: CameraState): number {
  const pathFamily = selectPathFamily(from, to);

  if (pathFamily === "local-glide") {
    return 1_200;
  }

  if (pathFamily === "orbit-reveal") {
    return 3_000;
  }

  return 5_500;
}
