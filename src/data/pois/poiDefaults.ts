import type { PoiClusterConfig, PoiStyleTokens } from "../../types/poiLayer";

export const DEFAULT_POI_CLUSTER: Required<
  Pick<PoiClusterConfig, "enabled" | "clusterRadius" | "clusterMaxZoom">
> = {
  enabled: true,
  clusterRadius: 50,
  clusterMaxZoom: 14
};

export const DEFAULT_POI_STYLE: Required<
  Pick<
    PoiStyleTokens,
    | "iconSize"
    | "iconColor"
    | "iconRadius"
    | "iconStrokeColor"
    | "iconStrokeWidth"
    | "highlightIconColor"
    | "highlightIconRadius"
    | "highlightIconSize"
    | "clusterColor"
    | "clusterRadius"
    | "clusterStrokeColor"
    | "clusterStrokeWidth"
    | "clusterTextColor"
    | "clusterTextSize"
  >
> = {
  iconSize: 1,
  iconColor: "#2563eb",
  iconRadius: 6,
  iconStrokeColor: "#ffffff",
  iconStrokeWidth: 2,
  highlightIconColor: "#f59e0b",
  highlightIconRadius: 8,
  highlightIconSize: 1.2,
  clusterColor: "#1e40af",
  clusterRadius: 18,
  clusterStrokeColor: "#ffffff",
  clusterStrokeWidth: 2,
  clusterTextColor: "#ffffff",
  clusterTextSize: 12
};

export function mergePoiStyle(style: PoiStyleTokens | undefined): typeof DEFAULT_POI_STYLE & PoiStyleTokens {
  return {
    ...DEFAULT_POI_STYLE,
    ...style
  };
}

export function mergePoiCluster(
  cluster: PoiClusterConfig | undefined
): typeof DEFAULT_POI_CLUSTER & PoiClusterConfig {
  return {
    ...DEFAULT_POI_CLUSTER,
    ...cluster
  };
}

export function poiLayerUsesClustering(cluster: PoiClusterConfig | undefined): boolean {
  return mergePoiCluster(cluster).enabled;
}
