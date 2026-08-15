import type { RoadStyleTokens } from "../../types/roadLayer";

export const DEFAULT_ROAD_STYLE: Required<
  Pick<
    RoadStyleTokens,
    | "color"
    | "width"
    | "opacity"
    | "highlightColor"
    | "highlightWidth"
    | "casingColor"
    | "casingWidth"
    | "highlightCasingColor"
  >
> & { dashArray: number[] | undefined } = {
  color: "#2563eb",
  width: 3,
  opacity: 0.9,
  dashArray: undefined,
  highlightColor: "#f59e0b",
  highlightWidth: 5,
  casingColor: "#1e3a8a",
  casingWidth: 5,
  highlightCasingColor: "#b45309"
};

export function mergeRoadStyle(
  style: RoadStyleTokens | undefined
): Required<
  Pick<
    RoadStyleTokens,
    | "color"
    | "width"
    | "opacity"
    | "highlightColor"
    | "highlightWidth"
    | "casingColor"
    | "casingWidth"
    | "highlightCasingColor"
  >
> & { dashArray: number[] | undefined } {
  return {
    ...DEFAULT_ROAD_STYLE,
    ...style
  };
}

export function roadStyleUsesCasing(
  style: ReturnType<typeof mergeRoadStyle>
): boolean {
  return style.casingWidth > style.width;
}
