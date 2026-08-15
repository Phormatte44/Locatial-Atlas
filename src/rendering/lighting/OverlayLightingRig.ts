import * as THREE from "three";
import type { LightingSettings } from "../../types/lighting";

/** Shared directional + ambient rig for Three.js overlay scenes. */
export class OverlayLightingRig {
  private readonly ambient: THREE.AmbientLight;
  private readonly hemisphere: THREE.HemisphereLight;
  private readonly directional: THREE.DirectionalLight;
  private enabled = true;

  constructor() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.hemisphere = new THREE.HemisphereLight(0xdceeff, 0x4a4035, 0.45);
    this.directional = new THREE.DirectionalLight(0xfff4e8, 0.65);
    this.directional.position.set(1, 2, 1.5);
  }

  attachToScene(scene: THREE.Scene): void {
    if (!scene.children.includes(this.ambient)) {
      scene.add(this.ambient);
    }

    if (!scene.children.includes(this.hemisphere)) {
      scene.add(this.hemisphere);
    }

    if (!scene.children.includes(this.directional)) {
      scene.add(this.directional);
    }
  }

  applySettings(settings: LightingSettings): void {
    this.enabled = settings.enabled;

    const ambientScale = settings.enabled ? settings.ambientIntensity : 0;
    const directionalScale = settings.enabled ? settings.directionalIntensity : 0;

    this.ambient.intensity = ambientScale * 0.45;
    this.hemisphere.intensity = ambientScale * 0.85;
    this.directional.intensity = directionalScale;

    const azimuthRadians = THREE.MathUtils.degToRad(settings.sunAzimuthDegrees);
    const elevationRadians = THREE.MathUtils.degToRad(settings.sunElevationDegrees);
    const horizontal = Math.cos(elevationRadians);

    this.directional.position.set(
      horizontal * Math.sin(azimuthRadians),
      Math.sin(elevationRadians),
      horizontal * Math.cos(azimuthRadians)
    );
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
