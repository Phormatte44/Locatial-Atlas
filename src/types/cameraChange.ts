import type { CameraState } from "./camera";

/** Why Atlas reported a camera state update. */
export type CameraChangeReason = "user-interaction" | "programmatic" | "transition" | "sync";

export interface CameraChangeEvent {
  state: CameraState;
  reason: CameraChangeReason;
}

export type CameraChangeListener = (event: CameraChangeEvent) => void;
