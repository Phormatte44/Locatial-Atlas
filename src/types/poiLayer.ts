/** Semantic role of a registered POI layer. */
export type PoiSemanticType =
  | "landmark"
  | "transit"
  | "commerce"
  | "culture"
  | "custom";

/** Inline GeoJSON payload accepted by POI layer sources (Point / MultiPoint). */
export interface PoiGeoJsonInline {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties?: Record<string, unknown> & { id?: string; name?: string };
    geometry: {
      type: "Point" | "MultiPoint" | string;
      coordinates: unknown;
    };
  }>;
}

/** GeoJSON source configuration for a POI layer. */
export interface PoiGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection of point features. */
  data: string | PoiGeoJsonInline;
}

/** MapLibre cluster options for a POI layer source. */
export interface PoiClusterConfig {
  /** When true (default), the GeoJSON source clusters point features. */
  enabled?: boolean;
  /** Pixel radius for clustering (MapLibre `clusterRadius`). */
  clusterRadius?: number;
  /** Max zoom at which points cluster (MapLibre `clusterMaxZoom`). */
  clusterMaxZoom?: number;
  /** MapLibre `clusterProperties` expressions keyed by property name. */
  clusterProperties?: Record<string, unknown>;
}

/** Layout and paint tokens for POI symbol and cluster layers. */
export interface PoiStyleTokens {
  /** Sprite image id from the active map style (optional). Falls back to circle markers. */
  iconImage?: string;
  iconSize?: number;
  iconColor?: string;
  iconRadius?: number;
  iconStrokeColor?: string;
  iconStrokeWidth?: number;
  highlightIconColor?: string;
  highlightIconRadius?: number;
  highlightIconSize?: number;
  clusterColor?: string;
  clusterRadius?: number;
  clusterStrokeColor?: string;
  clusterStrokeWidth?: number;
  clusterTextColor?: string;
  clusterTextSize?: number;
}

/** Provider-agnostic POI layer descriptor exposed by Atlas. */
export interface PoiLayerDefinition {
  id: string;
  label: string;
  semanticType: PoiSemanticType;
  source: PoiGeoJsonSource;
  style?: PoiStyleTokens;
  cluster?: PoiClusterConfig;
}
