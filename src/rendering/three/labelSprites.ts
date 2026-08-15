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
}

function hexToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** Build a billboard sprite for geographic label markup. */
export function createLabelSprite(options: LabelSpriteOptions): THREE.Sprite {
  const fontSizePx = options.fontSizePx ?? DEFAULT_LABEL_FONT_PX;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
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
  context.lineWidth = options.highlighted ? 4 : 3;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = "#ffffff";
  context.fillText(options.text, LABEL_PADDING_PX, fontSizePx + LABEL_PADDING_PX / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  return new THREE.Sprite(material);
}

export function disposeLabelSprite(sprite: THREE.Sprite): void {
  const material = sprite.material;
  if (!(material instanceof THREE.SpriteMaterial)) {
    return;
  }

  material.map?.dispose();
  material.dispose();
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
