import type { Map as MapLibreMap } from "maplibre-gl";
import type { GeoRing, WorldMarkup } from "../types/worldMarkup";
import {
  computeGlobeLocalVertices,
  computeMercatorLocalVertices,
  lerpMarkupLocalVertices,
  markupGeometrySignature,
  resolveSourceRingForMarkup
} from "./globeMarkupGeometry";

/** Per-markup cached mercator/globe local vertices for projection-blend lerp. */
export interface MarkupVertexCacheEntry {
  signature: string;
  ring: GeoRing;
  vertexCount: number;
  anchorLng: number;
  anchorLat: number;
  altitudeMeters: number;
  globeGeneration: number;
  mercatorLocal: Float32Array;
  globeLocal: Float32Array;
}

/**
 * Invalidation rules for {@link MarkupVertexCache}:
 *
 * 1. **Markup change** — `clear()` or `invalidate(id)` when markups are replaced or edited
 *    (signature mismatch on next access also drops stale entries).
 * 2. **View mode settle** — `invalidateGlobe()` when Atlas view mode or MapLibre projection
 *    transition finishes (mercator ↔ globe no longer blending). Globe local vertices depend
 *    on settled projection matrices; mercator cache is retained.
 * 3. **Significant camera move** — `invalidateGlobe()` when map center, zoom, bearing, or
 *    pitch exceeds {@link CAMERA_SIGNATURE_THRESHOLDS}. Globe anchor inverses shift with
 *    camera; mercator cache is retained.
 */
export class MarkupVertexCache {
  private readonly entries = new Map<string, MarkupVertexCacheEntry>();
  private globeGeneration = 0;

  clear(): void {
    this.entries.clear();
    this.globeGeneration = 0;
  }

  invalidate(markupId: string): void {
    this.entries.delete(markupId);
  }

  /** Drop globe local vertices for all entries; mercator endpoints are kept. */
  invalidateGlobe(): void {
    this.globeGeneration += 1;
  }

  get(markupId: string): MarkupVertexCacheEntry | undefined {
    return this.entries.get(markupId);
  }

  ensureEntry(
    markup: Extract<WorldMarkup, { kind: "line" | "polygon" | "circle" | "ellipse" }>,
    map: MapLibreMap | null,
    altitudeMeters: number
  ): MarkupVertexCacheEntry | null {
    const signature = markupGeometrySignature(markup);
    if (!signature) {
      return null;
    }

    const existing = this.entries.get(markup.id);

    if (
      existing &&
      existing.signature === signature &&
      existing.altitudeMeters === altitudeMeters &&
      existing.globeGeneration === this.globeGeneration
    ) {
      return existing;
    }

    const ring =
      existing && existing.signature === signature ? existing.ring : resolveSourceRingForMarkup(markup);
    if (ring.length === 0) {
      return null;
    }

    const mercatorLocal =
      existing && existing.signature === signature
        ? existing.mercatorLocal
        : computeMercatorLocalVertices(ring, markup.lng, markup.lat);

    const globeLocal =
      map !== null
        ? computeGlobeLocalVertices(ring, map, markup.lng, markup.lat, altitudeMeters)
        : new Float32Array(ring.length * 3);

    const entry: MarkupVertexCacheEntry = {
      signature,
      ring,
      vertexCount: ring.length,
      anchorLng: markup.lng,
      anchorLat: markup.lat,
      altitudeMeters,
      globeGeneration: this.globeGeneration,
      mercatorLocal,
      globeLocal
    };

    this.entries.set(markup.id, entry);
    return entry;
  }

  applyBlendedVertices(
    positions: Float32Array,
    entry: MarkupVertexCacheEntry,
    globeness: number
  ): void {
    lerpMarkupLocalVertices(entry.mercatorLocal, entry.globeLocal, globeness, positions);
  }
}

/** Camera deltas that trigger globe vertex cache invalidation. */
export const CAMERA_SIGNATURE_THRESHOLDS = {
  centerLngLatDegrees: 0.01,
  zoom: 0.1,
  bearingDegrees: 1,
  pitchDegrees: 1
} as const;

export interface CameraSignature {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export function readCameraSignature(map: MapLibreMap): CameraSignature {
  const center = map.getCenter();
  return {
    lng: center.lng,
    lat: center.lat,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  };
}

export function hasSignificantCameraMove(
  previous: CameraSignature | null,
  current: CameraSignature
): boolean {
  if (!previous) {
    return false;
  }

  const lngDelta = Math.abs(current.lng - previous.lng);
  const latDelta = Math.abs(current.lat - previous.lat);

  return (
    lngDelta > CAMERA_SIGNATURE_THRESHOLDS.centerLngLatDegrees ||
    latDelta > CAMERA_SIGNATURE_THRESHOLDS.centerLngLatDegrees ||
    Math.abs(current.zoom - previous.zoom) > CAMERA_SIGNATURE_THRESHOLDS.zoom ||
    Math.abs(current.bearing - previous.bearing) > CAMERA_SIGNATURE_THRESHOLDS.bearingDegrees ||
    Math.abs(current.pitch - previous.pitch) > CAMERA_SIGNATURE_THRESHOLDS.pitchDegrees
  );
}
