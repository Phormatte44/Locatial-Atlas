export const BUILDING_FEATURE_PREFIX = "building:";

export function formatBuildingFeatureId(layerId: string, featureKey: string | number): string {
  return `${BUILDING_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseBuildingFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(BUILDING_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(BUILDING_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isBuildingFeatureId(featureId: string): boolean {
  return featureId.startsWith(BUILDING_FEATURE_PREFIX);
}
