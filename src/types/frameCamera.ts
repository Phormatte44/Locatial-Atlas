import type { CameraPathFamily } from "./cameraTransition";

export interface FrameCameraOptions {
  /** Override auto-selected path family for this framing transition. */
  pathFamily?: CameraPathFamily;
  /** Transition duration in milliseconds; `0` or less jumps instantly. */
  durationMs?: number;
}
