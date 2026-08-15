import type { Tileset3DLayerDefinition } from "../../src";

/** Lab-only demo 3D Tiles overlays registered at runtime. */
export const LAB_TILESET3D_LAYERS: Tileset3DLayerDefinition[] = [
  {
    id: "lab-reearth-buildings",
    label: "Re:Earth Buildings (OGC sample)",
    semanticType: "buildings",
    tilesetUrl: "https://buildings.reearth.land/tileset.json",
    style: {
      opacity: 0.95
    },
    attribution: "Re:Earth Buildings (Overture Maps)"
  }
];

export const DEFAULT_LAB_TILESET3D_LAYER_ID =
  LAB_TILESET3D_LAYERS[0]?.id ?? "lab-reearth-buildings";
