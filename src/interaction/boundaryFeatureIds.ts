export const BOUNDARY_FEATURE_PREFIX = "boundary:";

export function formatBoundaryFeatureId(layerId: string, featureKey: string | number): string {
  return `${BOUNDARY_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseBoundaryFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(BOUNDARY_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(BOUNDARY_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isBoundaryFeatureId(featureId: string): boolean {
  return featureId.startsWith(BOUNDARY_FEATURE_PREFIX);
}
