/** Geographic presentation mode for Atlas rendering. */
export type AtlasViewMode = "globe" | "map" | "mercator";

export interface ViewModeChangeEvent {
  viewMode: AtlasViewMode;
  previousViewMode: AtlasViewMode;
  /** 0–1 progress through an active globe↔map projection blend, when applicable. */
  transitionProgress?: number;
}

export type ViewModeChangeListener = (event: ViewModeChangeEvent) => void;

/** All view modes Atlas exposes through the public contract. */
export const ATLAS_VIEW_MODES: readonly AtlasViewMode[] = ["globe", "map", "mercator"] as const;
