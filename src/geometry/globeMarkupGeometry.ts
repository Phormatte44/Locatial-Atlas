import type { Map as MapLibreMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { lerp } from "../camera/easing";
import { resolveLabelGlobeness } from "./labelGlobeAlignment";
import { sampleGeodesicCircleRing } from "./circleMarkup";
import { sampleGeodesicEllipseRing } from "./ellipseMarkup";
import type { GeoRing, WorldMarkup } from "../types/worldMarkup";
import type { OverlayTransformContext } from "../world/overlayModelMatrix";

/** Soft cap for line vertices before uniform decimation (e.g. long geodesic routes). */
export const MAX_LINE_VERTICES = 512;

/** Soft cap for polygon ring vertices before uniform decimation. */
export const MAX_POLYGON_VERTICES = 256;

/** Douglas–Peucker tolerance in meters before vertex-cap decimation. */
export const DOUGLAS_PEUCKER_TOLERANCE_METERS = 5;

const _worldPosition = new THREE.Vector3();
const _localPosition = new THREE.Vector3();

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function matrixFromMapLibreModel(
  map: MapLibreMap,
  lng: number,
  lat: number,
  altitudeMeters: number
): THREE.Matrix4 {
  return new THREE.Matrix4().fromArray(map.transform.getMatrixForModel([lng, lat], altitudeMeters));
}

function lngLatToLocalMeters(
  lng: number,
  lat: number,
  anchorLng: number,
  anchorLat: number
): { east: number; north: number } {
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(latRad);

  return {
    east: (lng - anchorLng) * metersPerDegreeLng,
    north: (lat - anchorLat) * metersPerDegreeLat
  };
}

function perpendicularDistanceMeters(
  point: { east: number; north: number },
  lineStart: { east: number; north: number },
  lineEnd: { east: number; north: number }
): number {
  const dx = lineEnd.east - lineStart.east;
  const dy = lineEnd.north - lineStart.north;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.east - lineStart.east, point.north - lineStart.north);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.east - lineStart.east) * dx + (point.north - lineStart.north) * dy) / lengthSquared
    )
  );
  const projectedEast = lineStart.east + t * dx;
  const projectedNorth = lineStart.north + t * dy;

  return Math.hypot(point.east - projectedEast, point.north - projectedNorth);
}

function douglasPeuckerRange(
  localMeters: Array<{ east: number; north: number }>,
  start: number,
  end: number,
  toleranceMeters: number,
  keep: boolean[]
): void {
  if (end <= start + 1) {
    return;
  }

  let maxDistance = 0;
  let maxIndex = start;

  const lineStart = localMeters[start];
  const lineEnd = localMeters[end];

  for (let index = start + 1; index < end; index += 1) {
    const distance = perpendicularDistanceMeters(localMeters[index], lineStart, lineEnd);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= toleranceMeters) {
    return;
  }

  keep[maxIndex] = true;
  douglasPeuckerRange(localMeters, start, maxIndex, toleranceMeters, keep);
  douglasPeuckerRange(localMeters, maxIndex, end, toleranceMeters, keep);
}

/** Douglas–Peucker simplification in local meter space relative to the ring’s first vertex. */
export function douglasPeuckerGeoRing(
  ring: GeoRing,
  toleranceMeters: number,
  closed = false
): GeoRing {
  if (ring.length <= 2 || toleranceMeters <= 0) {
    return ring;
  }

  const anchorLng = ring[0][0];
  const anchorLat = ring[0][1];
  const localMeters = ring.map(([lng, lat]) => lngLatToLocalMeters(lng, lat, anchorLng, anchorLat));

  if (closed && ring.length > 2) {
    let maxDistance = 0;
    let splitIndex = 0;

    for (let index = 1; index < ring.length; index += 1) {
      const distance = perpendicularDistanceMeters(localMeters[index], localMeters[0], localMeters[ring.length - 1]);
      if (distance > maxDistance) {
        maxDistance = distance;
        splitIndex = index;
      }
    }

    if (maxDistance <= toleranceMeters) {
      return [ring[0], ring[ring.length - 1]];
    }

    const keep = ring.map((_, index) => index === 0 || index === splitIndex);
    douglasPeuckerRange(localMeters, 0, splitIndex, toleranceMeters, keep);
    douglasPeuckerRange(localMeters, splitIndex, ring.length - 1, toleranceMeters, keep);

    return ring.filter((_, index) => keep[index]);
  }

  const keep = ring.map((_, index) => index === 0 || index === ring.length - 1);
  douglasPeuckerRange(localMeters, 0, ring.length - 1, toleranceMeters, keep);
  return ring.filter((_, index) => keep[index]);
}

/** Douglas–Peucker simplification then uniform decimation when a ring exceeds the performance cap. */
export function simplifyGeoRing(
  ring: GeoRing,
  maxVertices: number,
  toleranceMeters = DOUGLAS_PEUCKER_TOLERANCE_METERS,
  closed = false
): GeoRing {
  const simplified = douglasPeuckerGeoRing(ring, toleranceMeters, closed);

  if (simplified.length <= maxVertices) {
    return simplified;
  }

  if (maxVertices < 2) {
    return simplified.slice(0, 1);
  }

  const decimated: GeoRing = [];
  const step = (simplified.length - 1) / (maxVertices - 1);

  for (let index = 0; index < maxVertices; index += 1) {
    const sourceIndex = Math.min(Math.round(index * step), simplified.length - 1);
    decimated.push(simplified[sourceIndex]);
  }

  return decimated;
}

function mercatorLocalVertex(
  lng: number,
  lat: number,
  anchorLng: number,
  anchorLat: number
): THREE.Vector3 {
  const anchorMercator = maplibregl.MercatorCoordinate.fromLngLat([anchorLng, anchorLat]);
  const meterScale = anchorMercator.meterInMercatorCoordinateUnits();
  const point = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
  const eastMeters = (point.x - anchorMercator.x) / meterScale;
  const northMeters = (anchorMercator.y - point.y) / meterScale;

  return new THREE.Vector3(eastMeters, northMeters, 0);
}

function globeLocalVertex(
  map: MapLibreMap,
  lng: number,
  lat: number,
  altitudeMeters: number,
  anchorInverse: THREE.Matrix4
): THREE.Vector3 {
  const vertexMatrix = matrixFromMapLibreModel(map, lng, lat, altitudeMeters);
  _worldPosition.setFromMatrixPosition(vertexMatrix);
  _localPosition.copy(_worldPosition).applyMatrix4(anchorInverse);
  return _localPosition.clone();
}

function resolveGlobeAnchorInverse(
  map: MapLibreMap,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number
): THREE.Matrix4 {
  return matrixFromMapLibreModel(map, anchorLng, anchorLat, altitudeMeters).clone().invert();
}

/** Stable cache key for markup geometry source data. */
export function markupGeometrySignature(markup: WorldMarkup): string | null {
  switch (markup.kind) {
    case "line":
      return `line:${JSON.stringify(markup.path)}:${markup.lng}:${markup.lat}:${markup.altitudeMeters ?? 0}`;
    case "polygon":
      return `polygon:${JSON.stringify(markup.ring)}:${markup.lng}:${markup.lat}:${markup.altitudeMeters ?? 0}`;
    case "circle":
      return `circle:${markup.lng}:${markup.lat}:${markup.radiusMeters}:${markup.altitudeMeters ?? 0}`;
    case "ellipse":
      return `ellipse:${markup.lng}:${markup.lat}:${markup.radiusXMeters}:${markup.radiusYMeters}:${markup.bearingDegrees ?? 0}:${markup.altitudeMeters ?? 0}`;
    default:
      return null;
  }
}

/** Simplified source ring for globe-aware overlay geometry (DP + vertex cap). */
export function resolveSourceRingForMarkup(
  markup: Extract<WorldMarkup, { kind: "line" | "polygon" | "circle" | "ellipse" }>
): GeoRing {
  if (markup.kind === "line") {
    return simplifyGeoRing(markup.path, MAX_LINE_VERTICES, DOUGLAS_PEUCKER_TOLERANCE_METERS, false);
  }

  if (markup.kind === "polygon") {
    return simplifyGeoRing(markup.ring, MAX_POLYGON_VERTICES, DOUGLAS_PEUCKER_TOLERANCE_METERS, true);
  }

  if (markup.kind === "circle") {
    return simplifyGeoRing(
      sampleGeodesicCircleRing(markup.lng, markup.lat, markup.radiusMeters),
      MAX_POLYGON_VERTICES,
      DOUGLAS_PEUCKER_TOLERANCE_METERS,
      true
    );
  }

  return simplifyGeoRing(
    sampleGeodesicEllipseRing(
      markup.lng,
      markup.lat,
      markup.radiusXMeters,
      markup.radiusYMeters,
      markup.bearingDegrees ?? 0
    ),
    MAX_POLYGON_VERTICES,
    DOUGLAS_PEUCKER_TOLERANCE_METERS,
    true
  );
}

/** Mercator-local vertices for a ring in the anchor frame (globeness = 0 endpoint). */
export function computeMercatorLocalVertices(
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number
): Float32Array {
  const positions = new Float32Array(ring.length * 3);

  ring.forEach(([lng, lat], index) => {
    const local = mercatorLocalVertex(lng, lat, anchorLng, anchorLat);
    positions[index * 3] = local.x;
    positions[index * 3 + 1] = local.y;
    positions[index * 3 + 2] = local.z;
  });

  return positions;
}

/** Globe-local vertices for a ring in the anchor frame (globeness = 1 endpoint). */
export function computeGlobeLocalVertices(
  ring: GeoRing,
  map: MapLibreMap,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number
): Float32Array {
  const positions = new Float32Array(ring.length * 3);
  const anchorInverse = resolveGlobeAnchorInverse(map, anchorLng, anchorLat, altitudeMeters);

  ring.forEach(([lng, lat], index) => {
    const globeLocal = globeLocalVertex(map, lng, lat, altitudeMeters, anchorInverse);
    positions[index * 3] = globeLocal.x;
    positions[index * 3 + 1] = globeLocal.y;
    positions[index * 3 + 2] = globeLocal.z;
  });

  return positions;
}

/** Lerp mercator and globe local vertex endpoints into `out` (or a new array). */
export function lerpMarkupLocalVertices(
  mercatorLocal: Float32Array,
  globeLocal: Float32Array,
  globeness: number,
  out?: Float32Array
): Float32Array {
  const t = clamp01(globeness);
  const positions = out ?? new Float32Array(mercatorLocal.length);

  if (t <= 0) {
    positions.set(mercatorLocal);
    return positions;
  }

  if (t >= 1) {
    positions.set(globeLocal);
    return positions;
  }

  for (let index = 0; index < positions.length; index += 1) {
    positions[index] = lerp(mercatorLocal[index], globeLocal[index], t);
  }

  return positions;
}

function blendLocalVertex(
  mercatorLocal: THREE.Vector3,
  globeLocal: THREE.Vector3,
  globeness: number
): THREE.Vector3 {
  const t = clamp01(globeness);

  if (t <= 0) {
    return mercatorLocal.clone();
  }

  if (t >= 1) {
    return globeLocal.clone();
  }

  return mercatorLocal.clone().lerp(globeLocal, t);
}

/** Resolve blended local XY(Z) positions for markup vertices in the anchor frame. */
export function resolveMarkupLocalVertices(
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): Float32Array {
  const globeness = resolveLabelGlobeness(context);
  const positions = new Float32Array(ring.length * 3);

  if (globeness <= 0 || !context.map) {
    ring.forEach(([lng, lat], index) => {
      const local = mercatorLocalVertex(lng, lat, anchorLng, anchorLat);
      positions[index * 3] = local.x;
      positions[index * 3 + 1] = local.y;
      positions[index * 3 + 2] = local.z;
    });
    return positions;
  }

  const anchorInverse = resolveGlobeAnchorInverse(context.map, anchorLng, anchorLat, altitudeMeters);

  ring.forEach(([lng, lat], index) => {
    const mercatorLocal = mercatorLocalVertex(lng, lat, anchorLng, anchorLat);
    const globeLocal = globeLocalVertex(context.map!, lng, lat, altitudeMeters, anchorInverse);
    const blended = blendLocalVertex(mercatorLocal, globeLocal, globeness);

    positions[index * 3] = blended.x;
    positions[index * 3 + 1] = blended.y;
    positions[index * 3 + 2] = blended.z;
  });

  return positions;
}

/** Apply blended local vertex positions to an existing line or mesh geometry. */
export function applyMarkupLocalVertices(
  geometry: THREE.BufferGeometry,
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): void {
  const positions = resolveMarkupLocalVertices(ring, anchorLng, anchorLat, altitudeMeters, context);
  applyLocalVertexPositions(geometry, positions);
}

/** Write a local vertex buffer into geometry, replacing the attribute when lengths differ. */
export function applyLocalVertexPositions(
  geometry: THREE.BufferGeometry,
  positions: Float32Array
): void {
  const attribute = geometry.getAttribute("position");

  if (attribute instanceof THREE.BufferAttribute && attribute.array.length === positions.length) {
    attribute.array.set(positions);
    attribute.needsUpdate = true;
    return;
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
}

/** Build line geometry with mercator↔globe vertex blend for the active projection context. */
export function createGlobeAwareLineGeometry(
  path: GeoRing,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.BufferGeometry {
  const simplified = simplifyGeoRing(path, MAX_LINE_VERTICES, DOUGLAS_PEUCKER_TOLERANCE_METERS, false);
  const geometry = new THREE.BufferGeometry();
  applyMarkupLocalVertices(geometry, simplified, anchorLng, anchorLat, altitudeMeters, context);
  return geometry;
}

/** Build a local shape for polygon markup with mercator↔globe vertex blend. */
export function ringToGlobeAwareLocalShape(
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.Shape {
  const simplified = simplifyGeoRing(ring, MAX_POLYGON_VERTICES, DOUGLAS_PEUCKER_TOLERANCE_METERS, true);
  const positions = resolveMarkupLocalVertices(
    simplified,
    anchorLng,
    anchorLat,
    altitudeMeters,
    context
  );
  const shape = new THREE.Shape();

  for (let index = 0; index < simplified.length; index += 1) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];

    if (index === 0) {
      shape.moveTo(x, y);
      continue;
    }

    shape.lineTo(x, y);
  }

  shape.closePath();
  return shape;
}

/** Build polygon shape geometry with mercator↔globe vertex blend. */
export function createGlobeAwarePolygonShapeGeometry(
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(
    ringToGlobeAwareLocalShape(ring, anchorLng, anchorLat, altitudeMeters, context)
  );
}

/** Build circle fill geometry from a geodesic ring with mercator↔globe vertex blend. */
export function createGlobeAwareCircleShapeGeometry(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.ShapeGeometry {
  const ring = sampleGeodesicCircleRing(centerLng, centerLat, radiusMeters);
  return new THREE.ShapeGeometry(
    ringToGlobeAwareLocalShape(ring, anchorLng, anchorLat, altitudeMeters, context)
  );
}

/** Build ellipse fill geometry from a geodesic ring with mercator↔globe vertex blend. */
export function createGlobeAwareEllipseShapeGeometry(
  centerLng: number,
  centerLat: number,
  radiusXMeters: number,
  radiusYMeters: number,
  bearingDegrees: number,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.ShapeGeometry {
  const ring = sampleGeodesicEllipseRing(
    centerLng,
    centerLat,
    radiusXMeters,
    radiusYMeters,
    bearingDegrees
  );
  return new THREE.ShapeGeometry(
    ringToGlobeAwareLocalShape(ring, anchorLng, anchorLat, altitudeMeters, context)
  );
}

/** Build a local THREE.Shape from a flat XY vertex buffer (ring outline). */
export function shapeFromLocalPositions(positions: Float32Array, vertexCount: number): THREE.Shape {
  const shape = new THREE.Shape();

  for (let index = 0; index < vertexCount; index += 1) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];

    if (index === 0) {
      shape.moveTo(x, y);
      continue;
    }

    shape.lineTo(x, y);
  }

  shape.closePath();
  return shape;
}

/** Opacity tweak for wide-span lines during globe blend (mirrors label legibility). */
export function lineLegibilityForGlobeness(globeness: number): number {
  return lerp(0.92, 1, clamp01(globeness));
}
