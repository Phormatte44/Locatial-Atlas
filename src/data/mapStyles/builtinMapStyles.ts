import type { MapStyleDefinition } from "../../types/mapStyle";

/** Neutral MapLibre demo style for engine development. */
export const DEFAULT_MAP_STYLE_ID = "atlas-neutral";

/** Product-facing editorial basemap used by Locatial Studio today. */
export const LOCATIAL_EDITORIAL_MAP_STYLE_ID = "locatial-editorial";

/** Repo-hosted MapLibre style document for the editorial basemap. */
export const LOCATIAL_EDITORIAL_STYLE_URL = "/map-styles/locatial-editorial.json";

/** Built-in basemap styles available without credentials. */
export const BUILTIN_MAP_STYLES: MapStyleDefinition[] = [
  {
    id: "atlas-neutral",
    label: "Atlas Neutral",
    styleUrl: "https://demotiles.maplibre.org/style.json",
    attribution: "MapLibre demo tiles"
  },
  {
    id: LOCATIAL_EDITORIAL_MAP_STYLE_ID,
    label: "Locatial Editorial",
    styleUrl: LOCATIAL_EDITORIAL_STYLE_URL,
    attribution: "OpenFreeMap · Locatial editorial style"
  },
  {
    id: "openfreemap-liberty",
    label: "Liberty",
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    attribution: "OpenFreeMap"
  },
  {
    id: "openfreemap-positron",
    label: "Positron",
    styleUrl: "https://tiles.openfreemap.org/styles/positron",
    attribution: "OpenFreeMap"
  }
];
