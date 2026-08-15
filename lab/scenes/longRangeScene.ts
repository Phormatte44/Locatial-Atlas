import type { AtlasPlace, WorldMarkup } from "../../src";

export const LONG_RANGE_SCENE_ID = "long-range";

/**
 * Stub for long-distance camera transition scenes (e.g. London → Dubai at altitude).
 * Compose places and markup here when long-range transition testing begins.
 */
export const longRangeScenePlaces: AtlasPlace[] = [];

export const longRangeSceneWorldMarkup: WorldMarkup[] = [];

export const longRangeScene = {
  id: LONG_RANGE_SCENE_ID,
  name: "Long range (stub)",
  places: longRangeScenePlaces,
  worldMarkup: longRangeSceneWorldMarkup
} as const;
