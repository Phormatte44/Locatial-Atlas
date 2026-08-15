import type { GeoAnchoredFeature } from "../types/worldMarkup";
import type { ProjectGeoFn } from "../types/projection";

const DEFAULT_PICK_RADIUS_PX = 36;

function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

/** Find the nearest geo-anchored feature within a screen-space radius. */
export function findNearestGeoFeature(
  features: GeoAnchoredFeature[],
  screenX: number,
  screenY: number,
  project: ProjectGeoFn,
  thresholdPx = DEFAULT_PICK_RADIUS_PX
): GeoAnchoredFeature | null {
  const thresholdSquared = thresholdPx * thresholdPx;
  let nearest: GeoAnchoredFeature | null = null;
  let nearestDistanceSquared = thresholdSquared;

  for (const feature of features) {
    const projected = project(feature.lng, feature.lat);
    if (!projected) {
      continue;
    }

    const distance = distanceSquared(screenX, screenY, projected.x, projected.y);
    if (distance <= nearestDistanceSquared) {
      nearest = feature;
      nearestDistanceSquared = distance;
    }
  }

  return nearest;
}

export { DEFAULT_PICK_RADIUS_PX };
