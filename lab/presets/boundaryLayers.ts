import type { BoundaryLayerDefinition } from "../../src";

function cityBoundaryRing(lng: number, lat: number, radiusKm: number, sides: number): Array<[number, number]> {
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

/** Lab-only demo boundary layers registered at runtime. */
export const LAB_BOUNDARY_LAYERS: BoundaryLayerDefinition[] = [
  {
    id: "london-metro",
    label: "London metro",
    semanticType: "district",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "london-metro",
            properties: {
              id: "london-metro",
              name: "London metro"
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...cityBoundaryRing(-0.1276, 51.5074, 12, 5),
                  cityBoundaryRing(-0.1276, 51.5074, 12, 5)[0]
                ]
              ]
            }
          }
        ]
      }
    },
    style: {
      fillColor: "#5b8def",
      fillOpacity: 0.12,
      lineColor: "#1e3a8a",
      lineWidth: 2,
      highlightFillColor: "#fbbf24",
      highlightLineColor: "#f59e0b"
    }
  },
  {
    id: "dubai-metro",
    label: "Dubai metro",
    semanticType: "district",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "dubai-metro",
            properties: {
              id: "dubai-metro",
              name: "Dubai metro"
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...cityBoundaryRing(55.2708, 25.2048, 12, 6),
                  cityBoundaryRing(55.2708, 25.2048, 12, 6)[0]
                ]
              ]
            }
          }
        ]
      }
    },
    style: {
      fillColor: "#14b8a6",
      fillOpacity: 0.12,
      lineColor: "#0f766e",
      lineWidth: 2,
      highlightFillColor: "#fde047",
      highlightLineColor: "#eab308"
    }
  }
];

export const DEFAULT_LAB_BOUNDARY_LAYER_ID = LAB_BOUNDARY_LAYERS[0]?.id ?? "london-metro";
