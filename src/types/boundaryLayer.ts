/** Semantic role of a registered boundary layer. */
export type BoundarySemanticType =
  | "administrative"
  | "jurisdiction"
  | "district"
  | "custom";

/** Inline GeoJSON payload accepted by boundary layer sources. */
export interface BoundaryGeoJsonInline {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties?: Record<string, unknown> & { id?: string; name?: string };
    geometry: {
      type: string;
      coordinates: unknown;
    };
  }>;
}

/** GeoJSON source configuration for a boundary layer. */
export interface BoundaryGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection. */
  data: string | BoundaryGeoJsonInline;
}

/** Paint tokens for boundary fill and line layers. */
export interface BoundaryStyleTokens {
  fillColor?: string;
  fillOpacity?: number;
  lineColor?: string;
  lineWidth?: number;
  lineOpacity?: number;
  highlightFillColor?: string;
  highlightFillOpacity?: number;
  highlightLineColor?: string;
  highlightLineWidth?: number;
}

/** Provider-agnostic boundary layer descriptor exposed by Atlas. */
export interface BoundaryLayerDefinition {
  id: string;
  label: string;
  semanticType: BoundarySemanticType;
  source: BoundaryGeoJsonSource;
  style?: BoundaryStyleTokens;
}
