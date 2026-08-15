/** Semantic role of a registered building footprint layer. */
export type BuildingSemanticType = "commercial" | "residential" | "landmark" | "custom";

/** Inline GeoJSON payload accepted by building layer sources. */
export interface BuildingGeoJsonInline {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string | number;
    properties?: Record<string, unknown> & {
      id?: string;
      name?: string;
      /** Extrusion height in meters when style.heightProperty is omitted. */
      heightMeters?: number;
    };
    geometry: {
      type: "Polygon" | "MultiPolygon" | string;
      coordinates: unknown;
    };
  }>;
}

/** GeoJSON source configuration for a building layer. */
export interface BuildingGeoJsonSource {
  type: "geojson";
  /** Remote GeoJSON URL or inline FeatureCollection of polygon footprints. */
  data: string | BuildingGeoJsonInline;
}

/** Paint tokens for MapLibre fill-extrusion building layers. */
export interface BuildingStyleTokens {
  /** GeoJSON feature property name for extrusion height in meters. Defaults to `heightMeters`. */
  heightProperty?: string;
  /** Fixed extrusion height in meters when the height property is absent on a feature. */
  heightMeters?: number;
  color?: string;
  opacity?: number;
  highlightColor?: string;
  highlightOpacity?: number;
}

/** Provider-agnostic building footprint layer descriptor exposed by Atlas. */
export interface BuildingLayerDefinition {
  id: string;
  label: string;
  semanticType: BuildingSemanticType;
  source: BuildingGeoJsonSource;
  style?: BuildingStyleTokens;
}
