import * as THREE from "three";
import {
  featureKeyFromTilesetPickObject,
  formatTileset3DFeatureId,
  meshFeaturePickNeedsAsync,
  resolveMeshFeatureIdAsync,
  TILESET3D_MESH_FEATURE_PREFIX,
  type TilesetPickIntersection
} from "../../interaction/tileset3dFeatureIds";
import type { AtlasTilesRenderer } from "./tilesRendererLoader";

/**
 * Tileset 3D pick pipeline (Foundation 52):
 * 1. Raycast loaded tile geometry with render-pass camera matrices.
 * 2. Sync resolve feature key (mesh-feature attribute, batch id, or mesh uuid).
 * 3. When mesh-feature textures miss sync, mark pendingAsyncMeshFeature; AtlasEngine
 *    queues getFeaturesAsync and re-emits hover/select with mf:{id}@uuid when ready.
 * 4. Structural metadata / batch-table properties attach via tileset3DFeatureProperties.
 */

export interface Tileset3DPickCamera {
  projectionMatrix: THREE.Matrix4;
  matrixWorldInverse: THREE.Matrix4;
}

export interface Tileset3DPickResult {
  featureId: string;
  layerId: string;
  featureKey: string;
  /** When true, featureKey may upgrade after async EXT_mesh_features texture read. */
  pendingAsyncMeshFeature: boolean;
  intersection: TilesetPickIntersection;
}

export function pickTileset3DFeatureAtScreen(
  layerId: string,
  tiles: AtlasTilesRenderer,
  camera: Tileset3DPickCamera,
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number
): Tileset3DPickResult | null {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return null;
  }

  const ndcX = (screenX / canvasWidth) * 2 - 1;
  const ndcY = -(screenY / canvasHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), {
    projectionMatrix: camera.projectionMatrix,
    matrixWorldInverse: camera.matrixWorldInverse
  } as THREE.Camera);

  const intersects: THREE.Intersection[] = [];
  if (!tiles.raycast) {
    return null;
  }

  tiles.raycast(raycaster, intersects);

  if (intersects.length === 0) {
    return null;
  }

  const intersection = intersects[0];
  const hitObject = intersection?.object;
  if (!hitObject) {
    return null;
  }

  const pickIntersection = intersection as TilesetPickIntersection;
  const featureKey = featureKeyFromTilesetPickObject(hitObject, pickIntersection);
  const pendingAsyncMeshFeature = meshFeaturePickNeedsAsync(pickIntersection);

  return {
    layerId,
    featureKey,
    featureId: formatTileset3DFeatureId(layerId, featureKey),
    pendingAsyncMeshFeature,
    intersection: pickIntersection
  };
}

/** Upgrade a provisional pick after async EXT_mesh_features texture read completes. */
export async function resolveAsyncMeshFeaturePick(
  pick: Tileset3DPickResult
): Promise<Tileset3DPickResult | null> {
  if (!pick.pendingAsyncMeshFeature) {
    return pick;
  }

  const meshFeatureId = await resolveMeshFeatureIdAsync(pick.intersection);
  if (meshFeatureId === null) {
    return null;
  }

  const objectUuid = pick.intersection.object.uuid;
  const featureKey = `${TILESET3D_MESH_FEATURE_PREFIX}${meshFeatureId}@${objectUuid}`;

  return {
    layerId: pick.layerId,
    featureKey,
    featureId: formatTileset3DFeatureId(pick.layerId, featureKey),
    pendingAsyncMeshFeature: false,
    intersection: pick.intersection
  };
}
