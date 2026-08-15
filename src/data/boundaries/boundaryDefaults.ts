import type { BoundaryStyleTokens } from "../../types/boundaryLayer";

export const DEFAULT_BOUNDARY_STYLE: Required<BoundaryStyleTokens> = {
  fillColor: "#4a90d9",
  fillOpacity: 0.15,
  lineColor: "#2c5282",
  lineWidth: 2,
  lineOpacity: 0.85,
  highlightFillColor: "#ffd166",
  highlightFillOpacity: 0.35,
  highlightLineColor: "#f4a261",
  highlightLineWidth: 3
};

export function mergeBoundaryStyle(
  style: BoundaryStyleTokens | undefined
): Required<BoundaryStyleTokens> {
  return {
    ...DEFAULT_BOUNDARY_STYLE,
    ...style
  };
}
