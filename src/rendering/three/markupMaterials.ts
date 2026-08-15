import * as THREE from "three";
import type { WorldMarkup } from "../../types/worldMarkup";

/** Mesh markup kinds that can use lit PBR materials. */
export type LitMarkupKind = Extract<WorldMarkup["kind"], "sphere" | "polygon" | "circle">;

export interface MarkupMaterialCreateOptions {
  kind: LitMarkupKind | "line";
  color: number;
  opacity: number;
  /** When true, mesh markup uses MeshStandardMaterial under OverlayLightingRig. */
  lightingEnabled: boolean;
}

const OVERLAY_MATERIAL_FLAGS = {
  transparent: true,
  depthTest: false,
  depthWrite: false
} as const;

/** Default opacity for a markup kind in normal or highlighted state. */
export function defaultOpacityForMarkup(kind: WorldMarkup["kind"], highlighted: boolean): number {
  if (highlighted) {
    switch (kind) {
      case "sphere":
      case "line":
        return 1;
      case "circle":
        return 0.42;
      case "polygon":
        return 0.38;
      case "label":
        return 1;
    }
  }

  switch (kind) {
    case "sphere":
      return 0.92;
    case "line":
      return 0.88;
    case "circle":
      return 0.28;
    case "polygon":
      return 0.24;
    case "label":
      return 1;
  }
}

/** Whether a mesh markup kind should receive directional lighting. */
export function usesLitMeshMaterial(kind: WorldMarkup["kind"], lightingEnabled: boolean): kind is LitMarkupKind {
  return lightingEnabled && (kind === "sphere" || kind === "polygon" || kind === "circle");
}

/** Whether a lit mesh kind participates in overlay shadow casting. */
export function markupCastsOverlayShadow(kind: LitMarkupKind): boolean {
  return kind === "sphere";
}

/** Whether a lit mesh kind participates in overlay shadow receiving. */
export function markupReceivesOverlayShadow(kind: LitMarkupKind): boolean {
  return kind === "polygon" || kind === "circle";
}

/** Apply cast/receive shadow flags for lit mesh markup. */
export function applyOverlayShadowFlags(
  mesh: THREE.Mesh,
  kind: LitMarkupKind,
  shadowsEnabled: boolean
): void {
  mesh.castShadow = shadowsEnabled && markupCastsOverlayShadow(kind);
  mesh.receiveShadow = shadowsEnabled && markupReceivesOverlayShadow(kind);
}

/** Create overlay material for line or mesh markup. Labels use SpriteMaterial separately. */
export function createMarkupMaterial(options: MarkupMaterialCreateOptions): THREE.Material {
  const { kind, color, opacity, lightingEnabled } = options;

  if (kind === "line") {
    return new THREE.LineBasicMaterial({
      color,
      opacity,
      ...OVERLAY_MATERIAL_FLAGS
    });
  }

  const side = kind === "sphere" ? THREE.FrontSide : THREE.DoubleSide;

  if (lightingEnabled) {
    return new THREE.MeshStandardMaterial({
      color,
      opacity,
      side,
      roughness: kind === "sphere" ? 0.55 : 0.78,
      metalness: 0,
      ...OVERLAY_MATERIAL_FLAGS
    });
  }

  return new THREE.MeshBasicMaterial({
    color,
    opacity,
    side,
    ...OVERLAY_MATERIAL_FLAGS
  });
}

/** Update color and opacity on reusable overlay materials. */
export function applyMarkupMaterialAppearance(
  material: THREE.Material,
  color: number,
  opacity: number
): void {
  if (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.LineBasicMaterial
  ) {
    material.color.setHex(color);
    material.opacity = opacity;
  }
}

/** Swap a mesh to the correct lit/unlit material mode while preserving appearance. */
export function replaceMeshMarkupMaterial(
  mesh: THREE.Mesh,
  kind: LitMarkupKind,
  color: number,
  opacity: number,
  lightingEnabled: boolean
): void {
  const previous = mesh.material;
  if (previous instanceof THREE.Material) {
    previous.dispose();
  }

  mesh.material = createMarkupMaterial({
    kind,
    color,
    opacity,
    lightingEnabled
  });
}

/** Resolve tintable overlay material from a markup object, if present. */
export function getTintableMarkupMaterial(
  object: THREE.Object3D
): THREE.LineBasicMaterial | THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | null {
  if (object instanceof THREE.Line) {
    const material = object.material;
    return material instanceof THREE.LineBasicMaterial ? material : null;
  }

  if (object instanceof THREE.Mesh) {
    const material = object.material;
    if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) {
      return material;
    }
  }

  return null;
}
