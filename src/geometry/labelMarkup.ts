import type { AtlasPlace } from "../types/place";
import type { WorldLabelMarkup } from "../types/worldMarkup";

export const DEFAULT_LABEL_FONT_PX = 28;
export const LABEL_PADDING_PX = 12;

export interface LabelSpriteDimensions {
  widthMeters: number;
  heightMeters: number;
}

/** Measure label sprite size in meters for mercator placement and screen picking. */
export function measureLabelSpriteMeters(
  text: string,
  fontSizePx = DEFAULT_LABEL_FONT_PX
): LabelSpriteDimensions {
  if (typeof document === "undefined") {
    return { widthMeters: 4_000, heightMeters: 1_200 };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return { widthMeters: 4_000, heightMeters: 1_200 };
  }

  context.font = `${fontSizePx}px system-ui, sans-serif`;
  const textWidthPx = context.measureText(text).width + LABEL_PADDING_PX * 2;
  const textHeightPx = fontSizePx + LABEL_PADDING_PX * 2;
  const metersPerPixel = 18;

  return {
    widthMeters: textWidthPx * metersPerPixel,
    heightMeters: textHeightPx * metersPerPixel
  };
}

export function labelMarkupFromPlace(
  place: Pick<AtlasPlace, "id" | "name" | "lng" | "lat">,
  altitudeMeters = 800
): WorldLabelMarkup {
  return {
    kind: "label",
    id: `${place.id}-label`,
    lng: place.lng,
    lat: place.lat,
    text: place.name,
    altitudeMeters
  };
}
