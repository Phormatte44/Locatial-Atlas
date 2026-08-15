import { destination } from "@turf/turf";
import { circleMarkupFromCenter } from "../../src/geometry/circleMarkup";
import { labelMarkupFromPlace } from "../../src/geometry/labelMarkup";
import { lineMarkupFromPath, sampleGeodesicPath } from "../../src/geometry/lineMarkup";
import { polygonMarkupFromRing } from "../../src/geometry/polygonMarkup";
import { TEST_PLACES } from "./places";
import type { WorldMarkup } from "../../src";

const AREA_RADIUS_KM = 12;
const CORE_RADIUS_KM = 3;
const london = TEST_PLACES.find((place) => place.id === "london");
const dubai = TEST_PLACES.find((place) => place.id === "dubai");

function cityAreaRing(lng: number, lat: number, radiusKm: number, sides: number): Array<[number, number]> {
  const center = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat]
    }
  };

  return Array.from({ length: sides }, (_, index) => {
    const bearing = (360 / sides) * index;
    const point = destination(center, radiusKm, bearing, { units: "kilometers" });
    return point.geometry.coordinates as [number, number];
  });
}

/** Lab-only world markup: spheres, labels, core circles, area polygons, and a geodesic London–Dubai route line. */
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
    polygonMarkupFromRing(
      `${place.id}-area`,
      cityAreaRing(place.lng, place.lat, AREA_RADIUS_KM, index === 0 ? 5 : 6)
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
