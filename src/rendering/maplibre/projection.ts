import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Point } from "maplibre-gl";
import type { GeographicPoint, ScreenPoint } from "../../types/projection";

interface MapLibreTransform {
  coordinatePoint(
    coord: maplibregl.MercatorCoordinate,
    elevation?: number,
    pixelMatrix?: number[]
  ): Point;
  _pixelMatrix3D: number[];
}

type MapWithTransform = MapLibreMap & {
  transform: MapLibreTransform;
};

function resolveGroundElevationMeters(map: MapLibreMap, lng: number, lat: number): number {
  return map.queryTerrainElevation([lng, lat]) ?? 0;
}

/** Project a geographic coordinate to map container screen space. */
export function projectGeoToScreen(
  map: MapLibreMap,
  lng: number,
  lat: number,
  altitudeMeters = 0,
  terrainEnabled = false
): ScreenPoint | null {
  if (!terrainEnabled && altitudeMeters === 0) {
    const projected = map.project([lng, lat]);
    return { x: projected.x, y: projected.y };
  }

  const groundElevationMeters = terrainEnabled ? resolveGroundElevationMeters(map, lng, lat) : 0;
  const totalElevationMeters = groundElevationMeters + altitudeMeters;

  if (altitudeMeters === 0) {
    const projected = map.project([lng, lat]);
    return { x: projected.x, y: projected.y };
  }

  const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
  const transform = (map as MapWithTransform).transform;
  const projected = transform.coordinatePoint(
    mercator,
    totalElevationMeters,
    transform._pixelMatrix3D
  );

  return { x: projected.x, y: projected.y };
}

/** Unproject a map container screen point to geographic coordinates. */
export function unprojectScreenToGeo(
  map: MapLibreMap,
  x: number,
  y: number,
  terrainEnabled = false
): GeographicPoint | null {
  const lngLat = map.unproject([x, y]);
  const altitudeMeters = terrainEnabled ? resolveGroundElevationMeters(map, lngLat.lng, lngLat.lat) : 0;

  return {
    lng: lngLat.lng,
    lat: lngLat.lat,
    altitudeMeters
  };
}

export function queryGroundElevationMeters(
  map: MapLibreMap,
  lng: number,
  lat: number,
  terrainEnabled: boolean
): number | null {
  if (!terrainEnabled) {
    return null;
  }

  return resolveGroundElevationMeters(map, lng, lat);
}
