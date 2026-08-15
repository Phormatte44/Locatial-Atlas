import type { Map as MapLibreMap } from "maplibre-gl";
import type { CameraState } from "../../types/camera";
import { zoomToAltitude } from "../../camera/altitudeZoom";
import { cameraStateToMapLibre } from "./cameraToMapLibre";

export function mapLibreToCameraState(map: MapLibreMap): CameraState {
  const center = map.getCenter();
  const zoom = map.getZoom();

  return {
    lng: center.lng,
    lat: center.lat,
    altitudeMeters: zoomToAltitude(zoom, center.lat),
    headingDegrees: map.getBearing(),
    pitchDegrees: map.getPitch(),
    rollDegrees: 0,
    fovDegrees: 60
  };
}

/** Apply canonical camera state immediately through MapLibre jumpTo. */
export function applyCameraInstantToMap(map: MapLibreMap, state: CameraState): void {
  map.jumpTo(cameraStateToMapLibre(state));
}
