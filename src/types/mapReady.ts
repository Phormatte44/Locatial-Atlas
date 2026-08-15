/** Why Atlas reported a map readiness change. */
export type MapReadyReason = "initial-load" | "style-changed" | "terrain-changed" | "detached";

export interface MapReadyEvent {
  ready: boolean;
  reason: MapReadyReason;
  mapStyleId: string;
}

export type MapReadyListener = (event: MapReadyEvent) => void;
