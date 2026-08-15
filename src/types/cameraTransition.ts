import type { CameraState } from "./camera";

export type CameraPathFamily =
  | "local-glide"
  | "orbit-reveal"
  | "departure-arrival-arc"
  | "straight"
  | "high-arc";

export type CameraTransitionPhase = "started" | "completed" | "cancelled";

export interface CameraTransitionEvent {
  phase: CameraTransitionPhase;
  pathFamily: CameraPathFamily;
  from: CameraState;
  to: CameraState;
}

export type CameraTransitionListener = (event: CameraTransitionEvent) => void;
