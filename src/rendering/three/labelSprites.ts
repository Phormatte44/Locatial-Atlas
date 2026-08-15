import maplibregl from "maplibre-gl";
import * as THREE from "three";
import {
  DEFAULT_LABEL_FONT_PX,
  LABEL_PADDING_PX,
  measureLabelSpriteMeters,
  type LabelSpriteDimensions
} from "../../geometry/labelMarkup";
import { MARKER_VERTICAL_OFFSET_METERS } from "../../world/mercatorTransform";

export type { LabelSpriteDimensions };
export { measureLabelSpriteMeters };

export interface LabelSpriteOptions {
  text: string;
  accentColor: number;
  highlighted?: boolean;
  fontSizePx?: number;
  strokeWidth?: number;
}

function hexToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function createLabelCanvas(options: LabelSpriteOptions): HTMLCanvasElement | null {
  const fontSizePx = options.fontSizePx ?? DEFAULT_LABEL_FONT_PX;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.font = `${fontSizePx}px system-ui, sans-serif`;
  const textWidthPx = context.measureText(options.text).width + LABEL_PADDING_PX * 2;
  const textHeightPx = fontSizePx + LABEL_PADDING_PX * 2;
  canvas.width = textWidthPx;
  canvas.height = textHeightPx;

  context.font = `${fontSizePx}px system-ui, sans-serif`;
  context.fillStyle = options.highlighted ? "rgba(20, 20, 20, 0.94)" : "rgba(20, 20, 20, 0.82)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = hexToCss(options.accentColor);
  const borderWidth = options.strokeWidth ?? (options.highlighted ? 4 : 3);
  context.lineWidth = borderWidth;
  context.strokeRect(borderWidth / 2 + 1, borderWidth / 2 + 1, canvas.width - borderWidth - 2, canvas.height - borderWidth - 2);
  context.fillStyle = "#ffffff";
  context.fillText(options.text, LABEL_PADDING_PX, fontSizePx + LABEL_PADDING_PX / 2);

  return canvas;
}

function createLabelTexture(options: LabelSpriteOptions): THREE.CanvasTexture | null {
  const canvas = createLabelCanvas(options);
  if (!canvas) {
    return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function disposeLabelTextureMaterial(
  material: THREE.SpriteMaterial | THREE.MeshBasicMaterial
): void {
  material.map?.dispose();
  material.dispose();
}

/** Build a billboard sprite for geographic label markup in mercator projection. */
export function createLabelSprite(options: LabelSpriteOptions): THREE.Sprite {
  const texture = createLabelTexture(options);

  const material = new THREE.SpriteMaterial({
    map: texture ?? undefined,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  return new THREE.Sprite(material);
}

/** Build a tangent-plane label mesh for globe projection (respects model-matrix rotation). */
export function createLabelPlaneMesh(options: LabelSpriteOptions): THREE.Mesh {
  const texture = createLabelTexture(options);

  const material = new THREE.MeshBasicMaterial({
    map: texture ?? undefined,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
}

export function disposeLabelSprite(sprite: THREE.Sprite): void {
  const material = sprite.material;
  if (!(material instanceof THREE.SpriteMaterial)) {
    return;
  }

  disposeLabelTextureMaterial(material);
}

export function disposeLabelPlaneMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();

  const material = mesh.material;
  if (!(material instanceof THREE.MeshBasicMaterial)) {
    return;
  }

  disposeLabelTextureMaterial(material);
}

export function disposeLabelObject(object: THREE.Object3D): void {
  if (object instanceof THREE.Sprite) {
    disposeLabelSprite(object);
    return;
  }

  if (object instanceof THREE.Mesh) {
    disposeLabelPlaneMesh(object);
  }
}

export function applyLabelOpacity(object: THREE.Object3D, opacity: number): void {
  if (object instanceof THREE.Sprite) {
    const material = object.material;
    if (material instanceof THREE.SpriteMaterial) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
      material.needsUpdate = true;
    }
    return;
  }

  if (object instanceof THREE.Mesh) {
    const material = object.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
      material.needsUpdate = true;
    }
  }
}

export function labelObjectUsesTangentPlane(object: THREE.Object3D): boolean {
  return object instanceof THREE.Mesh && object.geometry instanceof THREE.PlaneGeometry;
}

/** Build a model matrix that scales a label sprite to geographic meter dimensions. */
export function createLabelModelMatrix(
  lng: number,
  lat: number,
  altitudeMeters: number,
  widthMeters: number,
  heightMeters: number
): THREE.Matrix4 {
  const elevationMeters = altitudeMeters + MARKER_VERTICAL_OFFSET_METERS;
  const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], elevationMeters);
  const meterScale = mercator.meterInMercatorCoordinateUnits();

  return new THREE.Matrix4()
    .makeTranslation(mercator.x, mercator.y, mercator.z)
    .scale(new THREE.Vector3(meterScale * widthMeters, -meterScale * heightMeters, 1));
}
