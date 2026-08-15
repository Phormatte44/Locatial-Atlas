import type { Map as MapLibreMap } from "maplibre-gl";
import type { ProjectionDefinitionSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { AtlasViewMode } from "../../types/viewMode";
import { applyViewModeToMap } from "./viewModeSetup";
import { readProjectionTransition } from "./projectionBlend";

/** Default duration for Atlas-owned globe↔map view-mode transitions. */
export const DEFAULT_VIEW_MODE_TRANSITION_MS = 800;

interface GlobeProjectionLike {
  readonly name: string;
  setProjection(projection?: { type?: ProjectionDefinitionSpecification }): void;
}

/** Target MapLibre globeness (0 = mercator, 1 = globe) for a settled Atlas view mode. */
export function globenessForViewMode(mode: AtlasViewMode): number {
  return mode === "globe" ? 1 : 0;
}

/** MapLibre projection `type` for a globeness value in the 0–1 blend range. */
export function projectionTypeForGlobeness(globeness: number): ProjectionDefinitionSpecification {
  if (globeness <= 0) {
    return "mercator";
  }

  if (globeness >= 1) {
    return "vertical-perspective";
  }

  return ["mercator", "vertical-perspective", globeness];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Drive MapLibre globe↔mercator blend without recreating the projection each frame.
 * When already on `GlobeProjection`, updates its transitionable `type`; otherwise calls
 * `setProjection` once to establish the globe transform path.
 */
export function setMapGlobeness(map: MapLibreMap, globeness: number): void {
  const projectionType = projectionTypeForGlobeness(globeness);
  const style = map.style as { projection?: GlobeProjectionLike };
  const projection = style.projection;

  if (projection?.name === "globe") {
    projection.setProjection({ type: projectionType });
    map.triggerRepaint();
    return;
  }

  map.setProjection({ type: projectionType });
  map.triggerRepaint();
}

export interface ViewModeProjectionTransitionOptions {
  map: MapLibreMap;
  targetMode: AtlasViewMode;
  durationMs: number;
  onProgress?: (globeness: number) => void;
}

/** Atlas-owned RAF animation of MapLibre projection blend, then settle pitch/projection policy. */
export function runViewModeProjectionTransition(
  options: ViewModeProjectionTransitionOptions
): { promise: Promise<void>; cancel: () => void } {
  const { map, targetMode, durationMs, onProgress } = options;
  const targetGlobeness = globenessForViewMode(targetMode);

  if (durationMs <= 0) {
    setMapGlobeness(map, targetGlobeness);
    applyViewModeToMap(map, targetMode);
    onProgress?.(targetGlobeness);
    return { promise: Promise.resolve(), cancel: () => {} };
  }

  const startGlobeness = readProjectionTransition(map);
  const delta = targetGlobeness - startGlobeness;

  if (Math.abs(delta) < 0.0001) {
    applyViewModeToMap(map, targetMode);
    onProgress?.(targetGlobeness);
    return { promise: Promise.resolve(), cancel: () => {} };
  }

  let rafId: number | null = null;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const promise = new Promise<void>((resolve) => {
    const startTime = performance.now();

    const finish = () => {
      if (cancelled) {
        resolve();
        return;
      }

      applyViewModeToMap(map, targetMode);
      onProgress?.(targetGlobeness);
      resolve();
    };

    const tick = (now: number) => {
      if (cancelled) {
        resolve();
        return;
      }

      const linearProgress = Math.min(1, (now - startTime) / durationMs);
      const eased = easeInOutCubic(linearProgress);
      const globeness = startGlobeness + delta * eased;

      setMapGlobeness(map, globeness);
      onProgress?.(globeness);

      if (linearProgress >= 1) {
        rafId = null;
        finish();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    if (styleNeedsGlobeProjectionPath(map, startGlobeness, targetGlobeness)) {
      setMapGlobeness(map, startGlobeness);
    }

    rafId = requestAnimationFrame(tick);
  });

  return { promise, cancel };
}

function styleNeedsGlobeProjectionPath(
  map: MapLibreMap,
  startGlobeness: number,
  targetGlobeness: number
): boolean {
  const style = map.style as { projection?: GlobeProjectionLike };
  if (style.projection?.name === "globe") {
    return false;
  }

  return startGlobeness > 0 || targetGlobeness > 0;
}
