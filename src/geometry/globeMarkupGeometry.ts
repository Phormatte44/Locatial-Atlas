import type { Map as MapLibreMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { lerp } from "../camera/easing";
import { resolveLabelGlobeness } from "./labelGlobeAlignment";
import { sampleGeodesicCircleRing } from "./circleMarkup";
import { sampleGeodesicEllipseRing } from "./ellipseMarkup";
import type { GeoRing } from "../types/worldMarkup";
import type { OverlayTransformContext } from "../world/overlayModelMatrix";

/** Soft cap for line vertices before uniform decimation (e.g. long geodesic routes). */
export const MAX_LINE_VERTICES = 512;

/** Soft cap for polygon ring vertices before uniform decimation. */
export const MAX_POLYGON_VERTICES = 256;

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

/** Uniformly decimate a ring/path when it exceeds the performance cap. */
export function simplifyGeoRing(ring: GeoRing, maxVertices: number): GeoRing {
  if (ring.length <= maxVertices) {
    return ring;
  }

  if (maxVertices < 2) {
    return ring.slice(0, 1);
  }

  const simplified: GeoRing = [];
  const step = (ring.length - 1) / (maxVertices - 1);

  for (let index = 0; index < maxVertices; index += 1) {
    const sourceIndex = Math.min(Math.round(index * step), ring.length - 1);
    simplified.push(ring[sourceIndex]);
  }

  return simplified;
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

function resolveGlobeAnchorInverse(
  map: MapLibreMap,
  anchorLng: number,
  anchorLat: number,
  altitudeMeters: number
): THREE.Matrix4 {
  return matrixFromMapLibreModel(map, anchorLng, anchorLat, altitudeMeters).clone().invert();
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
  const simplified = simplifyGeoRing(path, MAX_LINE_VERTICES);
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
  const simplified = simplifyGeoRing(ring, MAX_POLYGON_VERTICES);
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

/** Opacity tweak for wide-span lines during globe blend (mirrors label legibility). */
export function lineLegibilityForGlobeness(globeness: number): number {
  return lerp(0.92, 1, clamp01(globeness));
}
