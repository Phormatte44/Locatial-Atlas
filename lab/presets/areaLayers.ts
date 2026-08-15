import type { AreaLayerDefinition } from "../../src";

function areaRing(lng: number, lat: number, radiusKm: number, sides: number): Array<[number, number]> {
  return Array.from({ length: sides }, (_, index) => {
    const bearing = (360 / sides) * index;
    const radians = (bearing * Math.PI) / 180;
    const latRadians = (lat * Math.PI) / 180;
    const deltaLat = (radiusKm / 6371) * (180 / Math.PI) * Math.cos(radians);
    const deltaLng =
      ((radiusKm / 6371) * (180 / Math.PI) * Math.sin(radians)) / Math.cos(latRadians);

    return [lng + deltaLng, lat + deltaLat];
  });
}

/** Lab-only demo area layers registered at runtime. */
export const LAB_AREA_LAYERS: AreaLayerDefinition[] = [
  {
    id: "lab-london-park",
    label: "London park",
    semanticType: "park",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "london-park",
            properties: {
              id: "london-park",
              name: "London park"
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...areaRing(-0.165, 51.515, 4, 8),
                  areaRing(-0.165, 51.515, 4, 8)[0]
                ]
              ]
            }
          }
        ]
      }
    },
    style: {
      fillColor: "#4ade80",
      fillOpacity: 0.28,
      outlineColor: "#166534",
      outlineWidth: 2,
      highlightFillColor: "#fde047",
      highlightOutlineColor: "#ca8a04"
    }
  },
  {
    id: "lab-dubai-zone",
    label: "Dubai business zone",
    semanticType: "zone",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "dubai-zone",
            properties: {
              id: "dubai-zone",
              name: "Dubai business zone"
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...areaRing(55.28, 25.21, 5, 4),
                  areaRing(55.28, 25.21, 5, 4)[0]
                ]
              ]
            }
          }
        ]
      }
    },
    style: {
      fillColor: "#38bdf8",
      fillOpacity: 0.22,
      outlineColor: "#0369a1",
      outlineWidth: 2,
      highlightFillColor: "#fbbf24",
      highlightOutlineColor: "#d97706"
    }
  }
];

export const DEFAULT_LAB_AREA_LAYER_ID = LAB_AREA_LAYERS[0]?.id ?? "lab-london-park";
