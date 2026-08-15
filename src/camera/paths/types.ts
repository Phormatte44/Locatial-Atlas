import type { CameraState } from "../../types/camera";
import type { CameraPathFamily } from "../../types/cameraTransition";

export type { CameraPathFamily };

/** Sample canonical camera state at eased progress `0…1` along a path family. */
export type CameraPathSampler = (
  from: CameraState,
  to: CameraState,
  progress: number
) => CameraState;
