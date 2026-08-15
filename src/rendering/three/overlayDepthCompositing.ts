import type * as THREE from "three";

/**
 * Shared depth compositing contract for MapLibre custom 3D layers:
 *
 * 1. MapLibre draws basemap and terrain into the shared WebGL depth buffer.
 * 2. Tileset3DOverlayAdapter uses {@link beginTerrainAlignedDepthPass} so mesh
 *    content respects terrain occlusion and basemap depth ordering.
 * 3. ThreeOverlayAdapter uses {@link beginMarkupOverlayPass} so editorial markup
 *    stays visible above tilesets without fighting the depth buffer.
 */

export function beginTerrainAlignedDepthPass(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): void {
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
}

export function beginMarkupOverlayPass(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): void {
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);
}

export function resetOverlayRendererState(renderer: THREE.WebGLRenderer): void {
  renderer.resetState();
}
