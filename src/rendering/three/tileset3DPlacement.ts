import { MercatorCoordinate, type Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import type { GeographicBounds } from "../../types/bounds";
import type { Tileset3DTransform } from "../../types/tileset3DLayer";
import {
  type OverlayTransformContext,
  usesGlobeOverlayProjection
} from "../../world/overlayModelMatrix";
import type { AtlasTilesRenderer } from "./tilesRendererLoader";

const DEFAULT_TILESET_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];
const METERS_PER_DEGREE_LAT = 111_320;

export interface Tileset3DAnchor {
  lng: number;
  lat: number;
  altitudeMeters: number;
}

/** Convert ECEF coordinates to WGS84 lng/lat/altitude. */
export function ecefToLngLatAlt(x: number, y: number, z: number): Tileset3DAnchor {
  const a = 6378137.0;
  const e2 = 6.69437999014e-3;
  const b = a * Math.sqrt(1 - e2);
  const ep2 = (a * a - b * b) / (b * b);

  const p = Math.sqrt(x * x + y * y);
  const th = Math.atan2(a * z, b * p);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(z + ep2 * b * Math.pow(Math.sin(th), 3), p - e2 * a * Math.pow(Math.cos(th), 3));
  const n = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const alt = p / Math.cos(lat) - n;

  return {
    lng: (lon * 180) / Math.PI,
    lat: (lat * 180) / Math.PI,
    altitudeMeters: alt
  };
}

function matrixFromMapLibreModel(
  map: MapLibreMap,
  lng: number,
  lat: number,
  altitudeMeters: number
): THREE.Matrix4 {
  return new THREE.Matrix4().fromArray(map.transform.getMatrixForModel([lng, lat], altitudeMeters));
}

function applyLocalRotationAndScale(
  base: THREE.Matrix4,
  transform: Tileset3DTransform | undefined
): THREE.Matrix4 {
  const rotateX = transform?.rotateX ?? DEFAULT_TILESET_ROTATION[0];
  const rotateY = transform?.rotateY ?? DEFAULT_TILESET_ROTATION[1];
  const rotateZ = transform?.rotateZ ?? DEFAULT_TILESET_ROTATION[2];
  const scale = transform?.scale ?? 1;

  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const rotationX = new THREE.Matrix4().makeRotationAxis(axisX, rotateX);
  const rotationY = new THREE.Matrix4().makeRotationAxis(axisY, rotateY);
  const rotationZ = new THREE.Matrix4().makeRotationAxis(axisZ, rotateZ);
  const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);

  return base.clone().multiply(rotationX).multiply(rotationY).multiply(rotationZ).multiply(scaleMatrix);
}

function createMercatorPlacementMatrix(
  anchor: Tileset3DAnchor,
  transform: Tileset3DTransform | undefined
): THREE.Matrix4 {
  const rotateX = transform?.rotateX ?? DEFAULT_TILESET_ROTATION[0];
  const rotateY = transform?.rotateY ?? DEFAULT_TILESET_ROTATION[1];
  const rotateZ = transform?.rotateZ ?? DEFAULT_TILESET_ROTATION[2];
  const scale = transform?.scale ?? 1;

  const modelAsMercatorCoordinate = MercatorCoordinate.fromLngLat(
    [anchor.lng, anchor.lat],
    anchor.altitudeMeters
  );
  const meterScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits();

  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const rotationX = new THREE.Matrix4().makeRotationAxis(axisX, rotateX);
  const rotationY = new THREE.Matrix4().makeRotationAxis(axisY, rotateY);
  const rotationZ = new THREE.Matrix4().makeRotationAxis(axisZ, rotateZ);
  const scaleVec = new THREE.Vector3(meterScale * scale, -meterScale * scale, meterScale * scale);

  return new THREE.Matrix4()
    .makeTranslation(
      modelAsMercatorCoordinate.x,
      modelAsMercatorCoordinate.y,
      modelAsMercatorCoordinate.z
    )
    .scale(scaleVec)
    .multiply(rotationX)
    .multiply(rotationY)
    .multiply(rotationZ);
}

/** Build the MapLibre-facing placement matrix for a 3D Tiles overlay anchor. */
export function createTileset3DPlacementMatrix(
  anchor: Tileset3DAnchor,
  transform: Tileset3DTransform | undefined,
  context: OverlayTransformContext
): THREE.Matrix4 {
  if (usesGlobeOverlayProjection(context) && context.map) {
    const base = matrixFromMapLibreModel(
      context.map,
      anchor.lng,
      anchor.lat,
      anchor.altitudeMeters
    );
    return applyLocalRotationAndScale(base, transform);
  }

  return createMercatorPlacementMatrix(anchor, transform);
}

/** Resolve anchor from an explicit transform or the tileset bounding sphere center. */
export function resolveTileset3DAnchor(
  tiles: AtlasTilesRenderer,
  transform: Tileset3DTransform | undefined
): Tileset3DAnchor {
  if (transform) {
    return {
      lng: transform.lng,
      lat: transform.lat,
      altitudeMeters: transform.altitudeMeters ?? 0
    };
  }

  const sphere = new THREE.Sphere();
  tiles.getBoundingSphere(sphere);
  return ecefToLngLatAlt(sphere.center.x, sphere.center.y, sphere.center.z);
}

/** Rebase ECEF tile content so the tileset center sits at the local origin. */
export function rebaseTilesGroupToOrigin(tiles: AtlasTilesRenderer): void {
  const sphere = new THREE.Sphere();
  tiles.getBoundingSphere(sphere);
  const center = sphere.center.clone();
  const root = tiles.root;

  let transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  if (root?.transform) {
    transform = root.transform;
  }

  const rotationMat3 = new THREE.Matrix3().set(
    transform[0],
    transform[1],
    transform[2],
    transform[8],
    transform[9],
    transform[10],
    -transform[4],
    -transform[5],
    -transform[6]
  );
  const rotationMat4 = new THREE.Matrix4().setFromMatrix3(rotationMat3);
  const moveToOrigin = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
  const finalMatrix = new THREE.Matrix4().multiplyMatrices(rotationMat4, moveToOrigin);

  tiles.group.matrix.copy(finalMatrix);
  tiles.group.matrixAutoUpdate = false;
  tiles.group.updateMatrixWorld(true);
}

/** Apply definition opacity to all tile materials. */
export function applyTileset3DOpacity(root: THREE.Object3D, opacity: number): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if ("opacity" in material && typeof material.opacity === "number") {
        material.opacity = opacity;
        material.transparent = opacity < 1;
        material.depthWrite = opacity >= 1;
        material.depthTest = true;
        material.needsUpdate = true;
      }
    }
  });
}

/** Ensure tile meshes participate in the shared MapLibre depth buffer. */
export function applyTileset3DDepthCompositing(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.renderOrder = 0;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if ("depthTest" in material) {
        material.depthTest = true;
      }

      if ("depthWrite" in material && typeof material.opacity === "number") {
        material.depthWrite = material.opacity >= 1;
      }
    }
  });
}

/** Approximate geographic bounds from a tileset bounding sphere (WGS84). */
export function computeTilesetGeographicBounds(
  tiles: AtlasTilesRenderer,
  transform?: Tileset3DTransform
): GeographicBounds {
  const sphere = new THREE.Sphere();
  tiles.getBoundingSphere(sphere);
  const center = ecefToLngLatAlt(sphere.center.x, sphere.center.y, sphere.center.z);
  const lng = transform?.lng ?? center.lng;
  const lat = transform?.lat ?? center.lat;
  const radiusMeters = Math.max(sphere.radius, 250);
  const latDelta = radiusMeters / METERS_PER_DEGREE_LAT;
  const lngDelta =
    radiusMeters / (METERS_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}
