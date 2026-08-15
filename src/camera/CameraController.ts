import type { CameraState } from "../types/camera";
import type { AtlasPlace } from "../types/place";
import type { GeographicBounds } from "../types/bounds";
import { computeBoundsFramingCamera } from "./frameBounds";
import { computePlaceFramingCamera } from "./framePlace";

export {
  DEFAULT_FRAMING_ALTITUDE_METERS,
  DEFAULT_FRAMING_FOV_DEGREES,
  DEFAULT_FRAMING_PITCH_DEGREES
} from "./framePlace";
export { computeBoundsFramingCamera } from "./frameBounds";

type CameraListener = (state: CameraState) => void;

const DEFAULT_CAMERA: CameraState = {
  lng: 0,
  lat: 20,
  altitudeMeters: 15_000_000,
  headingDegrees: 0,
  pitchDegrees: 0,
  rollDegrees: 0,
  fovDegrees: 60
};

export class CameraController {
  private state: CameraState = { ...DEFAULT_CAMERA };
  private listeners = new Set<CameraListener>();

  getState(): CameraState {
    return { ...this.state };
  }

  setState(next: CameraState): void {
    this.state = { ...next };
    this.notify();
  }

  computePlaceTarget(place: AtlasPlace): CameraState {
    if (place.bounds) {
      return computeBoundsFramingCamera(place.bounds);
    }

    return computePlaceFramingCamera(place);
  }

  computeBoundsTarget(bounds: GeographicBounds): CameraState {
    return computeBoundsFramingCamera(bounds);
  }

  subscribe(listener: CameraListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
