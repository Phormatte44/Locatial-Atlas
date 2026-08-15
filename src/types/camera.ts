export interface CameraState {
  lng: number;
  lat: number;
  altitudeMeters: number;
  headingDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  fovDegrees: number;
  targetLng?: number;
  targetLat?: number;
  targetAltitudeMeters?: number;
}
