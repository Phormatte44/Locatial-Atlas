import type { Map as MapLibreMap } from "maplibre-gl";
import type { AtmosphereSettings } from "../../types/atmosphere";

/** Apply renderer-agnostic atmosphere settings through MapLibre sky. */
export function applyAtmosphereToMap(map: MapLibreMap, settings: AtmosphereSettings): void {
  if (!settings.enabled) {
    map.setSky({
      "sky-color": "#000000",
      "horizon-color": "#000000",
      "fog-color": "#000000",
      "sky-horizon-blend": 0,
      "atmosphere-blend": 0,
      "fog-ground-blend": 0
    });
    return;
  }

  map.setSky({
    "sky-color": settings.skyColor,
    "horizon-color": settings.horizonColor,
    "fog-color": settings.fogColor,
    "sky-horizon-blend": settings.skyHorizonBlend,
    "atmosphere-blend": settings.atmosphereBlend,
    "fog-ground-blend": settings.fogGroundBlend
  });
}
