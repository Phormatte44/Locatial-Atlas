import type { ErrorEvent } from "maplibre-gl";
import type { MapErrorKind } from "../../types/mapError";
import { ATLAS_TERRAIN_SOURCE_ID } from "./terrainSetup";

export interface ClassifiedMapError {
  kind: MapErrorKind;
  message: string;
  recoverable: boolean;
  sourceId?: string;
}

/** MapLibre merges source/tile metadata onto error events at runtime. */
type MapLibreErrorPayload = ErrorEvent & {
  sourceId?: string;
  tile?: unknown;
};

export function classifyMapLibreError(event: MapLibreErrorPayload): ClassifiedMapError {
  const message = event.error?.message ?? "Unknown map error";
  const sourceId = event.sourceId ?? undefined;

  if (sourceId === ATLAS_TERRAIN_SOURCE_ID) {
    return {
      kind: "terrain-load",
      message,
      recoverable: true,
      sourceId
    };
  }

  if (sourceId) {
    return {
      kind: "source-load",
      message,
      recoverable: true,
      sourceId
    };
  }

  if (event.tile) {
    return {
      kind: "tile-load",
      message,
      recoverable: true
    };
  }

  if (/style/i.test(message)) {
    return {
      kind: "style-load",
      message,
      recoverable: false
    };
  }

  return {
    kind: "render",
    message,
    recoverable: true
  };
}
