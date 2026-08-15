import type { LayerFamily } from "./layerLoadState";

/** Category of recoverable map or data failure reported by Atlas. */
export type MapErrorKind =
  | "style-load"
  | "tile-load"
  | "terrain-load"
  | "source-load"
  | "layer-load"
  | "render";

export interface MapErrorEvent {
  kind: MapErrorKind;
  message: string;
  recoverable: boolean;
  mapStyleId: string;
  sourceId?: string;
  layerId?: string;
  layerFamily?: LayerFamily;
}

export type MapErrorListener = (event: MapErrorEvent) => void;
