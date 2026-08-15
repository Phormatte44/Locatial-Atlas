import type { CameraPathFamily } from "../types/cameraTransition";

/** GSAP ease strings for path-family playback (internal to `src/camera`). */
export const TRANSITION_EASE_BY_PATH_FAMILY: Record<CameraPathFamily, string> = {
  "local-glide": "power2.inOut",
  "orbit-reveal": "power3.inOut",
  "departure-arrival-arc": "power4.inOut"
};

export function getTransitionEaseForPathFamily(pathFamily: CameraPathFamily): string {
  return TRANSITION_EASE_BY_PATH_FAMILY[pathFamily];
}

/** Polynomial in-out easing matching GSAP `powerN.inOut` shape for legacy rAF playback. */
export function easeInOutPower(linearProgress: number, power: number): number {
  if (linearProgress <= 0) {
    return 0;
  }

  if (linearProgress >= 1) {
    return 1;
  }

  if (linearProgress < 0.5) {
    return Math.pow(2 * linearProgress, power) / 2;
  }

  return 1 - Math.pow(-2 * linearProgress + 2, power) / 2;
}

const LEGACY_EASE_POWER_BY_PATH_FAMILY: Record<CameraPathFamily, number> = {
  "local-glide": 2,
  "orbit-reveal": 3,
  "departure-arrival-arc": 4
};

/** Fallback easing when GSAP is unavailable (legacy rAF playback). */
export function applyLegacyTransitionEasing(
  linearProgress: number,
  pathFamily: CameraPathFamily
): number {
  const power = LEGACY_EASE_POWER_BY_PATH_FAMILY[pathFamily];
  return easeInOutPower(linearProgress, power);
}
