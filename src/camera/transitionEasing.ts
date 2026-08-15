import type { CameraPathFamily } from "../types/cameraTransition";
import { easeInOutCubic } from "./easing";

/** GSAP ease strings for path-family playback (internal to `src/camera`). */
export const TRANSITION_EASE_BY_PATH_FAMILY: Record<CameraPathFamily, string> = {
  "local-glide": "power2.inOut",
  "orbit-reveal": "power3.inOut",
  "departure-arrival-arc": "power4.inOut"
};

export function getTransitionEaseForPathFamily(pathFamily: CameraPathFamily): string {
  return TRANSITION_EASE_BY_PATH_FAMILY[pathFamily];
}

/** Fallback easing when GSAP is unavailable (legacy rAF playback). */
export function applyLegacyTransitionEasing(linearProgress: number): number {
  return easeInOutCubic(linearProgress);
}
