/** Semantic role of a registered area or fill layer. */
export type AreaSemanticType = "zone" | "park" | "landuse" | "custom";

/** Inline GeoJSON payload accepted by area layer sources. */
export interface AreaGeoJsonInline {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties?: Record<string, unknown> & { id?: string; name?: string };
    geometry: {
      type: "Polygon" | "MultiPolygon" | string;
      coordinates: unknown;
    };
  }>;
}

/** GeoJSON source configuration for an area layer. */
export interface AreaGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection of polygon features. */
  data: string | AreaGeoJsonInline;
}

/** Paint tokens for area fill and outline layers. */
export interface AreaStyleTokens {
  fillColor?: string;
  fillOpacity?: number;
  outlineColor?: string;
  outlineWidth?: number;
  /** MapLibre sprite image name for fill-pattern, when the active style exposes it. */
  pattern?: string;
  highlightFillColor?: string;
  highlightFillOpacity?: number;
  highlightOutlineColor?: string;
  highlightOutlineWidth?: number;
  highlightPattern?: string;
}

/** Provider-agnostic area/fill layer descriptor exposed by Atlas. */
export interface AreaLayerDefinition {
  id: string;
  label: string;
  semanticType: AreaSemanticType;
  source: AreaGeoJsonSource;
  style?: AreaStyleTokens;
}
