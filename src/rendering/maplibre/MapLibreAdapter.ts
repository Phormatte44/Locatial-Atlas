import maplibregl from "maplibre-gl";
import type { TerrainSourceDefinition } from "../../types/terrain";
import type { CameraState } from "../../types/camera";
import { markupsFromMarkers } from "../../geometry/worldMarkup";
import type { WorldMarker } from "../../types/worldMarker";
import type { WorldMarkup } from "../../types/worldMarkup";
import { applyCameraInstantToMap, mapLibreToCameraState } from "./applyCamera";
import { cameraStateToMapLibre } from "./cameraToMapLibre";
import { projectGeoToScreen, queryGroundElevationMeters, unprojectScreenToGeo } from "./projection";
import {
  applyTerrainToMap,
  queryTerrainElevationMeters,
  removeTerrainFromMap
} from "./terrainSetup";
import { LAYER_ID, ThreeOverlayAdapter } from "../three/ThreeOverlayAdapter";
import type { MapReadyReason } from "../../types/mapReady";
import type { ClassifiedMapError } from "./classifyMapError";
import { classifyMapLibreError } from "./classifyMapError";

type CameraChangeListener = (state: CameraState) => void;
type MapReadyListener = (reason: MapReadyReason) => void;
type MapErrorListener = (error: ClassifiedMapError) => void;

export class MapLibreAdapter {
  private map: maplibregl.Map | null = null;
  private cameraListeners = new Set<CameraChangeListener>();
  private readyListeners = new Set<MapReadyListener>();
  private errorListeners = new Set<MapErrorListener>();
  private suppressSync = false;
  private readonly threeOverlay = new ThreeOverlayAdapter();
  private pendingMarkups: WorldMarkup[] | null = null;
  private threeLayerAdded = false;
  private styleUrl = "";
  private terrainEnabled = false;
  private terrainSource: TerrainSourceDefinition | null = null;

  create(container: HTMLElement, initialCamera: CameraState, styleUrl: string): void {
    if (this.map) {
      return;
    }

    this.styleUrl = styleUrl;
    const mapCamera = cameraStateToMapLibre(initialCamera);

    this.map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: mapCamera.center,
      zoom: mapCamera.zoom,
      bearing: mapCamera.bearing,
      pitch: mapCamera.pitch
    });

    this.map.on("moveend", () => {
      if (this.suppressSync || !this.map) {
        return;
      }

      const state = mapLibreToCameraState(this.map);
      for (const listener of this.cameraListeners) {
        listener(state);
      }
    });

    this.map.on("load", () => {
      void this.onMapStyleReady("initial-load");
    });

    this.map.on("error", (event) => {
      this.emitError(classifyMapLibreError(event));
    });
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.threeLayerAdded = false;
    this.pendingMarkups = null;
    this.styleUrl = "";
    this.terrainEnabled = false;
    this.terrainSource = null;
  }

  configureTerrain(enabled: boolean, source: TerrainSourceDefinition | null): void {
    this.terrainEnabled = enabled;
    this.terrainSource = source;
  }

  isTerrainEnabled(): boolean {
    return this.terrainEnabled;
  }

  async setTerrainEnabled(enabled: boolean, source: TerrainSourceDefinition | null): Promise<void> {
    this.terrainEnabled = enabled;
    this.terrainSource = source;

    if (!this.map?.loaded()) {
      return;
    }

    await this.applyTerrainState();
    this.emitReady("terrain-changed");
  }

  async setMapStyle(styleUrl: string): Promise<void> {
    if (!this.map) {
      this.styleUrl = styleUrl;
      return;
    }

    if (styleUrl === this.styleUrl) {
      return;
    }

    const preservedCamera = mapLibreToCameraState(this.map);
    this.styleUrl = styleUrl;
    this.threeLayerAdded = false;

    await new Promise<void>((resolve, reject) => {
      const onIdle = () => {
        applyCameraInstantToMap(this.map!, preservedCamera);
        void this.onMapStyleReady("style-changed").then(resolve);
      };

      const onError = (event: maplibregl.ErrorEvent) => {
        reject(new Error(event.error?.message ?? "Failed to load map style."));
      };

      this.map!.once("idle", onIdle);
      this.map!.once("error", onError);
      this.map!.setStyle(styleUrl);
    });
  }

  setWorldMarkup(markups: WorldMarkup[]): void {
    if (!this.map || !this.threeLayerAdded) {
      this.pendingMarkups = markups;
      return;
    }

    this.threeOverlay.setMarkups(markups);
    this.refreshMarkupGrounding();
  }

  setWorldMarkers(markers: WorldMarker[]): void {
    this.setWorldMarkup(markupsFromMarkers(markers));
  }

  highlightWorldMarkup(markupId: string | null): void {
    this.threeOverlay.setHighlightedMarkupId(markupId);
  }

  highlightWorldMarker(markerId: string | null): void {
    this.highlightWorldMarkup(markerId);
  }

  isReady(): boolean {
    return this.map?.loaded() ?? false;
  }

  waitForReady(): Promise<void> {
    if (!this.map) {
      return Promise.reject(new Error("MapLibreAdapter is not attached to a container."));
    }

    if (this.map.loaded()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.map?.once("load", () => {
        resolve();
      });
    });
  }

  readCameraState(): CameraState | null {
    if (!this.map) {
      return null;
    }

    return mapLibreToCameraState(this.map);
  }

  applyCameraInstant(state: CameraState): void {
    if (!this.map) {
      return;
    }

    applyCameraInstantToMap(this.map, state);
  }

  setCameraSyncSuppressed(suppressed: boolean): void {
    this.suppressSync = suppressed;
  }

  projectGeo(lng: number, lat: number, altitudeMeters = 0): { x: number; y: number } | null {
    if (!this.map || !this.map.loaded()) {
      return null;
    }

    return projectGeoToScreen(this.map, lng, lat, altitudeMeters, this.terrainEnabled);
  }

  unprojectScreen(x: number, y: number): { lng: number; lat: number; altitudeMeters?: number } | null {
    if (!this.map || !this.map.loaded()) {
      return null;
    }

    return unprojectScreenToGeo(this.map, x, y, this.terrainEnabled);
  }

  queryGroundElevation(lng: number, lat: number): number | null {
    if (!this.map || !this.map.loaded()) {
      return null;
    }

    return queryGroundElevationMeters(this.map, lng, lat, this.terrainEnabled);
  }

  onCameraChange(listener: CameraChangeListener): () => void {
    this.cameraListeners.add(listener);
    return () => {
      this.cameraListeners.delete(listener);
    };
  }

  onMapReady(listener: MapReadyListener): () => void {
    this.readyListeners.add(listener);
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  onMapError(listener: MapErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private async onMapStyleReady(reason: MapReadyReason): Promise<void> {
    this.addThreeLayer();
    await this.applyTerrainState();
    this.emitReady(reason);
  }

  private emitReady(reason: MapReadyReason): void {
    for (const listener of this.readyListeners) {
      listener(reason);
    }
  }

  private emitError(error: ClassifiedMapError): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }

  private async applyTerrainState(): Promise<void> {
    if (!this.map) {
      return;
    }

    if (this.terrainEnabled && this.terrainSource) {
      applyTerrainToMap(this.map, this.terrainSource);
      this.moveThreeLayerToTop();

      await new Promise<void>((resolve) => {
        this.map!.once("idle", () => {
          resolve();
        });
      });

      this.refreshMarkupGrounding();
      return;
    }

    removeTerrainFromMap(this.map);
    this.refreshMarkupGrounding();
  }

  private refreshMarkupGrounding(): void {
    if (!this.map) {
      return;
    }

    this.threeOverlay.refreshMarkupGrounding((lng, lat) => {
      if (!this.terrainEnabled) {
        return 0;
      }

      return queryTerrainElevationMeters(this.map!, lng, lat);
    });
  }

  private addThreeLayer(): void {
    if (!this.map || this.threeLayerAdded) {
      return;
    }

    if (this.map.getLayer(LAYER_ID)) {
      this.moveThreeLayerToTop();
      this.threeLayerAdded = true;
      return;
    }

    this.map.addLayer(this.threeOverlay.getLayer());
    this.moveThreeLayerToTop();
    this.threeLayerAdded = true;

    if (this.pendingMarkups) {
      this.threeOverlay.setMarkups(this.pendingMarkups);
      this.pendingMarkups = null;
      this.refreshMarkupGrounding();
    }
  }

  private moveThreeLayerToTop(): void {
    if (!this.map?.getLayer(LAYER_ID)) {
      return;
    }

    this.map.moveLayer(LAYER_ID);
  }
}

export { LAYER_ID };
