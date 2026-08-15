/** Internal optional loader for 3d-tiles-renderer — never exported from `src/index.ts`. */

import type * as THREE from "three";

export interface AtlasTilesRenderer {
  group: THREE.Group;
  root: { transform?: number[] } | null;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  getBoundingSphere(target: THREE.Sphere): boolean;
  getBoundingBox(target: THREE.Box3): boolean;
  getOrientedBoundingBox(targetBox: THREE.Box3, targetMatrix: THREE.Matrix4): boolean;
  raycast?(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void;
  registerPlugin?(plugin: unknown): void;
  setCamera(camera: THREE.Camera): void;
  setResolutionFromRenderer(camera: THREE.Camera, renderer: THREE.WebGLRenderer): void;
  update(): void;
  dispose(): void;
  manager: {
    addHandler(pattern: RegExp, loader: unknown): void;
  };
}

export interface AtlasTilesRendererConstructor {
  new (url: string): AtlasTilesRenderer;
}

export interface AtlasTilesRendererModule {
  TilesRenderer: AtlasTilesRendererConstructor;
}

let tilesRendererLoadPromise: Promise<AtlasTilesRendererModule | null> | null = null;

export const TILESET3D_RENDERER_MISSING_MESSAGE =
  "3D Tiles rendering requires the optional peer dependency `3d-tiles-renderer`. " +
  "Install it in your host app (for example: npm install 3d-tiles-renderer) alongside `three`.";

export function loadTilesRendererModule(): Promise<AtlasTilesRendererModule | null> {
  if (!tilesRendererLoadPromise) {
    tilesRendererLoadPromise = import("3d-tiles-renderer")
      .then((mod: { TilesRenderer?: AtlasTilesRendererConstructor }) =>
        mod.TilesRenderer ? { TilesRenderer: mod.TilesRenderer } : null
      )
      .catch(() => null);
  }

  return tilesRendererLoadPromise;
}

/** Reset cached loader state (tests / style swaps). */
export function resetTilesRendererLoaderForTests(): void {
  tilesRendererLoadPromise = null;
}
