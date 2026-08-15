export const TILESET3D_FEATURE_PREFIX = "tileset3d:";

export function formatTileset3DFeatureId(layerId: string, featureKey: string): string {
  return `${TILESET3D_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseTileset3DFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(TILESET3D_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(TILESET3D_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isTileset3DFeatureId(featureId: string): boolean {
  return featureId.startsWith(TILESET3D_FEATURE_PREFIX);
}

/** Stable feature key for a raycast hit object (mesh uuid within the tileset scene). */
export function featureKeyFromTilesetPickObject(object: { uuid: string }): string {
  return object.uuid;
}
