export const DEFAULT_TILESET3D_DECODER_BASE_URL =
  "https://unpkg.com/three@0.179.1/examples/jsm/libs/";

export interface Tileset3DDecoderPaths {
  dracoDecoderPath: string;
  ktx2TranscoderPath: string;
}

/** Resolve Draco and KTX2 transcoder directories from an optional libs base URL. */
export function resolveTileset3DDecoderPaths(baseUrl?: string): Tileset3DDecoderPaths {
  const normalized = (baseUrl ?? DEFAULT_TILESET3D_DECODER_BASE_URL).replace(/\/?$/, "/");

  return {
    dracoDecoderPath: `${normalized}draco/`,
    ktx2TranscoderPath: `${normalized}basis/`
  };
}
