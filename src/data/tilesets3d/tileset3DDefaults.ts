import type { Tileset3DStyleTokens } from "../../types/tileset3DLayer";

export const DEFAULT_TILESET3D_STYLE: Required<Tileset3DStyleTokens> = {
  opacity: 1
};

export function mergeTileset3DStyle(
  style: Tileset3DStyleTokens | undefined
): Required<Tileset3DStyleTokens> {
  return {
    ...DEFAULT_TILESET3D_STYLE,
    ...style
  };
}
