export const AREA_FEATURE_PREFIX = "area:";

export function formatAreaFeatureId(layerId: string, featureKey: string | number): string {
  return `${AREA_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseAreaFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(AREA_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(AREA_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isAreaFeatureId(featureId: string): boolean {
  return featureId.startsWith(AREA_FEATURE_PREFIX);
}
