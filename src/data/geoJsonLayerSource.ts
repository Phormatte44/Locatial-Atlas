import type { GeoJSON } from "geojson";

/** Empty collection used while async URL layers load. */
export const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: []
};

export function isGeoJsonUrl(data: unknown): data is string {
  return typeof data === "string";
}

/** Returns inline GeoJSON or an empty collection placeholder for URL sources. */
export function resolveInitialGeoJsonData(data: unknown): GeoJSON.FeatureCollection {
  return isGeoJsonUrl(data) ? EMPTY_GEOJSON : (data as GeoJSON.FeatureCollection);
}

export function layerUsesAsyncGeoJsonUrl(data: unknown): data is string {
  return isGeoJsonUrl(data);
}

export function isFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as GeoJSON.FeatureCollection).type === "FeatureCollection" &&
    Array.isArray((value as GeoJSON.FeatureCollection).features)
  );
}
