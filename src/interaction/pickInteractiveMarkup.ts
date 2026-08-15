import { measureLabelSpriteMeters } from "../geometry/labelMarkup";
import type { ProjectGeoFn, ScreenPoint } from "../types/projection";
import type { GeoRing, WorldCircleMarkup, WorldEllipseMarkup, WorldLabelMarkup, WorldMarkup } from "../types/worldMarkup";
import { sampleGeodesicCircleRing } from "../geometry/circleMarkup";
import { sampleGeodesicEllipseRing } from "../geometry/ellipseMarkup";

const DEFAULT_POINT_PICK_RADIUS_PX = 36;
const DEFAULT_LINE_PICK_RADIUS_PX = 14;

const PICK_PRIORITY = {
  label: 0,
  sphere: 1,
  circle: 2,
  ellipse: 2,
  line: 3,
  polygon: 4
} as const;

interface PickCandidate {
  id: string;
  priority: number;
  distanceSquared: number;
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function distanceToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return distanceSquared(px, py, x1, y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projectedX = x1 + t * dx;
  const projectedY = y1 + t * dy;
  return distanceSquared(px, py, projectedX, projectedY);
}

function isBetterCandidate(next: PickCandidate, current: PickCandidate | null): boolean {
  if (!current) {
    return true;
  }

  if (next.priority !== current.priority) {
    return next.priority < current.priority;
  }

  return next.distanceSquared < current.distanceSquared;
}

function offsetMetersToLngLat(
  lng: number,
  lat: number,
  eastMeters: number,
  northMeters: number
): { lng: number; lat: number } {
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(latRad);

  return {
    lng: lng + eastMeters / metersPerDegreeLng,
    lat: lat + northMeters / metersPerDegreeLat
  };
}

function isPointInScreenRect(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  halfWidthPx: number,
  halfHeightPx: number
): boolean {
  return (
    x >= centerX - halfWidthPx &&
    x <= centerX + halfWidthPx &&
    y >= centerY - halfHeightPx &&
    y <= centerY + halfHeightPx
  );
}

function isPointInScreenPolygon(x: number, y: number, ring: GeoRing, project: ProjectGeoFn): boolean {
  const projectedRing: ScreenPoint[] = [];

  for (const [lng, lat] of ring) {
    const projected = project(lng, lat);
    if (!projected) {
      return false;
    }

    projectedRing.push(projected);
  }

  if (projectedRing.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0, previous = projectedRing.length - 1; index < projectedRing.length; previous = index++) {
    const current = projectedRing[index];
    const prior = projectedRing[previous];
    const intersects =
      current.y > y !== prior.y > y &&
      x < ((prior.x - current.x) * (y - current.y)) / (prior.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pickCircleCandidate(
  markup: WorldCircleMarkup,
  screenX: number,
  screenY: number,
  project: ProjectGeoFn
): PickCandidate | null {
  const ring = sampleGeodesicCircleRing(markup.lng, markup.lat, markup.radiusMeters);

  if (!isPointInScreenPolygon(screenX, screenY, ring, project)) {
    return null;
  }

  const altitudeMeters = markup.altitudeMeters ?? 0;
  const center = project(markup.lng, markup.lat, altitudeMeters);
  if (!center) {
    return null;
  }

  return {
    id: markup.id,
    priority: PICK_PRIORITY.circle,
    distanceSquared: distanceSquared(screenX, screenY, center.x, center.y)
  };
}

function pickEllipseCandidate(
  markup: WorldEllipseMarkup,
  screenX: number,
  screenY: number,
  project: ProjectGeoFn
): PickCandidate | null {
  const altitudeMeters = markup.altitudeMeters ?? 0;
  const ring = sampleGeodesicEllipseRing(
    markup.lng,
    markup.lat,
    markup.radiusXMeters,
    markup.radiusYMeters,
    markup.bearingDegrees ?? 0
  );

  if (!isPointInScreenPolygon(screenX, screenY, ring, project)) {
    return null;
  }

  const center = project(markup.lng, markup.lat, altitudeMeters);
  if (!center) {
    return null;
  }

  return {
    id: markup.id,
    priority: PICK_PRIORITY.ellipse,
    distanceSquared: distanceSquared(screenX, screenY, center.x, center.y)
  };
}

function pickLabelCandidate(
  markup: WorldLabelMarkup,
  screenX: number,
  screenY: number,
  project: ProjectGeoFn
): PickCandidate | null {
  const altitudeMeters = markup.altitudeMeters ?? 0;
  const center = project(markup.lng, markup.lat, altitudeMeters);
  if (!center) {
    return null;
  }

  const { widthMeters, heightMeters } = measureLabelSpriteMeters(markup.text);
  const halfWidthMeters = widthMeters / 2;
  const halfHeightMeters = heightMeters / 2;
  const east = offsetMetersToLngLat(markup.lng, markup.lat, halfWidthMeters, 0);
  const north = offsetMetersToLngLat(markup.lng, markup.lat, 0, halfHeightMeters);
  const eastProjected = project(east.lng, east.lat, altitudeMeters);
  const northProjected = project(north.lng, north.lat, altitudeMeters);

  if (!eastProjected || !northProjected) {
    return null;
  }

  const halfWidthPx = Math.abs(eastProjected.x - center.x);
  const halfHeightPx = Math.abs(northProjected.y - center.y);

  if (
    !isPointInScreenRect(screenX, screenY, center.x, center.y, halfWidthPx, halfHeightPx)
  ) {
    return null;
  }

  return {
    id: markup.id,
    priority: PICK_PRIORITY.label,
    distanceSquared: distanceSquared(screenX, screenY, center.x, center.y)
  };
}

function nearestDistanceOnPath(
  path: GeoRing,
  screenX: number,
  screenY: number,
  project: ProjectGeoFn
): number {
  if (path.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = project(path[index][0], path[index][1]);
    const end = project(path[index + 1][0], path[index + 1][1]);

    if (!start || !end) {
      continue;
    }

    const distance = distanceToSegmentSquared(
      screenX,
      screenY,
      start.x,
      start.y,
      end.x,
      end.y
    );
    nearestDistanceSquared = Math.min(nearestDistanceSquared, distance);
  }

  return nearestDistanceSquared;
}

/** Find the nearest selectable markup id at a screen point (labels, spheres, circles, ellipses, lines, polygons). */
export function findNearestInteractiveMarkup(
  markups: WorldMarkup[],
  screenX: number,
  screenY: number,
  project: ProjectGeoFn,
  pointThresholdPx = DEFAULT_POINT_PICK_RADIUS_PX,
  lineThresholdPx = DEFAULT_LINE_PICK_RADIUS_PX
): string | null {
  let nearest: PickCandidate | null = null;
  const pointThresholdSquared = pointThresholdPx * pointThresholdPx;
  const lineThresholdSquared = lineThresholdPx * lineThresholdPx;

  for (const markup of markups) {
    if (markup.kind === "sphere") {
      const projected = project(markup.lng, markup.lat, markup.altitudeMeters);
      if (!projected) {
        continue;
      }

      const distance = distanceSquared(screenX, screenY, projected.x, projected.y);
      const candidate: PickCandidate = {
        id: markup.id,
        priority: PICK_PRIORITY.sphere,
        distanceSquared: distance
      };

      if (distance <= pointThresholdSquared && isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }

    if (markup.kind === "line") {
      const lineDistance = nearestDistanceOnPath(markup.path, screenX, screenY, project);
      const candidate: PickCandidate = {
        id: markup.id,
        priority: PICK_PRIORITY.line,
        distanceSquared: lineDistance
      };

      if (lineDistance <= lineThresholdSquared && isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }

    if (markup.kind === "circle") {
      const candidate = pickCircleCandidate(markup, screenX, screenY, project);
      if (candidate && isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }

    if (markup.kind === "ellipse") {
      const candidate = pickEllipseCandidate(markup, screenX, screenY, project);
      if (candidate && isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }

    if (markup.kind === "polygon") {
      if (!isPointInScreenPolygon(screenX, screenY, markup.ring, project)) {
        continue;
      }

      const candidate: PickCandidate = {
        id: markup.id,
        priority: PICK_PRIORITY.polygon,
        distanceSquared: 0
      };

      if (isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }

    if (markup.kind === "label") {
      const candidate = pickLabelCandidate(markup, screenX, screenY, project);
      if (candidate && isBetterCandidate(candidate, nearest)) {
        nearest = candidate;
      }
    }
  }

  return nearest?.id ?? null;
}

export { DEFAULT_LINE_PICK_RADIUS_PX, DEFAULT_POINT_PICK_RADIUS_PX };
