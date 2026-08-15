import maplibregl from "maplibre-gl";
import type { BoundaryLayerDefinition } from "../../types/boundaryLayer";
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
import type { AtlasViewMode } from "../../types/viewMode";
import type { AtmosphereSettings } from "../../types/atmosphere";
import type { LightingSettings } from "../../types/lighting";
import { applyAtmosphereToMap } from "../lighting/applyAtmosphere";
import { applyViewModeToMap } from "./viewModeSetup";
import {
  isProjectionBlendActive,
  isViewModeProjectionSettled,
  readProjectionTransition
} from "./projectionBlend";
import {
  queryBoundaryFeatureAtScreen,
  setBoundaryFeatureHighlight,
  syncBoundaryLayersOnMap
} from "./boundarySetup";
import { parseBoundaryFeatureId } from "../../interaction/boundaryFeatureIds";

type CameraChangeListener = (state: CameraState) => void;
type MapReadyListener = (reason: MapReadyReason) => void;
type MapErrorListener = (error: ClassifiedMapError) => void;
type ProjectionBlendListener = (transition: number) => void;

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
  private viewMode: AtlasViewMode = "map";
  private atmosphereSettings: AtmosphereSettings | null = null;
  private lightingSettings: LightingSettings | null = null;
  private projectionBlendListeners = new Set<ProjectionBlendListener>();
  private boundaryLayers: BoundaryLayerDefinition[] = [];
  private highlightedBoundary: { layerId: string; featureKey: string } | null = null;

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

    this.map.on("render", () => {
      this.handleProjectionBlendFrame();
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
    this.boundaryLayers = [];
    this.highlightedBoundary = null;
  }

  configureTerrain(enabled: boolean, source: TerrainSourceDefinition | null): void {
    this.terrainEnabled = enabled;
    this.terrainSource = source;
  }

  configureViewMode(mode: AtlasViewMode): void {
    this.viewMode = mode;
    this.threeOverlay.setViewMode(mode);
  }

  configureAtmosphere(settings: AtmosphereSettings): void {
    this.atmosphereSettings = settings;
  }

  configureLighting(settings: LightingSettings): void {
    this.lightingSettings = settings;
    this.threeOverlay.setLightingSettings(settings);
  }

  setViewMode(mode: AtlasViewMode): void {
    this.viewMode = mode;
    this.threeOverlay.setViewMode(mode);

    if (!this.map?.loaded()) {
      return;
    }

    applyViewModeToMap(this.map, mode);
    this.applyVisualEnvironment();
    this.refreshMarkupGrounding();
    this.map.triggerRepaint();
  }

  setAtmosphereSettings(settings: AtmosphereSettings): void {
    this.atmosphereSettings = settings;

    if (!this.map?.loaded()) {
      return;
    }

    this.applyVisualEnvironment();
    this.map.triggerRepaint();
  }

  setLightingSettings(settings: LightingSettings): void {
    this.lightingSettings = settings;
    this.threeOverlay.setLightingSettings(settings);
    this.map?.triggerRepaint();
  }

  getViewMode(): AtlasViewMode {
    return this.viewMode;
  }

  isViewModeProjectionSettled(mode: AtlasViewMode = this.viewMode): boolean {
    if (!this.map?.loaded()) {
      return true;
    }

    return isViewModeProjectionSettled(mode, this.map);
  }

  readProjectionTransition(): number {
    if (!this.map?.loaded()) {
      return this.viewMode === "globe" ? 1 : 0;
    }

    return readProjectionTransition(this.map);
  }

  onProjectionBlendProgress(listener: ProjectionBlendListener): () => void {
    this.projectionBlendListeners.add(listener);
    return () => {
      this.projectionBlendListeners.delete(listener);
    };
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

  setBoundaryLayers(definitions: BoundaryLayerDefinition[]): void {
    this.boundaryLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncBoundaryLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyBoundaryHighlight(this.highlightedBoundary);
  }

  getEnabledBoundaryLayerIds(): string[] {
    return this.boundaryLayers.map((layer) => layer.id);
  }

  queryBoundaryFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryBoundaryFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledBoundaryLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightBoundaryFeature(featureId: string | null): void {
    const parsed = featureId ? parseBoundaryFeatureId(featureId) : null;
    this.applyBoundaryHighlight(parsed);
  }

  private applyBoundaryHighlight(
    next: { layerId: string; featureKey: string } | null
  ): void {
    if (!this.map?.loaded()) {
      this.highlightedBoundary = next;
      return;
    }

    setBoundaryFeatureHighlight(this.map, next?.layerId ?? "", next?.featureKey ?? null, this.highlightedBoundary);
    this.highlightedBoundary = next;
    this.map.triggerRepaint();
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
    this.applyVisualEnvironment();
    await this.applyTerrainState();
    if (this.boundaryLayers.length > 0) {
      syncBoundaryLayersOnMap(this.map!, this.boundaryLayers);
      this.moveThreeLayerToTop();
      this.applyBoundaryHighlight(this.highlightedBoundary);
    }
    this.emitReady(reason);
  }

  private applyVisualEnvironment(): void {
    if (!this.map) {
      return;
    }

    applyViewModeToMap(this.map, this.viewMode);

    if (this.atmosphereSettings) {
      applyAtmosphereToMap(this.map, this.atmosphereSettings);
    }

    if (this.lightingSettings) {
      this.threeOverlay.setLightingSettings(this.lightingSettings);
    }
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

  private handleProjectionBlendFrame(): void {
    if (!this.map?.loaded()) {
      return;
    }

    const transition = readProjectionTransition(this.map);

    if (isProjectionBlendActive(transition)) {
      this.refreshMarkupGrounding();
    }

    for (const listener of this.projectionBlendListeners) {
      listener(transition);
    }
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
