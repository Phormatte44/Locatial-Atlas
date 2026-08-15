import type { AtlasPlace, WorldMarkup } from "../../src";
import { TEST_PLACES } from "../presets/places";
import { TEST_WORLD_MARKUP } from "../presets/worldMarkup";

export const DEFAULT_SCENE_ID = "default";

/** Foundation 1 default Lab scene: London and Dubai with full world markup. */
export const defaultScenePlaces: AtlasPlace[] = TEST_PLACES;

export const defaultSceneWorldMarkup: WorldMarkup[] = TEST_WORLD_MARKUP;

export const defaultScene = {
  id: DEFAULT_SCENE_ID,
  name: "London & Dubai",
  places: defaultScenePlaces,
  worldMarkup: defaultSceneWorldMarkup
} as const;
