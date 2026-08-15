import * as THREE from "three";
import type { WorldMarkup } from "../../types/worldMarkup";
import { highlightedMarkerColorForId, markerColorForId } from "./markerColors";

/** Mesh markup kinds that can use lit PBR materials. */
export type LitMarkupKind = Extract<WorldMarkup["kind"], "sphere" | "polygon" | "circle" | "ellipse">;

export interface MarkupMaterialCreateOptions {
  kind: LitMarkupKind | "line";
  color: number;
  opacity: number;
  /** When true, mesh markup uses MeshStandardMaterial under OverlayLightingRig. */
  lightingEnabled: boolean;
  strokeWidth?: number;
}

/** Parse a CSS hex color string to a 0xRRGGBB integer, or null when invalid. */
export function parseCssColorToHex(color: string): number | null {
  const normalized = color.trim();
  if (!normalized.startsWith("#")) {
    return null;
  }

  const hex = normalized.slice(1);
  if (hex.length === 3) {
    const red = Number.parseInt(hex[0] + hex[0], 16);
    const green = Number.parseInt(hex[1] + hex[1], 16);
    const blue = Number.parseInt(hex[2] + hex[2], 16);
    if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return (red << 16) | (green << 8) | blue;
  }

  if (hex.length === 6) {
    const value = Number.parseInt(hex, 16);
    return Number.isNaN(value) ? null : value;
  }

  return null;
}

function brightenColor(color: number): number {
  const red = Math.min(255, ((color >> 16) & 0xff) + 40);
  const green = Math.min(255, ((color >> 8) & 0xff) + 40);
  const blue = Math.min(255, (color & 0xff) + 40);
  return (red << 16) | (green << 8) | blue;
}

function resolveAuthoredColor(
  markup: WorldMarkup,
  role: "fill" | "stroke",
  highlighted: boolean
): number | null {
  const style = markup.style;
  if (!style) {
    return null;
  }

  const authored = role === "fill" ? style.fillColor : style.strokeColor;
  const fallback = role === "stroke" ? style.fillColor : style.strokeColor;
  const parsed = parseCssColorToHex(authored ?? fallback ?? "");
  if (parsed === null) {
    return null;
  }

  return highlighted ? brightenColor(parsed) : parsed;
}

/** Resolve mesh/fill tint for markup, honoring author fillColor when present. */
export function resolveMarkupFillColor(markup: WorldMarkup, highlighted: boolean): number {
  return (
    resolveAuthoredColor(markup, "fill", highlighted) ??
    (highlighted ? highlightedMarkerColorForId(markup.id) : markerColorForId(markup.id))
  );
}

/** Resolve stroke/line tint for markup, honoring author strokeColor when present. */
export function resolveMarkupStrokeColor(markup: WorldMarkup, highlighted: boolean): number {
  return (
    resolveAuthoredColor(markup, "stroke", highlighted) ??
    resolveMarkupFillColor(markup, highlighted)
  );
}

/** Resolve opacity for markup kind, honoring author opacity when present. */
export function resolveMarkupOpacity(
  markup: WorldMarkup,
  kind: WorldMarkup["kind"],
  highlighted: boolean,
  legibilityFactor = 1
): number {
  const authored = markup.style?.opacity;
  if (authored !== undefined) {
    const clamped = Math.max(0, Math.min(1, authored));
    if (highlighted) {
      return Math.min(1, clamped * 1.15) * legibilityFactor;
    }
    return clamped * legibilityFactor;
  }

  return defaultOpacityForMarkup(kind, highlighted) * legibilityFactor;
}

/** Resolve authored stroke width when provided. */
export function resolveMarkupStrokeWidth(markup: WorldMarkup): number | undefined {
  const width = markup.style?.strokeWidth;
  if (width === undefined || width <= 0) {
    return undefined;
  }
  return width;
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
      case "ellipse":
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
    case "ellipse":
      return 0.28;
    case "polygon":
      return 0.24;
    case "label":
      return 1;
  }
}

/** Whether a mesh markup kind should receive directional lighting. */
export function usesLitMeshMaterial(kind: WorldMarkup["kind"], lightingEnabled: boolean): kind is LitMarkupKind {
  return lightingEnabled && (kind === "sphere" || kind === "polygon" || kind === "circle" || kind === "ellipse");
}

/** Whether a lit mesh kind participates in overlay shadow casting. */
export function markupCastsOverlayShadow(kind: LitMarkupKind): boolean {
  return kind === "sphere";
}

/** Whether a lit mesh kind participates in overlay shadow receiving. */
export function markupReceivesOverlayShadow(kind: LitMarkupKind): boolean {
  return kind === "polygon" || kind === "circle" || kind === "ellipse";
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
  const { kind, color, opacity, lightingEnabled, strokeWidth } = options;

  if (kind === "line") {
    return new THREE.LineBasicMaterial({
      color,
      opacity,
      linewidth: strokeWidth ?? 1,
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
  opacity: number,
  strokeWidth?: number
): void {
  if (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.LineBasicMaterial
  ) {
    material.color.setHex(color);
    material.opacity = opacity;
  }

  if (material instanceof THREE.LineBasicMaterial && strokeWidth !== undefined) {
    material.linewidth = strokeWidth;
  }
}

/** Swap a mesh to the correct lit/unlit material mode while preserving appearance. */
export function replaceMeshMarkupMaterial(
  mesh: THREE.Mesh,
  kind: LitMarkupKind,
  color: number,
  opacity: number,
  lightingEnabled: boolean,
  strokeWidth?: number
): void {
  const previous = mesh.material;
  if (previous instanceof THREE.Material) {
    previous.dispose();
  }

  mesh.material = createMarkupMaterial({
    kind,
    color,
    opacity,
    lightingEnabled,
    strokeWidth
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
