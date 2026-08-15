import type { PoiLayerDefinition } from "../../src";

/** Lab-only demo POI layers registered at runtime. */
export const LAB_POI_LAYERS: PoiLayerDefinition[] = [
  {
    id: "paris-pois-url",
    label: "Paris POIs (async URL)",
    semanticType: "landmark",
    source: {
      type: "geojson",
      data: "/lab/geojson/paris-pois.geojson"
    },
    cluster: {
      enabled: true,
      clusterRadius: 40,
      clusterMaxZoom: 13
    },
    style: {
      iconColor: "#7c3aed",
      highlightIconColor: "#fde047",
      clusterColor: "#5b21b6"
    }
  },
  {
    id: "lab-london-pois",
    label: "London landmarks",
    semanticType: "landmark",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "tower-bridge",
            properties: { id: "tower-bridge", name: "Tower Bridge" },
            geometry: { type: "Point", coordinates: [-0.0754, 51.5055] }
          },
          {
            type: "Feature",
            id: "british-museum",
            properties: { id: "british-museum", name: "British Museum" },
            geometry: { type: "Point", coordinates: [-0.127, 51.5194] }
          },
          {
            type: "Feature",
            id: "covent-garden",
            properties: { id: "covent-garden", name: "Covent Garden" },
            geometry: { type: "Point", coordinates: [-0.1223, 51.5127] }
          },
          {
            type: "Feature",
            id: "shard",
            properties: { id: "shard", name: "The Shard" },
            geometry: { type: "Point", coordinates: [-0.0865, 51.5045] }
          },
          {
            type: "Feature",
            id: "hyde-park",
            properties: { id: "hyde-park", name: "Hyde Park" },
            geometry: { type: "Point", coordinates: [-0.1657, 51.5073] }
          }
        ]
      }
    },
    cluster: {
      enabled: true,
      clusterRadius: 45,
      clusterMaxZoom: 12
    },
    style: {
      iconColor: "#2563eb",
      highlightIconColor: "#f59e0b",
      clusterColor: "#1e40af"
    }
  },
  {
    id: "lab-dubai-pois",
    label: "Dubai landmarks",
    semanticType: "landmark",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "burj-khalifa",
            properties: { id: "burj-khalifa", name: "Burj Khalifa" },
            geometry: { type: "Point", coordinates: [55.2744, 25.1972] }
          },
          {
            type: "Feature",
            id: "dubai-mall",
            properties: { id: "dubai-mall", name: "Dubai Mall" },
            geometry: { type: "Point", coordinates: [55.2796, 25.1985] }
          },
          {
            type: "Feature",
            id: "palm-view",
            properties: { id: "palm-view", name: "Palm Jumeirah" },
            geometry: { type: "Point", coordinates: [55.1177, 25.1124] }
          },
          {
            type: "Feature",
            id: "dubai-marina",
            properties: { id: "dubai-marina", name: "Dubai Marina" },
            geometry: { type: "Point", coordinates: [55.1411, 25.0805] }
          }
        ]
      }
    },
    cluster: {
      enabled: false
    },
    style: {
      iconColor: "#0d9488",
      highlightIconColor: "#fde047"
    }
  }
];

export const DEFAULT_LAB_POI_LAYER_ID = LAB_POI_LAYERS[1]?.id ?? "lab-london-pois";
