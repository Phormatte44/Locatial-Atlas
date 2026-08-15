/** Category of recoverable map or data failure reported by Atlas. */
export type MapErrorKind = "style-load" | "tile-load" | "terrain-load" | "source-load" | "render";

export interface MapErrorEvent {
  kind: MapErrorKind;
  message: string;
  recoverable: boolean;
  mapStyleId: string;
  sourceId?: string;
}

export type MapErrorListener = (event: MapErrorEvent) => void;
