import type { RasterStyleTokens } from "../../types/rasterLayer";

export const DEFAULT_RASTER_STYLE: Required<RasterStyleTokens> = {
  opacity: 1,
  brightnessMin: 0,
  brightnessMax: 1,
  contrast: 0
};

export function mergeRasterStyle(style: RasterStyleTokens | undefined): Required<RasterStyleTokens> {
  return {
    ...DEFAULT_RASTER_STYLE,
    ...style
  };
}
