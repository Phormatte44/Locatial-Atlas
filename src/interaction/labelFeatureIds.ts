export const LABEL_FEATURE_PREFIX = "label:";

export function formatLabelFeatureId(layerId: string, featureKey: string | number): string {
  return `${LABEL_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseLabelFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(LABEL_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(LABEL_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isLabelFeatureId(featureId: string): boolean {
  return featureId.startsWith(LABEL_FEATURE_PREFIX);
}
