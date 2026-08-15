import type { CameraPathFamily } from "./cameraTransition";

export interface FrameCameraOptions {
  /** Override auto-selected path family for this framing transition. */
  pathFamily?: CameraPathFamily;
}
