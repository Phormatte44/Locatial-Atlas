import type { CameraState } from "../../types/camera";
import { altitudeToZoom, zoomToAltitude } from "../../camera/altitudeZoom";

export interface MapLibreCameraOptions {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export function cameraStateToMapLibre(state: CameraState): MapLibreCameraOptions {
  return {
    center: [state.lng, state.lat],
    zoom: altitudeToZoom(state.altitudeMeters, state.lat),
    bearing: state.headingDegrees,
    pitch: state.pitchDegrees
  };
}

/** Align canonical camera state with the view MapLibre will actually render. */
export function snapCameraStateForMapLibre(state: CameraState): CameraState {
  const mapCamera = cameraStateToMapLibre(state);

  return {
    ...state,
    lng: mapCamera.center[0],
    lat: mapCamera.center[1],
    altitudeMeters: zoomToAltitude(mapCamera.zoom, mapCamera.center[1]),
    headingDegrees: mapCamera.bearing,
    pitchDegrees: mapCamera.pitch,
    transitionProgress: state.transitionProgress
  };
}
