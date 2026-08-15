import type { Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
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
}

/** Whether overlay matrices should use MapLibre globe model placement. */
export function usesGlobeOverlayProjection(viewMode: AtlasViewMode): boolean {
  return viewMode === "globe";
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
    const dimensions = measureLabelSpriteMeters(markup.text);
    return createLabelModelMatrix(
      markup.lng,
      markup.lat,
      altitudeMeters,
      dimensions.widthMeters,
      dimensions.heightMeters
    );
  }

  return createMarkerModelMatrix(
    markup.lng,
    markup.lat,
    altitudeMeters,
    markup.radiusMeters ?? DEFAULT_MARKER_RADIUS_METERS
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
    const dimensions = measureLabelSpriteMeters(markup.text);
    const elevationMeters = altitudeMeters + MARKER_VERTICAL_OFFSET_METERS;
    return withLocalScale(
      matrixFromMapLibreModel(map, markup.lng, markup.lat, elevationMeters),
      dimensions.widthMeters,
      -dimensions.heightMeters,
      1
    );
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

/** Build the overlay model matrix for markup in the active view mode. */
export function createOverlayMatrixForMarkup(
  markup: WorldMarkup,
  altitudeMeters: number,
  context: OverlayTransformContext
): THREE.Matrix4 {
  if (usesGlobeOverlayProjection(context.viewMode) && context.map) {
    return createGlobeMatrixForMarkup(context.map, markup, altitudeMeters);
  }

  return createMercatorMatrixForMarkup(markup, altitudeMeters);
}
