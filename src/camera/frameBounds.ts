import type { CameraState } from "../types/camera";
import type { GeographicBounds } from "../types/bounds";
import {
  DEFAULT_FRAMING_FOV_DEGREES,
  DEFAULT_FRAMING_PITCH_DEGREES
} from "./framePlace";

const METERS_PER_DEGREE_LAT = 111_320;

/** Compute a canonical camera state that frames a geographic bounding box. */
export function computeBoundsFramingCamera(bounds: GeographicBounds): CameraState {
  const [west, south, east, north] = bounds;
  const lng = (west + east) / 2;
  const lat = (south + north) / 2;
  const latSpanMeters = Math.abs(north - south) * METERS_PER_DEGREE_LAT;
  const lngSpanMeters =
    Math.abs(east - west) * METERS_PER_DEGREE_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  const spanMeters = Math.max(latSpanMeters, lngSpanMeters);
  const altitudeMeters = Math.max(spanMeters * 1.75, 3_000);

  return {
    lng,
    lat,
    altitudeMeters,
    headingDegrees: 0,
    pitchDegrees: DEFAULT_FRAMING_PITCH_DEGREES,
    rollDegrees: 0,
    fovDegrees: DEFAULT_FRAMING_FOV_DEGREES,
    targetLng: lng,
    targetLat: lat,
    targetAltitudeMeters: 0
  };
}
