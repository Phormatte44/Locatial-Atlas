export const POI_FEATURE_PREFIX = "poi:";

export function formatPoiFeatureId(layerId: string, featureKey: string | number): string {
  return `${POI_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function formatPoiClusterFeatureId(layerId: string, clusterId: number): string {
  return `${POI_FEATURE_PREFIX}${layerId}:cluster:${clusterId}`;
}

export function parsePoiFeatureId(
  featureId: string
): { layerId: string; featureKey: string; isCluster: boolean } | null {
  if (!featureId.startsWith(POI_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(POI_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  const layerId = rest.slice(0, separator);
  const featureKey = rest.slice(separator + 1);

  return {
    layerId,
    featureKey,
    isCluster: featureKey.startsWith("cluster:")
  };
}

export function isPoiFeatureId(featureId: string): boolean {
  return featureId.startsWith(POI_FEATURE_PREFIX);
}
