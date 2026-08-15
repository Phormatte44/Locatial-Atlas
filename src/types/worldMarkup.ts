/** Optional author style tokens consumed by the Three.js overlay renderer. */
export interface WorldMarkupStyle {
  /** CSS hex fill/tint color (e.g. "#C6FF3C"). */
  fillColor?: string;
  /** CSS hex stroke or line color. */
  strokeColor?: string;
  /** Fill or line opacity in 0–1 when the renderer supports it. */
  opacity?: number;
  /** Stroke width in CSS pixels where supported (lines, label borders). */
  strokeWidth?: number;
}

/** Base fields shared by all world-space markup items. */
export interface WorldMarkupBase {
  id: string;
  lng: number;
  lat: number;
  altitudeMeters?: number;
  /** Author style; omitted means renderer defaults (palette tint by id). */
  style?: WorldMarkupStyle;
}

/** Spherical markup anchored to a geographic point. */
export interface WorldSphereMarkup extends WorldMarkupBase {
  kind: "sphere";
  radiusMeters?: number;
}

/** Closed or open geographic ring in lng/lat order. */
export type GeoRing = Array<[lng: number, lat: number]>;

/** Flat circular markup on the ground plane. */
export interface WorldCircleMarkup extends WorldMarkupBase {
  kind: "circle";
  radiusMeters: number;
}

/** Flat elliptical markup on the ground plane. */
export interface WorldEllipseMarkup extends WorldMarkupBase {
  kind: "ellipse";
  radiusXMeters: number;
  radiusYMeters: number;
  bearingDegrees?: number;
}

/** Flat polygon markup on the ground plane. */
export interface WorldPolygonMarkup extends WorldMarkupBase {
  kind: "polygon";
  ring: GeoRing;
}

/** Geographic polyline markup in world space. */
export interface WorldLineMarkup extends WorldMarkupBase {
  kind: "line";
  path: GeoRing;
}

/** Billboard text label anchored to a geographic point. */
export interface WorldLabelMarkup extends WorldMarkupBase {
  kind: "label";
  text: string;
}

export type WorldMarkup =
  | WorldSphereMarkup
  | WorldCircleMarkup
  | WorldEllipseMarkup
  | WorldPolygonMarkup
  | WorldLineMarkup
  | WorldLabelMarkup;

/** Geographic anchor point used for hover/selection. */
export interface GeoAnchoredFeature {
  id: string;
  lng: number;
  lat: number;
}

export function getMarkupAnchor(markup: WorldMarkup): GeoAnchoredFeature {
  return {
    id: markup.id,
    lng: markup.lng,
    lat: markup.lat
  };
}

export function sphereMarkupFromMarker(marker: {
  id: string;
  lng: number;
  lat: number;
  altitudeMeters?: number;
}): WorldSphereMarkup {
  return {
    kind: "sphere",
    id: marker.id,
    lng: marker.lng,
    lat: marker.lat,
    altitudeMeters: marker.altitudeMeters
  };
}
