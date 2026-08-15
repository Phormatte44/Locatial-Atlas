/** Geographic presentation mode for Atlas rendering. */
export type AtlasViewMode = "globe" | "map" | "mercator";

export interface ViewModeChangeEvent {
  viewMode: AtlasViewMode;
  previousViewMode: AtlasViewMode;
  /** 0–1 progress through an active globe↔map projection blend, when applicable. */
  transitionProgress?: number;
}

export type ViewModeChangeListener = (event: ViewModeChangeEvent) => void;

/** Listener for MapLibre globe↔mercator blend progress (0 = mercator, 1 = globe). */
export type ProjectionBlendListener = (transition: number) => void;

/** All view modes Atlas exposes through the public contract. */
export const ATLAS_VIEW_MODES: readonly AtlasViewMode[] = ["globe", "map", "mercator"] as const;

export interface ViewModeTransitionOptions {
  /** Transition duration in milliseconds; `0` or less jumps instantly. */
  durationMs?: number;
  /**
   * When true (default), interpolate pitch and altitude with projection globeness so
   * editorial framing intent is preserved across globe↔map entry and exit.
   */
  preserveFraming?: boolean;
}
