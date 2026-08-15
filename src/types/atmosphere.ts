export interface AtmosphereSettings {
  /** When false, sky and fog are cleared from the basemap renderer. */
  enabled: boolean;
  /** Upper sky color (CSS hex or rgb). */
  skyColor: string;
  /** Color at the horizon line. */
  horizonColor: string;
  /** Ground-hugging fog tint when terrain is active. */
  fogColor: string;
  /** 0–1 blend of sky into horizon. */
  skyHorizonBlend: number;
  /** 0–1 atmospheric haze on globe projection. */
  atmosphereBlend: number;
  /** 0–1 fog over 3D terrain. */
  fogGroundBlend: number;
}

export interface AtmosphereChangeEvent {
  settings: AtmosphereSettings;
}

export type AtmosphereChangeListener = (event: AtmosphereChangeEvent) => void;
