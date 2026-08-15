import type { Map as MapLibreMap } from "maplibre-gl";
import type { AtlasViewMode } from "../../types/viewMode";

const PROJECTION_BLEND_EPSILON = 0.0001;

/** Read MapLibre globe↔mercator blend progress (0 = mercator, 1 = globe). */
export function readProjectionTransition(map: MapLibreMap): number {
  return map.transform.getProjectionDataForCustomLayer(true).projectionTransition;
}

/** True while MapLibre is interpolating globe and mercator projection paths. */
export function isProjectionBlendActive(transition: number): boolean {
  return transition > PROJECTION_BLEND_EPSILON && transition < 1 - PROJECTION_BLEND_EPSILON;
}

/** Whether a view-mode switch can trigger MapLibre projection blending. */
export function viewModeSwitchUsesProjectionBlend(from: AtlasViewMode, to: AtlasViewMode): boolean {
  if (from === to) {
    return false;
  }

  if ((from === "mercator" && to === "map") || (from === "map" && to === "mercator")) {
    return false;
  }

  return from === "globe" || to === "globe";
}

/** Whether the map projection state matches the requested Atlas view mode. */
export function isViewModeProjectionSettled(mode: AtlasViewMode, map: MapLibreMap): boolean {
  const projectionType = map.getProjection().type;

  if (mode === "map" || mode === "mercator") {
    return projectionType === "mercator";
  }

  if (projectionType !== "globe") {
    return false;
  }

  const transition = readProjectionTransition(map);
  return transition >= 1 - PROJECTION_BLEND_EPSILON;
}
