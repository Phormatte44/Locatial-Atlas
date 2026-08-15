/** Registered GeoJSON layer family that supports async URL loading. */
export type LayerFamily = "boundary" | "label" | "road" | "area" | "building" | "poi";

/** Lifecycle state for a GeoJSON layer source. */
export type LayerLoadStatus = "idle" | "loading" | "ready" | "error";

/** Load state for one enabled layer id. */
export interface LayerLoadState {
  layerId: string;
  family: LayerFamily;
  status: LayerLoadStatus;
  /** Present when the layer uses a remote GeoJSON URL. */
  url?: string;
  /** Present when status is `error`. */
  error?: string;
}

export interface LayerLoadChangeEvent {
  state: LayerLoadState;
}

export type LayerLoadChangeListener = (event: LayerLoadChangeEvent) => void;
