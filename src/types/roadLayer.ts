/** Semantic role of a registered road or path layer. */
export type RoadSemanticType = "highway" | "transit" | "route" | "custom";

/** Inline GeoJSON payload accepted by road layer sources. */
export interface RoadGeoJsonInline {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties?: Record<string, unknown> & { id?: string; name?: string };
    geometry: {
      type: "LineString" | "MultiLineString" | string;
      coordinates: unknown;
    };
  }>;
}

/** GeoJSON source configuration for a road layer. */
export interface RoadGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection of line features. */
  data: string | RoadGeoJsonInline;
}

/** Paint tokens for road line layers and optional casing. */
export interface RoadStyleTokens {
  color?: string;
  width?: number;
  opacity?: number;
  /** MapLibre line-dasharray values, e.g. `[2, 2]` for dashed routes. */
  dashArray?: number[];
  highlightColor?: string;
  highlightWidth?: number;
  /** Optional wider line drawn beneath the main stroke. */
  casingColor?: string;
  casingWidth?: number;
  highlightCasingColor?: string;
}

/** Provider-agnostic road/path layer descriptor exposed by Atlas. */
export interface RoadLayerDefinition {
  id: string;
  label: string;
  semanticType: RoadSemanticType;
  source: RoadGeoJsonSource;
  style?: RoadStyleTokens;
}
