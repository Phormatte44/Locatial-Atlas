export type { CameraState } from "../types/camera";
export type { AtlasPlace } from "../types/place";

export interface AtlasEngineContract {
  setCamera(state: import("../types/camera").CameraState): void;
  framePlace(place: import("../types/place").AtlasPlace): Promise<void>;
  highlightPlace(placeId: string | null): void;
  project(lng: number, lat: number, altitudeMeters?: number): { x: number; y: number } | null;
  unproject(x: number, y: number): { lng: number; lat: number; altitudeMeters?: number } | null;
}
