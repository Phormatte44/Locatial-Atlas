import type { AreaStyleTokens } from "../../types/areaLayer";

export const DEFAULT_AREA_STYLE: Required<
  Omit<AreaStyleTokens, "pattern" | "highlightPattern">
> & { pattern: string | undefined; highlightPattern: string | undefined } = {
  fillColor: "#22c55e",
  fillOpacity: 0.25,
  outlineColor: "#15803d",
  outlineWidth: 2,
  pattern: undefined,
  highlightFillColor: "#fde047",
  highlightFillOpacity: 0.4,
  highlightOutlineColor: "#ca8a04",
  highlightOutlineWidth: 3,
  highlightPattern: undefined
};

export function mergeAreaStyle(
  style: AreaStyleTokens | undefined
): Required<Omit<AreaStyleTokens, "pattern" | "highlightPattern">> & {
  pattern: string | undefined;
  highlightPattern: string | undefined;
} {
  return {
    ...DEFAULT_AREA_STYLE,
    ...style
  };
}
