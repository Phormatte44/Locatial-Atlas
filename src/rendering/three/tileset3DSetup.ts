import type { Tileset3DLayerDefinition } from "../../types/tileset3DLayer";
import type { Tileset3DSourceLoadTracker } from "../../data/tileset3DSourceLoadTracker";
import { Tileset3DOverlayAdapter } from "./Tileset3DOverlayAdapter";

export const ATLAS_TILESET3D_PREFIX = "atlas-tileset3d";

export function tileset3DCustomLayerId(layerId: string): string {
  return `${ATLAS_TILESET3D_PREFIX}-${layerId}`;
}

function isTilesetRootPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return (
    typeof record.asset === "object" &&
    record.asset !== null &&
    (typeof record.root === "object" || Array.isArray(record.children))
  );
}

export async function validateTileset3DUrl(url: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to load 3D Tiles tileset (${response.status}): ${url}`);
  }

  const payload: unknown = await response.json();

  if (!isTilesetRootPayload(payload)) {
    throw new Error(`URL does not appear to be a 3D Tiles tileset root: ${url}`);
  }
}

export interface SyncTileset3DLayersOptions {
  adapter: Tileset3DOverlayAdapter;
  definitions: Tileset3DLayerDefinition[];
  loadTracker: Tileset3DSourceLoadTracker;
  abortControllers: Map<string, AbortController>;
  onLayerMounted?: () => void;
}

/** Sync enabled 3D Tiles layers through the Three.js overlay adapter. */
export function syncTileset3DLayers(options: SyncTileset3DLayersOptions): void {
  void options.adapter.syncLayers({
    definitions: options.definitions,
    loadTracker: options.loadTracker,
    abortControllers: options.abortControllers,
    onLayerMounted: options.onLayerMounted
  });
}

export async function retryTileset3DLayer(
  definition: Tileset3DLayerDefinition,
  options: SyncTileset3DLayersOptions
): Promise<void> {
  const existing = options.abortControllers.get(definition.id);
  existing?.abort();
  options.abortControllers.delete(definition.id);
  options.adapter.removeLayerForRetry(definition.id);
  options.loadTracker.markIdle(definition.id);

  const definitions = options.definitions.some((layer) => layer.id === definition.id)
    ? options.definitions
    : [...options.definitions, definition];

  await options.adapter.syncLayers({
    definitions,
    loadTracker: options.loadTracker,
    abortControllers: options.abortControllers,
    onLayerMounted: options.onLayerMounted
  });
}

export function cancelAllTileset3DLoads(abortControllers: Map<string, AbortController>): void {
  for (const controller of abortControllers.values()) {
    controller.abort();
  }

  abortControllers.clear();
}
