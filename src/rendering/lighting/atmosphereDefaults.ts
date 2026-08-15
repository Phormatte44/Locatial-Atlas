import type { AtmosphereSettings } from "../../types/atmosphere";
import type { LightingSettings } from "../../types/lighting";

export const DEFAULT_ATMOSPHERE_SETTINGS: AtmosphereSettings = {
  enabled: true,
  skyColor: "#88C6FC",
  horizonColor: "#ffffff",
  fogColor: "#e8eef5",
  skyHorizonBlend: 0.8,
  atmosphereBlend: 0.85,
  fogGroundBlend: 0.5
};

export const DEFAULT_LIGHTING_SETTINGS: LightingSettings = {
  enabled: true,
  ambientIntensity: 0.55,
  directionalIntensity: 0.75,
  sunAzimuthDegrees: 135,
  sunElevationDegrees: 45
};

export function mergeAtmosphereSettings(
  base: AtmosphereSettings,
  partial?: Partial<AtmosphereSettings>
): AtmosphereSettings {
  return partial ? { ...base, ...partial } : base;
}

export function mergeLightingSettings(
  base: LightingSettings,
  partial?: Partial<LightingSettings>
): LightingSettings {
  return partial ? { ...base, ...partial } : base;
}
