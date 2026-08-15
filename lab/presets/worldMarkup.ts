import { circleMarkupFromCenter } from "../../src/geometry/circleMarkup";
import { ellipseMarkupFromCenter } from "../../src/geometry/ellipseMarkup";
import { labelMarkupFromPlace } from "../../src/geometry/labelMarkup";
import { lineMarkupFromPath, sampleGeodesicPath } from "../../src/geometry/lineMarkup";
import { TEST_PLACES } from "./places";
import type { WorldMarkup } from "../../src";

const AREA_RADIUS_KM = 12;
const CORE_RADIUS_KM = 3;
const london = TEST_PLACES.find((place) => place.id === "london");
const dubai = TEST_PLACES.find((place) => place.id === "dubai");

/** Lab-only world markup: spheres, labels, core circles, rotated area ellipses, and a geodesic London–Dubai route line. */
export const TEST_WORLD_MARKUP: WorldMarkup[] = [
  ...TEST_PLACES.map(
    (place): WorldMarkup => ({
      kind: "sphere",
      id: place.id,
      lng: place.lng,
      lat: place.lat,
      altitudeMeters: 0
    })
  ),
  ...TEST_PLACES.map((place) => labelMarkupFromPlace(place)),
  ...TEST_PLACES.map((place) =>
    circleMarkupFromCenter(
      `${place.id}-core`,
      place.lng,
      place.lat,
      CORE_RADIUS_KM * 1_000
    )
  ),
  ...TEST_PLACES.map((place, index) =>
    ellipseMarkupFromCenter(
      `${place.id}-area`,
      place.lng,
      place.lat,
      AREA_RADIUS_KM * 1_000 * (index === 0 ? 1.15 : 1),
      AREA_RADIUS_KM * 1_000 * (index === 0 ? 0.72 : 0.88),
      index * 22
    )
  ),
  ...(london && dubai
    ? [
        lineMarkupFromPath(
          "london-dubai-route",
          sampleGeodesicPath(london.lng, london.lat, dubai.lng, dubai.lat, 96),
          120
        )
      ]
    : [])
];
