import * as THREE from "three";
import type { LightingSettings } from "../../types/lighting";

/** Shadow map resolution for overlay directional shadows. */
export const OVERLAY_SHADOW_MAP_SIZE = 1024;

/** Whether overlay shadows should be active for the given lighting settings. */
export function overlayShadowsActive(settings: LightingSettings): boolean {
  return settings.enabled && settings.shadowEnabled;
}

/** Configure directional-light shadow map quality and bias. */
export function configureOverlayDirectionalShadow(
  light: THREE.DirectionalLight,
  settings: LightingSettings
): void {
  const active = overlayShadowsActive(settings);

  light.castShadow = active;

  if (!active) {
    return;
  }

  light.shadow.mapSize.set(OVERLAY_SHADOW_MAP_SIZE, OVERLAY_SHADOW_MAP_SIZE);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = 0.02;
  light.shadow.intensity = settings.shadowIntensity;
}

/**
 * Fit the directional shadow ortho frustum to the current overlay anchor bounds.
 * Anchors must have updated world matrices before calling.
 */
export function updateOverlayShadowCamera(
  light: THREE.DirectionalLight,
  anchors: THREE.Object3D[],
  padding = 1.35
): void {
  if (anchors.length === 0) {
    return;
  }

  const bounds = new THREE.Box3();

  for (const anchor of anchors) {
    bounds.expandByObject(anchor);
  }

  if (bounds.isEmpty()) {
    return;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z, 0.00001) * padding;

  light.target.position.copy(center);
  light.target.updateMatrixWorld();

  const camera = light.shadow.camera;
  camera.left = -extent;
  camera.right = extent;
  camera.top = extent;
  camera.bottom = -extent;
  camera.near = 0.001;
  camera.far = extent * 6;
  camera.updateProjectionMatrix();
}

/** Shared ground-plane receiver for contact shadows beneath lit markup anchors. */
export function createOverlayShadowGroundReceiver(): THREE.Mesh {
  const material = new THREE.ShadowMaterial({
    opacity: 0.38,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;

  return mesh;
}
