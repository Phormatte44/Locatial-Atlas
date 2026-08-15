/** Semantic role of a registered map label layer. */
export type LabelSemanticType =
  | "place"
  | "administrative"
  | "poi"
  | "custom";

/** Inline GeoJSON payload accepted by label layer sources. */
export interface LabelGeoJsonInline {
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

/** GeoJSON source configuration for a label layer. */
export interface LabelGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection of point features. */
  data: string | LabelGeoJsonInline;
}

/** Layout and paint tokens for MapLibre symbol label layers. */
export interface LabelStyleTokens {
  textColor?: string;
  textHaloColor?: string;
  textHaloWidth?: number;
  textSize?: number;
  textFont?: string[];
  textAnchor?: "center" | "top" | "bottom" | "left" | "right";
  textOffset?: [number, number];
  highlightTextColor?: string;
  highlightTextHaloColor?: string;
  highlightTextSize?: number;
}

/** Provider-agnostic map label layer descriptor exposed by Atlas. */
export interface LabelLayerDefinition {
  id: string;
  label: string;
  semanticType: LabelSemanticType;
  source: LabelGeoJsonSource;
  /** Feature property key used for symbol text (default `name`). */
  textField?: string;
  style?: LabelStyleTokens;
}
