import type { BuildingLayerDefinition } from "../../src";

function buildingFootprint(
  centerLng: number,
  centerLat: number,
  widthMeters: number,
  depthMeters: number
): Array<[number, number]> {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((centerLat * Math.PI) / 180);
  const halfWidth = widthMeters / 2 / metersPerDegreeLng;
  const halfDepth = depthMeters / 2 / metersPerDegreeLat;

  return [
    [centerLng - halfWidth, centerLat - halfDepth],
    [centerLng + halfWidth, centerLat - halfDepth],
    [centerLng + halfWidth, centerLat + halfDepth],
    [centerLng - halfWidth, centerLat + halfDepth],
    [centerLng - halfWidth, centerLat - halfDepth]
  ];
}

/** Lab-only demo building footprint layers registered at runtime. */
export const LAB_BUILDING_LAYERS: BuildingLayerDefinition[] = [
  {
    id: "lab-london-buildings",
    label: "London towers",
    semanticType: "commercial",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "london-shard",
            properties: {
              id: "london-shard",
              name: "Shard block",
              heightMeters: 310
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(-0.0865, 51.5045, 90, 90)]
            }
          },
          {
            type: "Feature",
            id: "london-guildhall",
            properties: {
              id: "london-guildhall",
              name: "Guildhall block",
              heightMeters: 85
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(-0.0918, 51.5158, 120, 80)]
            }
          },
          {
            type: "Feature",
            id: "london-canary",
            properties: {
              id: "london-canary",
              name: "Canary Wharf block",
              heightMeters: 235
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(-0.0195, 51.5054, 110, 110)]
            }
          }
        ]
      }
    },
    style: {
      color: "#64748b",
      opacity: 0.88,
      highlightColor: "#fde047",
      highlightOpacity: 0.95
    }
  },
  {
    id: "lab-dubai-buildings",
    label: "Dubai skyline",
    semanticType: "landmark",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "dubai-burj",
            properties: {
              id: "dubai-burj",
              name: "Burj block",
              heightMeters: 828
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(55.2744, 25.1972, 140, 140)]
            }
          },
          {
            type: "Feature",
            id: "dubai-marina",
            properties: {
              id: "dubai-marina",
              name: "Marina tower",
              heightMeters: 355
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(55.1416, 25.0805, 95, 95)]
            }
          },
          {
            type: "Feature",
            id: "dubai-opera",
            properties: {
              id: "dubai-opera",
              name: "Opera block",
              heightMeters: 180
            },
            geometry: {
              type: "Polygon",
              coordinates: [buildingFootprint(55.2719, 25.1957, 160, 100)]
            }
          }
        ]
      }
    },
    style: {
      color: "#0ea5e9",
      opacity: 0.82,
      highlightColor: "#fbbf24",
      highlightOpacity: 0.95
    }
  }
];

export const DEFAULT_LAB_BUILDING_LAYER_ID =
  LAB_BUILDING_LAYERS[0]?.id ?? "lab-london-buildings";
