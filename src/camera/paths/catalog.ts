import type { CameraPathFamily } from "../../types/cameraTransition";

export interface CameraPathCatalogEntry {
  id: CameraPathFamily;
  label: string;
  description: string;
  manualOnly: boolean;
}

/** Lab and internal tooling catalog — buttons target ids, not markdown briefs. */
export const CAMERA_PATH_CATALOG: CameraPathCatalogEntry[] = [
  {
    id: "local-glide",
    label: "Local glide",
    description: "Neighborhood geodesic glide (< 3 km auto-select)",
    manualOnly: false
  },
  {
    id: "orbit-reveal",
    label: "Orbit reveal",
    description: "Mid-range lateral sweep (3–500 km auto-select)",
    manualOnly: false
  },
  {
    id: "departure-arrival-arc",
    label: "Departure arc",
    description: "Long-range climb / cruise / descend (≥ 500 km auto-select)",
    manualOnly: false
  },
  {
    id: "straight",
    label: "Straight",
    description: "Geodesic A→B, no altitude flourish",
    manualOnly: true
  },
  {
    id: "high-arc",
    label: "High arc",
    description: "Geodesic A→B with a single mid-flight altitude peak",
    manualOnly: true
  }
];
