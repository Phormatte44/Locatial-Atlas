import type { Tileset3DLayerDefinition } from "../../types/tileset3DLayer";
import type { Tileset3DSourceLoadTracker } from "../../data/tileset3DSourceLoadTracker";

export const ATLAS_TILESET3D_PREFIX = "atlas-tileset3d";

/** Shown when tileset metadata validates but rendering is not wired yet. */
export const TILESET3D_RENDERER_UNAVAILABLE_MESSAGE =
  "3D Tiles rendering is not enabled in Atlas yet. MapLibre GL JS 5.x has no native 3D Tiles source; " +
  "Foundation 47 ships the registry and async tileset validation only. " +
  "Live rendering will use a Three.js custom layer with 3d-tiles-renderer (see DECISIONS.md Foundation 47).";

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

interface SyncTileset3DLayersOptions {
  definitions: Tileset3DLayerDefinition[];
  loadTracker: Tileset3DSourceLoadTracker;
  abortControllers: Map<string, AbortController>;
  onRendererUnavailable: (layerId: string, message: string, url: string) => void;
}

/**
 * Best-effort async tileset validation and stub enable path.
 * Validates tileset.json over the network, then reports renderer-unavailable (never silent no-op).
 */
export function syncTileset3DLayers(options: SyncTileset3DLayersOptions): void {
  const nextIds = new Set(options.definitions.map((definition) => definition.id));

  for (const [layerId, controller] of options.abortControllers) {
    if (!nextIds.has(layerId)) {
      controller.abort();
      options.abortControllers.delete(layerId);
      options.loadTracker.markIdle(layerId);
    }
  }

  for (const definition of options.definitions) {
    void enableTileset3DLayer(definition, options);
  }
}

export async function retryTileset3DLayer(
  definition: Tileset3DLayerDefinition,
  options: SyncTileset3DLayersOptions
): Promise<void> {
  const existing = options.abortControllers.get(definition.id);
  existing?.abort();
  options.abortControllers.delete(definition.id);
  await enableTileset3DLayer(definition, options);
}

async function enableTileset3DLayer(
  definition: Tileset3DLayerDefinition,
  options: SyncTileset3DLayersOptions
): Promise<void> {
  const url = definition.tilesetUrl.trim();
  const controller = new AbortController();
  options.abortControllers.set(definition.id, controller);
  options.loadTracker.markLoading(definition.id, url);

  try {
    await validateTileset3DUrl(url, controller.signal);

    if (options.abortControllers.get(definition.id) !== controller) {
      return;
    }

    options.loadTracker.markError(definition.id, TILESET3D_RENDERER_UNAVAILABLE_MESSAGE, url);
    options.onRendererUnavailable(definition.id, TILESET3D_RENDERER_UNAVAILABLE_MESSAGE, url);
  } catch (error) {
    if (controller.signal.aborted || options.abortControllers.get(definition.id) !== controller) {
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown 3D Tiles load error";
    options.loadTracker.markError(definition.id, message, url);
    options.onRendererUnavailable(definition.id, message, url);
  } finally {
    if (options.abortControllers.get(definition.id) === controller) {
      options.abortControllers.delete(definition.id);
    }
  }
}

export function cancelAllTileset3DLoads(abortControllers: Map<string, AbortController>): void {
  for (const controller of abortControllers.values()) {
    controller.abort();
  }

  abortControllers.clear();
}
