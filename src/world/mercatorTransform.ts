import maplibregl from "maplibre-gl";
import * as THREE from "three";

/** Visible marker radius at Lab framing altitudes (~12 km). */
const DEFAULT_MARKER_RADIUS_METERS = 1_500;

/** Lift markers above the map plane so they win the shared depth buffer. */
const MARKER_VERTICAL_OFFSET_METERS = 300;

/** Build the model matrix for a geographic sphere marker in MapLibre mercator space. */
export function createMarkerModelMatrix(
  lng: number,
  lat: number,
  altitudeMeters = 0,
  radiusMeters = DEFAULT_MARKER_RADIUS_METERS
): THREE.Matrix4 {
  const elevationMeters = altitudeMeters + MARKER_VERTICAL_OFFSET_METERS;
  const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], elevationMeters);
  const meterScale = mercator.meterInMercatorCoordinateUnits();
  const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

  return new THREE.Matrix4()
    .makeTranslation(mercator.x, mercator.y, mercator.z)
    .scale(
      new THREE.Vector3(
        meterScale * radiusMeters,
        -meterScale * radiusMeters,
        meterScale * radiusMeters
      )
    )
    .multiply(rotationX);
}

/** Build a flat ground-plane matrix for circular markup in MapLibre mercator space. */
export function createMercatorMatrix(
  lng: number,
  lat: number,
  altitudeMeters = 0,
  radiusMeters: number
): THREE.Matrix4 {
  const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitudeMeters);
  const meterScale = mercator.meterInMercatorCoordinateUnits();

  return new THREE.Matrix4()
    .makeTranslation(mercator.x, mercator.y, mercator.z)
    .scale(new THREE.Vector3(meterScale * radiusMeters, -meterScale * radiusMeters, 1));
}

/** Build a flat ground-plane matrix with one mercator unit equal to one meter. */
export function createMercatorGroundMatrix(
  lng: number,
  lat: number,
  altitudeMeters = 0
): THREE.Matrix4 {
  const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitudeMeters);
  const meterScale = mercator.meterInMercatorCoordinateUnits();

  return new THREE.Matrix4()
    .makeTranslation(mercator.x, mercator.y, mercator.z)
    .scale(new THREE.Vector3(meterScale, -meterScale, 1));
}

export { DEFAULT_MARKER_RADIUS_METERS, MARKER_VERTICAL_OFFSET_METERS };
