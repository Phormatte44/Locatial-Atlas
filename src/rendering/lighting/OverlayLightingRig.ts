import * as THREE from "three";
import type { LightingSettings } from "../../types/lighting";
import {
  configureOverlayDirectionalShadow,
  overlayShadowsActive,
  updateOverlayShadowCamera
} from "./overlayShadowConfig";

/** Shared directional + ambient rig for Three.js overlay scenes. */
export class OverlayLightingRig {
  private readonly ambient: THREE.AmbientLight;
  private readonly hemisphere: THREE.HemisphereLight;
  private readonly directional: THREE.DirectionalLight;
  private enabled = true;
  private shadowsActive = false;

  constructor() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.hemisphere = new THREE.HemisphereLight(0xdceeff, 0x4a4035, 0.45);
    this.directional = new THREE.DirectionalLight(0xfff4e8, 0.65);
    this.directional.position.set(1, 2, 1.5);
    configureOverlayDirectionalShadow(this.directional, {
      enabled: true,
      ambientIntensity: 0.55,
      directionalIntensity: 0.75,
      sunAzimuthDegrees: 135,
      sunElevationDegrees: 45,
      shadowEnabled: true,
      shadowIntensity: 0.65
    });
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

    if (!scene.children.includes(this.directional.target)) {
      scene.add(this.directional.target);
    }
  }

  applySettings(settings: LightingSettings): void {
    this.enabled = settings.enabled;
    this.shadowsActive = overlayShadowsActive(settings);

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

    configureOverlayDirectionalShadow(this.directional, settings);
  }

  /** Refit shadow camera to lit markup anchors after matrices change. */
  updateShadowTargets(anchors: THREE.Object3D[]): void {
    if (!this.shadowsActive || anchors.length === 0) {
      return;
    }

    updateOverlayShadowCamera(this.directional, anchors);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  shadowsEnabled(): boolean {
    return this.shadowsActive;
  }

  getDirectionalLight(): THREE.DirectionalLight {
    return this.directional;
  }
}
