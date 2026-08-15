export const ROAD_FEATURE_PREFIX = "road:";

export function formatRoadFeatureId(layerId: string, featureKey: string | number): string {
  return `${ROAD_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseRoadFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(ROAD_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(ROAD_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isRoadFeatureId(featureId: string): boolean {
  return featureId.startsWith(ROAD_FEATURE_PREFIX);
}
