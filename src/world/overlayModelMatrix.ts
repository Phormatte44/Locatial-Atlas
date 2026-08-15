import type { Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import {
  blendLabelModelMatrices,
  labelLegibilityForGlobeness,
  resolveLabelGlobeness
} from "../geometry/labelGlobeAlignment";
import { measureLabelSpriteMeters } from "../geometry/labelMarkup";
import { createLabelModelMatrix } from "../rendering/three/labelSprites";
import type { AtlasViewMode } from "../types/viewMode";
import type { WorldMarkup } from "../types/worldMarkup";
import {
  createMarkerModelMatrix,
  createMercatorGroundMatrix,
  createMercatorMatrix,
  DEFAULT_MARKER_RADIUS_METERS,
  MARKER_VERTICAL_OFFSET_METERS
} from "./mercatorTransform";

export interface OverlayTransformContext {
  viewMode: AtlasViewMode;
  map: MapLibreMap | null;
  /** MapLibre globe↔mercator blend progress from the active custom-layer frame. */
  projectionTransition?: number;
}

/** Whether overlay matrices should use MapLibre globe model placement. */
export function usesGlobeOverlayProjection(context: OverlayTransformContext): boolean {
  if (context.viewMode === "mercator") {
    return false;
  }

  if (context.viewMode === "globe") {
    return Boolean(context.map);
  }

  const transition = context.projectionTransition ?? 0;
  return transition > 0 && Boolean(context.map);
}

function matrixFromMapLibreModel(
  map: MapLibreMap,
  lng: number,
  lat: number,
  altitudeMeters: number
): THREE.Matrix4 {
  return new THREE.Matrix4().fromArray(map.transform.getMatrixForModel([lng, lat], altitudeMeters));
}

function withLocalScale(base: THREE.Matrix4, x: number, y: number, z: number): THREE.Matrix4 {
  return base.clone().multiply(new THREE.Matrix4().makeScale(x, y, z));
}

function createMercatorMatrixForMarkup(markup: WorldMarkup, altitudeMeters: number): THREE.Matrix4 {
  if (markup.kind === "circle") {
    return createMercatorMatrix(markup.lng, markup.lat, altitudeMeters, markup.radiusMeters);
  }

  if (markup.kind === "polygon" || markup.kind === "line") {
    return createMercatorGroundMatrix(markup.lng, markup.lat, altitudeMeters);
  }

  if (markup.kind === "label") {
    return createMercatorLabelMatrix(markup, altitudeMeters);
  }

  return createMarkerModelMatrix(
    markup.lng,
    markup.lat,
    altitudeMeters,
    markup.radiusMeters ?? DEFAULT_MARKER_RADIUS_METERS
  );
}

function createMercatorLabelMatrix(
  markup: Extract<WorldMarkup, { kind: "label" }>,
  altitudeMeters: number
): THREE.Matrix4 {
  const dimensions = measureLabelSpriteMeters(markup.text);
  return createLabelModelMatrix(
    markup.lng,
    markup.lat,
    altitudeMeters,
    dimensions.widthMeters,
    dimensions.heightMeters
  );
}

function createGlobeLabelMatrix(
  map: MapLibreMap,
  markup: Extract<WorldMarkup, { kind: "label" }>,
  altitudeMeters: number
): THREE.Matrix4 {
  const dimensions = measureLabelSpriteMeters(markup.text);
  const elevationMeters = altitudeMeters + MARKER_VERTICAL_OFFSET_METERS;
  return withLocalScale(
    matrixFromMapLibreModel(map, markup.lng, markup.lat, elevationMeters),
    dimensions.widthMeters,
    -dimensions.heightMeters,
    1
  );
}

function createLabelOverlayMatrix(
  markup: Extract<WorldMarkup, { kind: "label" }>,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.Matrix4 {
  const mercatorMatrix = createMercatorLabelMatrix(markup, altitudeMeters);
  const globeness = resolveLabelGlobeness(context);

  if (globeness <= 0 || !context.map) {
    return mercatorMatrix;
  }

  const globeMatrix = createGlobeLabelMatrix(context.map, markup, altitudeMeters);
  const blended = blendLabelModelMatrices(mercatorMatrix, globeMatrix, globeness);
  const legibility = labelLegibilityForGlobeness(globeness);

  return blended.multiply(
    new THREE.Matrix4().makeScale(legibility.scale, legibility.scale, legibility.scale)
  );
}

function createGlobeMatrixForMarkup(
  map: MapLibreMap,
  markup: WorldMarkup,
  altitudeMeters: number
): THREE.Matrix4 {
  if (markup.kind === "circle") {
    return withLocalScale(
      matrixFromMapLibreModel(map, markup.lng, markup.lat, altitudeMeters),
      markup.radiusMeters,
      markup.radiusMeters,
      1
    );
  }

  if (markup.kind === "polygon" || markup.kind === "line") {
    return matrixFromMapLibreModel(map, markup.lng, markup.lat, altitudeMeters);
  }

  if (markup.kind === "label") {
    return createGlobeLabelMatrix(map, markup, altitudeMeters);
  }

  const radiusMeters = markup.radiusMeters ?? DEFAULT_MARKER_RADIUS_METERS;
  const elevationMeters = altitudeMeters + MARKER_VERTICAL_OFFSET_METERS;
  return withLocalScale(
    matrixFromMapLibreModel(map, markup.lng, markup.lat, elevationMeters),
    radiusMeters,
    radiusMeters,
    radiusMeters
  );
}

function createGroundOverlayMatrix(
  markup: Extract<WorldMarkup, { kind: "line" | "polygon" | "circle" }>,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.Matrix4 {
  const mercatorMatrix = createMercatorGroundMatrix(markup.lng, markup.lat, altitudeMeters);
  const globeness = resolveLabelGlobeness(context);

  if (globeness <= 0 || !context.map) {
    return mercatorMatrix;
  }

  const globeMatrix = matrixFromMapLibreModel(
    context.map,
    markup.lng,
    markup.lat,
    altitudeMeters
  );

  if (globeness >= 1) {
    return globeMatrix;
  }

  return blendLabelModelMatrices(mercatorMatrix, globeMatrix, globeness);
}

/** Build the overlay model matrix for markup in the active view mode. */
export function createOverlayMatrixForMarkup(
  markup: WorldMarkup,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.Matrix4 {
  if (markup.kind === "label") {
    return createLabelOverlayMatrix(markup, altitudeMeters, context);
  }

  if (markup.kind === "line" || markup.kind === "polygon" || markup.kind === "circle") {
    return createGroundOverlayMatrix(markup, altitudeMeters, context);
  }

  if (usesGlobeOverlayProjection(context) && context.map) {
    return createGlobeMatrixForMarkup(context.map, markup, altitudeMeters);
  }

  return createMercatorMatrixForMarkup(markup, altitudeMeters);
}
