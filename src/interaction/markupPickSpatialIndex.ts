import { measureLabelSpriteMeters } from "../geometry/labelMarkup";
import { sampleGeodesicCircleRing } from "../geometry/circleMarkup";
import { sampleGeodesicEllipseRing } from "../geometry/ellipseMarkup";
import type { ProjectGeoFn } from "../types/projection";
import type { GeoRing, WorldMarkup } from "../types/worldMarkup";
import { DEFAULT_LINE_PICK_RADIUS_PX, DEFAULT_POINT_PICK_RADIUS_PX } from "./pickInteractiveMarkup";

const GRID_CELL_SIZE_PX = 128;

interface ScreenAabb {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface IndexedMarkup {
  markup: WorldMarkup;
  aabb: ScreenAabb;
}

function expandAabb(aabb: ScreenAabb, paddingPx: number): ScreenAabb {
  return {
    minX: aabb.minX - paddingPx,
    minY: aabb.minY - paddingPx,
    maxX: aabb.maxX + paddingPx,
    maxY: aabb.maxY + paddingPx
  };
}

function aabbFromPoints(points: Array<{ x: number; y: number }>, paddingPx: number): ScreenAabb | null {
  if (points.length === 0) {
    return null;
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return expandAabb({ minX, minY, maxX, maxY }, paddingPx);
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

function projectRingPoints(
  ring: GeoRing,
  project: ProjectGeoFn,
  altitudeMeters = 0
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (const [lng, lat] of ring) {
    const projected = project(lng, lat, altitudeMeters);
    if (projected) {
      points.push(projected);
    }
  }

  return points;
}

function computeMarkupScreenAabb(
  markup: WorldMarkup,
  project: ProjectGeoFn,
  pointPaddingPx: number,
  linePaddingPx: number
): ScreenAabb | null {
  const altitudeMeters = markup.altitudeMeters ?? 0;

  if (markup.kind === "sphere") {
    const center = project(markup.lng, markup.lat, altitudeMeters);
    if (!center) {
      return null;
    }

    return expandAabb(
      {
        minX: center.x,
        minY: center.y,
        maxX: center.x,
        maxY: center.y
      },
      pointPaddingPx
    );
  }

  if (markup.kind === "line") {
    return aabbFromPoints(projectRingPoints(markup.path, project, altitudeMeters), linePaddingPx);
  }

  if (markup.kind === "circle") {
    const ring = sampleGeodesicCircleRing(markup.lng, markup.lat, markup.radiusMeters);
    return aabbFromPoints(projectRingPoints(ring, project, altitudeMeters), 0);
  }

  if (markup.kind === "ellipse") {
    const ring = sampleGeodesicEllipseRing(
      markup.lng,
      markup.lat,
      markup.radiusXMeters,
      markup.radiusYMeters,
      markup.bearingDegrees ?? 0
    );
    return aabbFromPoints(projectRingPoints(ring, project, altitudeMeters), 0);
  }

  if (markup.kind === "polygon") {
    return aabbFromPoints(projectRingPoints(markup.ring, project, altitudeMeters), 0);
  }

  if (markup.kind === "label") {
    const center = project(markup.lng, markup.lat, altitudeMeters);
    if (!center) {
      return null;
    }

    const { widthMeters, heightMeters } = measureLabelSpriteMeters(markup.text);
    const east = offsetMetersToLngLat(markup.lng, markup.lat, widthMeters / 2, 0);
    const north = offsetMetersToLngLat(markup.lng, markup.lat, 0, heightMeters / 2);
    const eastProjected = project(east.lng, east.lat, altitudeMeters);
    const northProjected = project(north.lng, north.lat, altitudeMeters);

    if (!eastProjected || !northProjected) {
      return expandAabb(
        {
          minX: center.x,
          minY: center.y,
          maxX: center.x,
          maxY: center.y
        },
        pointPaddingPx
      );
    }

    const halfWidthPx = Math.abs(eastProjected.x - center.x);
    const halfHeightPx = Math.abs(northProjected.y - center.y);

    return {
      minX: center.x - halfWidthPx,
      minY: center.y - halfHeightPx,
      maxX: center.x + halfWidthPx,
      maxY: center.y + halfHeightPx
    };
  }

  return null;
}

function cellKey(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`;
}

function insertAabbIntoGrid(grid: Map<string, number[]>, aabb: ScreenAabb, entryIndex: number): void {
  const minCellX = Math.floor(aabb.minX / GRID_CELL_SIZE_PX);
  const minCellY = Math.floor(aabb.minY / GRID_CELL_SIZE_PX);
  const maxCellX = Math.floor(aabb.maxX / GRID_CELL_SIZE_PX);
  const maxCellY = Math.floor(aabb.maxY / GRID_CELL_SIZE_PX);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      const key = cellKey(cellX, cellY);
      const bucket = grid.get(key);
      if (bucket) {
        bucket.push(entryIndex);
      } else {
        grid.set(key, [entryIndex]);
      }
    }
  }
}

function queryGrid(grid: Map<string, number[]>, queryAabb: ScreenAabb): number[] {
  const results: number[] = [];
  const minCellX = Math.floor(queryAabb.minX / GRID_CELL_SIZE_PX);
  const minCellY = Math.floor(queryAabb.minY / GRID_CELL_SIZE_PX);
  const maxCellX = Math.floor(queryAabb.maxX / GRID_CELL_SIZE_PX);
  const maxCellY = Math.floor(queryAabb.maxY / GRID_CELL_SIZE_PX);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      const bucket = grid.get(cellKey(cellX, cellY));
      if (bucket) {
        results.push(...bucket);
      }
    }
  }

  return results;
}

function aabbIntersects(left: ScreenAabb, right: ScreenAabb): boolean {
  return (
    left.minX <= right.maxX &&
    left.maxX >= right.minX &&
    left.minY <= right.maxY &&
    left.maxY >= right.minY
  );
}

/** Uniform-grid spatial index of world markup screen-space bounds for pick culling. */
export class MarkupPickSpatialIndex {
  private entries: IndexedMarkup[] = [];
  private grid = new Map<string, number[]>();
  private valid = false;
  lastCandidateCount = 0;
  lastTotalCount = 0;

  invalidate(): void {
    this.valid = false;
    this.entries = [];
    this.grid.clear();
    this.lastCandidateCount = 0;
  }

  isValid(): boolean {
    return this.valid;
  }

  build(
    markups: WorldMarkup[],
    project: ProjectGeoFn,
    pointPaddingPx = DEFAULT_POINT_PICK_RADIUS_PX,
    linePaddingPx = DEFAULT_LINE_PICK_RADIUS_PX
  ): void {
    this.entries = [];
    this.grid.clear();
    this.lastTotalCount = markups.length;
    this.lastCandidateCount = 0;

    for (const markup of markups) {
      const aabb = computeMarkupScreenAabb(markup, project, pointPaddingPx, linePaddingPx);
      if (!aabb) {
        continue;
      }

      const entryIndex = this.entries.length;
      this.entries.push({ markup, aabb });
      insertAabbIntoGrid(this.grid, aabb, entryIndex);
    }

    this.valid = true;
  }

  query(screenX: number, screenY: number, thresholdPx: number): WorldMarkup[] {
    if (!this.valid) {
      this.lastCandidateCount = 0;
      return [];
    }

    const threshold = Math.max(thresholdPx, DEFAULT_LINE_PICK_RADIUS_PX, DEFAULT_POINT_PICK_RADIUS_PX);
    const queryAabb: ScreenAabb = {
      minX: screenX - threshold,
      minY: screenY - threshold,
      maxX: screenX + threshold,
      maxY: screenY + threshold
    };

    const candidateIndices = queryGrid(this.grid, queryAabb);
    const candidates: WorldMarkup[] = [];
    const seen = new Set<number>();

    for (const entryIndex of candidateIndices) {
      if (seen.has(entryIndex)) {
        continue;
      }

      seen.add(entryIndex);
      const entry = this.entries[entryIndex];
      if (aabbIntersects(entry.aabb, queryAabb)) {
        candidates.push(entry.markup);
      }
    }

    this.lastCandidateCount = candidates.length;
    return candidates;
  }
}
