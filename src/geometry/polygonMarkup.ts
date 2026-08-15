import { centroid, polygon as turfPolygon } from "@turf/turf";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import type { GeoRing, WorldPolygonMarkup } from "../types/worldMarkup";

export function closeRing(ring: GeoRing): GeoRing {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }

  return [...ring, first];
}

export function centroidOfRing(ring: GeoRing): { lng: number; lat: number } {
  const closed = closeRing(ring);
  const feature = turfPolygon([closed.map(([lng, lat]) => [lng, lat])]);
  const center = centroid(feature);

  return {
    lng: center.geometry.coordinates[0],
    lat: center.geometry.coordinates[1]
  };
}

export function polygonMarkupFromRing(
  id: string,
  ring: GeoRing,
  altitudeMeters?: number
): WorldPolygonMarkup {
  const anchor = centroidOfRing(ring);

  return {
    kind: "polygon",
    id,
    lng: anchor.lng,
    lat: anchor.lat,
    ring,
    altitudeMeters
  };
}

export function ringToLocalShape(ring: GeoRing, anchorLng: number, anchorLat: number): THREE.Shape {
  const anchorMercator = maplibregl.MercatorCoordinate.fromLngLat([anchorLng, anchorLat]);
  const meterScale = anchorMercator.meterInMercatorCoordinateUnits();
  const shape = new THREE.Shape();

  ring.forEach(([lng, lat], index) => {
    const point = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
    const eastMeters = (point.x - anchorMercator.x) / meterScale;
    const northMeters = (anchorMercator.y - point.y) / meterScale;

    if (index === 0) {
      shape.moveTo(eastMeters, northMeters);
      return;
    }

    shape.lineTo(eastMeters, northMeters);
  });

  shape.closePath();
  return shape;
}

export function createPolygonShapeGeometry(
  ring: GeoRing,
  anchorLng: number,
  anchorLat: number
): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(ringToLocalShape(ring, anchorLng, anchorLat));
}
