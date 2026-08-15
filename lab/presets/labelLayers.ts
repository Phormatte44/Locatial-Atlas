import type { LabelLayerDefinition } from "../../src";

/** Lab-only demo label layers registered at runtime. */
export const LAB_LABEL_LAYERS: LabelLayerDefinition[] = [
  {
    id: "lab-city-labels",
    label: "City labels",
    semanticType: "place",
    textField: "name",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "london",
            properties: {
              id: "london",
              name: "London"
            },
            geometry: {
              type: "Point",
              coordinates: [-0.1276, 51.5074]
            }
          },
          {
            type: "Feature",
            id: "dubai",
            properties: {
              id: "dubai",
              name: "Dubai"
            },
            geometry: {
              type: "Point",
              coordinates: [55.2708, 25.2048]
            }
          }
        ]
      }
    },
    style: {
      textColor: "#1e293b",
      textHaloColor: "#f8fafc",
      textHaloWidth: 2,
      textSize: 15,
      highlightTextColor: "#b45309",
      highlightTextHaloColor: "#fef3c7",
      highlightTextSize: 17
    }
  }
];

export const DEFAULT_LAB_LABEL_LAYER_ID = LAB_LABEL_LAYERS[0]?.id ?? "lab-city-labels";
