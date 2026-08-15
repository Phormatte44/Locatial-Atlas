/** Semantic role of a registered 3D Tiles overlay. */
export type Tileset3DSemanticType = "buildings" | "photogrammetry" | "pointcloud" | "custom";

/** Optional georeferenced transform applied when the tileset is mounted. */
export interface Tileset3DTransform {
  /** Anchor longitude in degrees. */
  lng: number;
  /** Anchor latitude in degrees. */
  lat: number;
  /** Altitude offset in meters above the ellipsoid/terrain anchor. */
  altitudeMeters?: number;
  /** Rotation about X axis in radians (applied after translation). */
  rotateX?: number;
  /** Rotation about Y axis in radians. */
  rotateY?: number;
  /** Rotation about Z axis in radians. */
  rotateZ?: number;
  /** Uniform scale multiplier relative to the tileset root transform. */
  scale?: number;
}

/** Optional style tokens for 3D Tiles overlays. */
export interface Tileset3DStyleTokens {
  /** 0–1 opacity applied to the rendered tileset. */
  opacity?: number;
}

/** Provider-agnostic 3D Tiles overlay descriptor exposed by Atlas. */
export interface Tileset3DLayerDefinition {
  id: string;
  label: string;
  semanticType: Tileset3DSemanticType;
  /** Root tileset.json URL (3D Tiles 1.0 / 1.1). */
  tilesetUrl: string;
  style?: Tileset3DStyleTokens;
  transform?: Tileset3DTransform;
  /**
   * Optional base URL for Three.js Draco/KTX2 decoder assets
   * (for example `https://cdn.example.com/three/libs/` → `.../draco/` and `.../basis/`).
   * Overrides {@link AtlasEngineOptions.tileset3DDecoderBaseUrl} for this layer.
   */
  decoderBaseUrl?: string;
  attribution?: string;
}
