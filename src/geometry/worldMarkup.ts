import type { WorldMarker } from "../types/worldMarker";
import type { WorldSphereMarkup } from "../types/worldMarkup";
import { sphereMarkupFromMarker } from "../types/worldMarkup";

export function markupsFromMarkers(markers: WorldMarker[]): WorldSphereMarkup[] {
  return markers.map((marker) => sphereMarkupFromMarker(marker));
}

export { sphereMarkupFromMarker };
