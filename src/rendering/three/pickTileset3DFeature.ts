import * as THREE from "three";
import {
  featureKeyFromTilesetPickObject,
  formatTileset3DFeatureId
} from "../../interaction/tileset3dFeatureIds";
import type { AtlasTilesRenderer } from "./tilesRendererLoader";

export interface Tileset3DPickCamera {
  projectionMatrix: THREE.Matrix4;
  matrixWorldInverse: THREE.Matrix4;
}

export interface Tileset3DPickResult {
  featureId: string;
  layerId: string;
  featureKey: string;
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

  const featureKey = featureKeyFromTilesetPickObject(
    hitObject,
    intersection as Parameters<typeof featureKeyFromTilesetPickObject>[1]
  );

  return {
    layerId,
    featureKey,
    featureId: formatTileset3DFeatureId(layerId, featureKey)
  };
}
