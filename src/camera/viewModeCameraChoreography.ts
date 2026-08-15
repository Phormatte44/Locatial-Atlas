import type { CameraState } from "../types/camera";
import { lerp } from "./easing";

const MAP_MAX_PITCH = 85;
const MIN_ALTITUDE_METERS = 100;

/**
 * Globe projection exaggerates pitched horizon and compresses visible ground coverage at
 * the same numeric pitch/altitude. These scales derive settled map↔globe endpoints that
 * preserve editorial framing intent around the camera target.
 */
export const GLOBE_FRAMING_PITCH_SCALE = 0.72;
export const GLOBE_FRAMING_ALTITUDE_SCALE = 1.38;

export interface ViewModeCameraChoreoPlan {
  readonly startGlobeness: number;
  readonly targetGlobeness: number;
  readonly startPitchDegrees: number;
  readonly startAltitudeMeters: number;
  readonly endPitchDegrees: number;
  readonly endAltitudeMeters: number;
}

function clampPitch(pitchDegrees: number): number {
  return Math.max(0, Math.min(MAP_MAX_PITCH, pitchDegrees));
}

/**
 * Compute pitch/altitude endpoints for a globe↔map view-mode transition.
 *
 * Algorithm:
 * 1. Capture current pitch and altitude as the source-projection framing baseline.
 * 2. Entering globe (target globeness > start): scale pitch down and altitude up so the
 *    look-at target keeps similar screen coverage on the sphere.
 * 3. Exiting globe: apply the inverse scale to restore map-mode editorial pitch.
 * 4. During blend, interpolate pitch/altitude linearly in normalized globeness space.
 *    Globeness is already eased by `viewModeTransition.ts`; camera follows the same signal
 *    as F53 atmosphere interpolation.
 */
export function computeViewModeCameraChoreoPlan(
  camera: CameraState,
  startGlobeness: number,
  targetGlobeness: number
): ViewModeCameraChoreoPlan | null {
  if (Math.abs(targetGlobeness - startGlobeness) < 0.0001) {
    return null;
  }

  const startPitchDegrees = camera.pitchDegrees;
  const startAltitudeMeters = Math.max(camera.altitudeMeters, MIN_ALTITUDE_METERS);
  const enteringGlobe = targetGlobeness > startGlobeness;

  const endPitchDegrees = enteringGlobe
    ? clampPitch(startPitchDegrees * GLOBE_FRAMING_PITCH_SCALE)
    : clampPitch(startPitchDegrees / GLOBE_FRAMING_PITCH_SCALE);
  const endAltitudeMeters = enteringGlobe
    ? startAltitudeMeters * GLOBE_FRAMING_ALTITUDE_SCALE
    : Math.max(startAltitudeMeters / GLOBE_FRAMING_ALTITUDE_SCALE, MIN_ALTITUDE_METERS);

  return {
    startGlobeness,
    targetGlobeness,
    startPitchDegrees,
    startAltitudeMeters,
    endPitchDegrees,
    endAltitudeMeters
  };
}

/** Sample pitch/altitude for the current projection blend globeness. */
export function sampleViewModeTransitionCamera(
  baseCamera: CameraState,
  plan: ViewModeCameraChoreoPlan,
  globeness: number
): CameraState {
  const delta = plan.targetGlobeness - plan.startGlobeness;
  const normalizedProgress = delta === 0 ? 1 : (globeness - plan.startGlobeness) / delta;
  const t = Math.max(0, Math.min(1, normalizedProgress));

  return {
    ...baseCamera,
    pitchDegrees: lerp(plan.startPitchDegrees, plan.endPitchDegrees, t),
    altitudeMeters: lerp(plan.startAltitudeMeters, plan.endAltitudeMeters, t),
    transitionProgress: t
  };
}
