import type { AtlasPlace } from "../../src";
import { metroBoundsForPlace } from "./geoBounds";

/** Hard-coded Lab test places for Foundation 1. */
export const TEST_PLACES: AtlasPlace[] = [
  {
    id: "london",
    name: "London",
    lng: -0.1276,
    lat: 51.5074,
    bounds: metroBoundsForPlace(-0.1276, 51.5074, 5)
  },
  {
    id: "dubai",
    name: "Dubai",
    lng: 55.2708,
    lat: 25.2048,
    bounds: metroBoundsForPlace(55.2708, 25.2048, 6)
  }
];
