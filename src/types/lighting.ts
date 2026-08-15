export interface LightingSettings {
  /** When false, overlay lighting is disabled (markup stays unlit/basic). */
  enabled: boolean;
  /** 0–1 ambient hemisphere contribution for the Three.js overlay. */
  ambientIntensity: number;
  /** 0–1 directional sun contribution for the Three.js overlay. */
  directionalIntensity: number;
  /** Sun azimuth in degrees (0 = north, 90 = east). */
  sunAzimuthDegrees: number;
  /** Sun elevation in degrees above the horizon. */
  sunElevationDegrees: number;
}

export interface LightingChangeEvent {
  settings: LightingSettings;
}

export type LightingChangeListener = (event: LightingChangeEvent) => void;
