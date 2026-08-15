import type { Map as MapLibreMap } from "maplibre-gl";
import type { AtlasViewMode } from "../../types/viewMode";

const MAP_MAX_PITCH = 85;
const FLAT_MERCATOR_MAX_PITCH = 0;

/** Apply a canonical Atlas view mode to MapLibre projection and pitch limits. */
export function applyViewModeToMap(map: MapLibreMap, mode: AtlasViewMode): void {
  const projectionType = map.getProjection().type;

  switch (mode) {
    case "globe":
      if (projectionType !== "globe") {
        map.setProjection({ type: "globe" });
      }
      map.setMaxPitch(MAP_MAX_PITCH);
      break;
    case "map":
      if (projectionType !== "mercator") {
        map.setProjection({ type: "mercator" });
      }
      map.setMaxPitch(MAP_MAX_PITCH);
      break;
    case "mercator":
      if (projectionType !== "mercator") {
        map.setProjection({ type: "mercator" });
      }
      map.setMaxPitch(FLAT_MERCATOR_MAX_PITCH);
      if (map.getPitch() > FLAT_MERCATOR_MAX_PITCH) {
        map.setPitch(FLAT_MERCATOR_MAX_PITCH);
      }
      break;
  }
}

/** Infer the active Atlas view mode from MapLibre projection and pitch policy. */
export function readViewModeFromMap(map: MapLibreMap): AtlasViewMode {
  const projectionType = map.getProjection().type;

  if (projectionType === "globe") {
    return "globe";
  }

  return map.getMaxPitch() <= FLAT_MERCATOR_MAX_PITCH ? "mercator" : "map";
}
