import type { AtlasEngineContract } from "../contracts";
import type { CameraState } from "../types/camera";
import type { AtlasPlace } from "../types/place";

export class AtlasEngine implements AtlasEngineContract {
  setCamera(_state: CameraState): void {
    // TODO: route canonical camera state through the camera solver and renderer adapters.
  }

  async framePlace(_place: AtlasPlace): Promise<void> {
    // TODO: compute framing from geographic bounds/position.
  }

  highlightPlace(_placeId: string | null): void {
    // TODO: route highlight state to geographic layer/rendering systems.
  }

  project(_lng: number, _lat: number, _altitudeMeters = 0): { x: number; y: number } | null {
    // TODO: delegate to the active projection/rendering adapter.
    return null;
  }

  unproject(_x: number, _y: number): { lng: number; lat: number; altitudeMeters?: number } | null {
    // TODO: delegate to the active projection/rendering adapter.
    return null;
  }
}
