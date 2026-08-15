import type { BuildingStyleTokens } from "../../types/buildingLayer";

export const DEFAULT_BUILDING_STYLE: Required<BuildingStyleTokens> = {
  heightProperty: "heightMeters",
  heightMeters: 20,
  color: "#94a3b8",
  opacity: 0.85,
  highlightColor: "#fde047",
  highlightOpacity: 0.95
};

export function mergeBuildingStyle(
  style: BuildingStyleTokens | undefined
): Required<BuildingStyleTokens> {
  return {
    ...DEFAULT_BUILDING_STYLE,
    ...style
  };
}
