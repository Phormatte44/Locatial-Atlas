import { lerp } from "../../camera/easing";
import type { AtmosphereSettings } from "../../types/atmosphere";
import type { LightingSettings } from "../../types/lighting";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Scale atmosphere for MapLibre globe↔mercator blend progress.
 * transition 0 = settled mercator; 1 = settled globe.
 */
export function atmosphereForProjectionTransition(
  settings: AtmosphereSettings,
  transition: number
): AtmosphereSettings {
  if (!settings.enabled) {
    return settings;
  }

  const t = clamp01(transition);

  return {
    ...settings,
    atmosphereBlend: settings.atmosphereBlend * t,
    fogGroundBlend: settings.fogGroundBlend * lerp(0.35, 1, t),
    skyHorizonBlend: settings.skyHorizonBlend * lerp(0.75, 1, t)
  };
}

/**
 * Scale overlay lighting for MapLibre globe↔mercator blend progress.
 * transition 0 = flatter map lighting; 1 = full configured rig.
 */
export function lightingForProjectionTransition(
  settings: LightingSettings,
  transition: number
): LightingSettings {
  if (!settings.enabled) {
    return settings;
  }

  const t = clamp01(transition);

  return {
    ...settings,
    ambientIntensity: lerp(settings.ambientIntensity * 0.88, settings.ambientIntensity, t),
    directionalIntensity: lerp(settings.directionalIntensity * 0.82, settings.directionalIntensity, t)
  };
}
