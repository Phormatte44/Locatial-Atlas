import type { RoadLayerDefinition } from "../../src";
import { sampleGeodesicPath } from "../../src/geometry/lineMarkup";
import { TEST_PLACES } from "./places";

const london = TEST_PLACES.find((place) => place.id === "london");
const dubai = TEST_PLACES.find((place) => place.id === "dubai");

/** Lab-only demo road layers registered at runtime. */
export const LAB_ROAD_LAYERS: RoadLayerDefinition[] = [
  ...(london && dubai
    ? [
        {
          id: "lab-london-dubai-route",
          label: "London–Dubai corridor",
          semanticType: "route" as const,
          source: {
            type: "geojson" as const,
            data: {
              type: "FeatureCollection" as const,
              features: [
                {
                  type: "Feature" as const,
                  id: "london-dubai-route",
                  properties: {
                    id: "london-dubai-route",
                    name: "London–Dubai corridor"
                  },
                  geometry: {
                    type: "LineString" as const,
                    coordinates: sampleGeodesicPath(
                      london.lng,
                      london.lat,
                      dubai.lng,
                      dubai.lat,
                      96
                    )
                  }
                }
              ]
            }
          },
          style: {
            color: "#2563eb",
            width: 3,
            opacity: 0.92,
            casingColor: "#1e3a8a",
            casingWidth: 6,
            highlightColor: "#f59e0b",
            highlightWidth: 5,
            highlightCasingColor: "#b45309"
          }
        }
      ]
    : [])
];

export const DEFAULT_LAB_ROAD_LAYER_ID = LAB_ROAD_LAYERS[0]?.id ?? "lab-london-dubai-route";
