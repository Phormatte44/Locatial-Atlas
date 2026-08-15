import { TEST_PLACES } from "./places";
import type { WorldMarker } from "../../src";

/** Lab-only Three.js alignment markers derived from test places. */
export const TEST_WORLD_MARKERS: WorldMarker[] = TEST_PLACES.map((place) => ({
  id: place.id,
  lng: place.lng,
  lat: place.lat,
  altitudeMeters: 0
}));
