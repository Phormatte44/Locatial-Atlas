import { along, length, lineString } from "@turf/turf";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { interpolateGeodesic } from "../camera/geodesicInterpolation";
import type { GeoRing, WorldLineMarkup } from "../types/worldMarkup";

export function midpointOfPath(path: GeoRing): { lng: number; lat: number } {
  if (path.length === 0) {
    return { lng: 0, lat: 0 };
  }

  if (path.length === 1) {
    return { lng: path[0][0], lat: path[0][1] };
  }

  const feature = lineString(path.map(([lng, lat]) => [lng, lat]));
  const halfDistanceKm = length(feature, { units: "kilometers" }) / 2;
  const midpoint = along(feature, halfDistanceKm, { units: "kilometers" });

  return {
    lng: midpoint.geometry.coordinates[0] ?? path[0][0],
    lat: midpoint.geometry.coordinates[1] ?? path[0][1]
  };
}

export function sampleGeodesicPath(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  segments = 64
): GeoRing {
  const path: GeoRing = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const point = interpolateGeodesic(fromLng, fromLat, toLng, toLat, progress);
    path.push([point.lng, point.lat]);
  }

  return path;
}

export function lineMarkupFromPath(
  id: string,
  path: GeoRing,
  altitudeMeters?: number
): WorldLineMarkup {
  const anchor = midpointOfPath(path);

  return {
    kind: "line",
    id,
    lng: anchor.lng,
    lat: anchor.lat,
    path,
    altitudeMeters
  };
}

/** Build mercator-local line geometry (single-anchor meter frame). Prefer `createGlobeAwareLineGeometry` for overlays. */
export function createLineGeometry(
  path: GeoRing,
  anchorLng: number,
  anchorLat: number
): THREE.BufferGeometry {
  const anchorMercator = maplibregl.MercatorCoordinate.fromLngLat([anchorLng, anchorLat]);
  const meterScale = anchorMercator.meterInMercatorCoordinateUnits();
  const positions: number[] = [];

  for (const [lng, lat] of path) {
    const point = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
    const eastMeters = (point.x - anchorMercator.x) / meterScale;
    const northMeters = (anchorMercator.y - point.y) / meterScale;
    positions.push(eastMeters, northMeters, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
