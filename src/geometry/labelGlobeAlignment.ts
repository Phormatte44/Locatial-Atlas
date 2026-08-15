import * as THREE from "three";
import { lerp } from "../camera/easing";
import type { OverlayTransformContext } from "../world/overlayModelMatrix";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Resolve 0–1 globeness for label orientation and legibility (0 = mercator, 1 = globe). */
export function resolveLabelGlobeness(context: OverlayTransformContext): number {
  if (context.viewMode === "mercator") {
    return 0;
  }

  if (context.viewMode === "globe") {
    return context.map ? 1 : 0;
  }

  return clamp01(context.projectionTransition ?? 0);
}

/** Whether labels should use tangent-plane meshes instead of mercator billboards. */
export function labelUsesTangentPlane(globeness: number): boolean {
  return globeness > 0.0001;
}

/** Scale and opacity tweaks for label legibility across globe↔mercator blend. */
export function labelLegibilityForGlobeness(globeness: number): {
  scale: number;
  opacity: number;
} {
  const t = clamp01(globeness);

  return {
    scale: lerp(1, 1.2, t),
    opacity: lerp(0.9, 1, t)
  };
}

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _positionB = new THREE.Vector3();
const _quaternionB = new THREE.Quaternion();
const _scaleB = new THREE.Vector3();

/** Blend mercator billboard and globe tangent label model matrices. */
export function blendLabelModelMatrices(
  mercatorMatrix: THREE.Matrix4,
  globeMatrix: THREE.Matrix4,
  globeness: number
): THREE.Matrix4 {
  const t = clamp01(globeness);

  if (t <= 0) {
    return mercatorMatrix.clone();
  }

  if (t >= 1) {
    return globeMatrix.clone();
  }

  mercatorMatrix.decompose(_position, _quaternion, _scale);
  globeMatrix.decompose(_positionB, _quaternionB, _scaleB);

  _position.lerp(_positionB, t);
  _quaternion.slerp(_quaternionB, t);
  _scale.lerp(_scaleB, t);

  return new THREE.Matrix4().compose(_position, _quaternion, _scale);
}
