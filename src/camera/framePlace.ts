import type { CameraState } from "../types/camera";
import type { AtlasPlace } from "../types/place";

const DEFAULT_FRAMING_ALTITUDE_METERS = 12_000;
const DEFAULT_FRAMING_PITCH_DEGREES = 45;
const DEFAULT_FRAMING_FOV_DEGREES = 60;

export {
  DEFAULT_FRAMING_ALTITUDE_METERS,
  DEFAULT_FRAMING_FOV_DEGREES,
  DEFAULT_FRAMING_PITCH_DEGREES
};

/** Compute a canonical camera state that frames a geographic place. */
export function computePlaceFramingCamera(place: AtlasPlace): CameraState {
  return {
    lng: place.lng,
    lat: place.lat,
    altitudeMeters: DEFAULT_FRAMING_ALTITUDE_METERS,
    headingDegrees: 0,
    pitchDegrees: DEFAULT_FRAMING_PITCH_DEGREES,
    rollDegrees: 0,
    fovDegrees: DEFAULT_FRAMING_FOV_DEGREES,
    targetLng: place.lng,
    targetLat: place.lat,
    targetAltitudeMeters: 0
  };
}
