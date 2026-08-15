import type { RasterLayerDefinition } from "../../src";

/** Lab-only demo raster imagery layers registered at runtime. */
export const LAB_RASTER_LAYERS: RasterLayerDefinition[] = [
  {
    id: "lab-esri-satellite",
    label: "World Imagery (Esri)",
    semanticType: "satellite",
    source: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256
    },
    style: {
      opacity: 0.82
    },
    minzoom: 0,
    maxzoom: 19,
    attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  },
  {
    id: "lab-stamen-toner",
    label: "Stamen Toner (thematic)",
    semanticType: "thematic",
    source: {
      type: "raster",
      tiles: ["https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png"],
      tileSize: 256
    },
    style: {
      opacity: 0.55,
      contrast: 0.15
    },
    minzoom: 0,
    maxzoom: 18,
    bounds: [-0.55, 51.25, 0.25, 51.75],
    attribution: "Stamen Design, OpenStreetMap, Stadia Maps"
  }
];

export const DEFAULT_LAB_RASTER_LAYER_ID = LAB_RASTER_LAYERS[0]?.id ?? "lab-esri-satellite";
