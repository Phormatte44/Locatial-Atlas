import maplibregl from "maplibre-gl";
import type { BoundaryLayerDefinition } from "../../types/boundaryLayer";
import type { LabelLayerDefinition } from "../../types/labelLayer";
import type { RoadLayerDefinition } from "../../types/roadLayer";
import type { AreaLayerDefinition } from "../../types/areaLayer";
import type { BuildingLayerDefinition } from "../../types/buildingLayer";
import type { PoiLayerDefinition } from "../../types/poiLayer";
import type { RasterLayerDefinition } from "../../types/rasterLayer";
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
import {
  queryLabelFeatureAtScreen,
  setLabelFeatureHighlight,
  syncLabelLayersOnMap
} from "./labelSetup";
import {
  queryRoadFeatureAtScreen,
  setRoadFeatureHighlight,
  syncRoadLayersOnMap
} from "./roadSetup";
import {
  queryAreaFeatureAtScreen,
  setAreaFeatureHighlight,
  syncAreaLayersOnMap
} from "./areaSetup";
import {
  queryBuildingFeatureAtScreen,
  setBuildingFeatureHighlight,
  syncBuildingLayersOnMap
} from "./buildingSetup";
import {
  expandClusterAtScreen,
  frameCluster as frameClusterOnMap,
  queryPoiFeatureAtScreen,
  setPoiFeatureHighlight,
  syncPoiLayersOnMap
} from "./poiSetup";
import {
  addRasterLayerToMap,
  getRasterLayerDefinitionBySourceId,
  isAtlasRasterSourceId,
  parseRasterLayerIdFromSourceId,
  rasterSourceId,
  resolveRasterSourceUrlForTracking,
  syncRasterLayersOnMap
} from "./rasterSetup";
import { parseBoundaryFeatureId } from "../../interaction/boundaryFeatureIds";
import { parseLabelFeatureId } from "../../interaction/labelFeatureIds";
import { parseRoadFeatureId } from "../../interaction/roadFeatureIds";
import { parseAreaFeatureId } from "../../interaction/areaFeatureIds";
import { parseBuildingFeatureId } from "../../interaction/buildingFeatureIds";
import { parsePoiFeatureId } from "../../interaction/poiFeatureIds";
import { LayerSourceLoader } from "../../data/layerSourceLoader";
import { RasterSourceLoadTracker } from "../../data/rasterSourceLoadTracker";
import type { LayerFamily, LayerLoadChangeListener, LayerLoadState } from "../../types/layerLoadState";
import {
  applyGeoJsonToLayerSource,
  collectAsyncLayerDescriptors,
  collectInlineLayerDescriptors
} from "./asyncLayerSources";

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
  private labelLayers: LabelLayerDefinition[] = [];
  private roadLayers: RoadLayerDefinition[] = [];
  private areaLayers: AreaLayerDefinition[] = [];
  private buildingLayers: BuildingLayerDefinition[] = [];
  private poiLayers: PoiLayerDefinition[] = [];
  private rasterLayers: RasterLayerDefinition[] = [];
  private highlightedBoundary: { layerId: string; featureKey: string } | null = null;
  private highlightedLabel: { layerId: string; featureKey: string } | null = null;
  private highlightedRoad: { layerId: string; featureKey: string } | null = null;
  private highlightedArea: { layerId: string; featureKey: string } | null = null;
  private highlightedBuilding: { layerId: string; featureKey: string } | null = null;
  private highlightedPoi: { layerId: string; featureKey: string } | null = null;
  private readonly layerSourceLoader = new LayerSourceLoader();
  private readonly rasterLoadTracker = new RasterSourceLoadTracker();
  private readonly layerLoadChangeListeners = new Set<LayerLoadChangeListener>();

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

    this.layerSourceLoader.onChange(({ state }) => {
      this.emitLayerLoadChange(state);

      if (state.status === "error" && state.error) {
        this.emitLayerLoadError({
          kind: "layer-load",
          message: state.error,
          recoverable: true,
          layerId: state.layerId,
          layerFamily: state.family
        });
      }
    });

    this.rasterLoadTracker.onChange(({ state }) => {
      this.emitLayerLoadChange(state);

      if (state.status === "error" && state.error) {
        this.emitLayerLoadError({
          kind: "tile-load",
          message: state.error,
          recoverable: true,
          layerId: state.layerId,
          layerFamily: "raster"
        });
      }
    });

    this.map.on("sourcedata", (event) => {
      if (!event.sourceId || !isAtlasRasterSourceId(event.sourceId)) {
        return;
      }

      const layerId = parseRasterLayerIdFromSourceId(event.sourceId);
      if (!layerId) {
        return;
      }

      const definition = getRasterLayerDefinitionBySourceId(this.rasterLayers, event.sourceId);
      const url = definition ? resolveRasterSourceUrlForTracking(definition) : undefined;

      if (event.isSourceLoaded) {
        this.rasterLoadTracker.markReady(layerId, url);
        return;
      }

      const current = this.rasterLoadTracker.getState(layerId);
      if (!current || current.status === "idle") {
        this.rasterLoadTracker.markLoading(layerId, url);
      }
    });

    this.map.on("error", (event) => {
      const classified = classifyMapLibreError(event);
      this.emitError(classified);

      if (
        classified.layerFamily === "raster" &&
        classified.layerId &&
        classified.kind === "tile-load"
      ) {
        const definition = this.rasterLayers.find((layer) => layer.id === classified.layerId);
        this.rasterLoadTracker.markError(
          classified.layerId,
          classified.message,
          definition ? resolveRasterSourceUrlForTracking(definition) : undefined
        );
      }
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
    this.labelLayers = [];
    this.roadLayers = [];
    this.poiLayers = [];
    this.rasterLayers = [];
    this.highlightedBoundary = null;
    this.highlightedLabel = null;
    this.highlightedRoad = null;
    this.layerSourceLoader.cancelAll();
    this.rasterLoadTracker.cancelAll();
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
    this.layerSourceLoader.invalidateAll();
    this.rasterLoadTracker.cancelAll();

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
    this.syncLayerSourceLoads();
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

  setLabelLayers(definitions: LabelLayerDefinition[]): void {
    this.labelLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncLabelLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyLabelHighlight(this.highlightedLabel);
    this.syncLayerSourceLoads();
  }

  getEnabledLabelLayerIds(): string[] {
    return this.labelLayers.map((layer) => layer.id);
  }

  queryLabelFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryLabelFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledLabelLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightLabelFeature(featureId: string | null): void {
    const parsed = featureId ? parseLabelFeatureId(featureId) : null;
    this.applyLabelHighlight(parsed);
  }

  setRoadLayers(definitions: RoadLayerDefinition[]): void {
    this.roadLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncRoadLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyRoadHighlight(this.highlightedRoad);
    this.syncLayerSourceLoads();
  }

  getEnabledRoadLayerIds(): string[] {
    return this.roadLayers.map((layer) => layer.id);
  }

  queryRoadFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryRoadFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledRoadLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightRoadFeature(featureId: string | null): void {
    const parsed = featureId ? parseRoadFeatureId(featureId) : null;
    this.applyRoadHighlight(parsed);
  }

  setAreaLayers(definitions: AreaLayerDefinition[]): void {
    this.areaLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncAreaLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyAreaHighlight(this.highlightedArea);
    this.syncLayerSourceLoads();
  }

  getEnabledAreaLayerIds(): string[] {
    return this.areaLayers.map((layer) => layer.id);
  }

  queryAreaFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryAreaFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledAreaLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightAreaFeature(featureId: string | null): void {
    const parsed = featureId ? parseAreaFeatureId(featureId) : null;
    this.applyAreaHighlight(parsed);
  }

  setBuildingLayers(definitions: BuildingLayerDefinition[]): void {
    this.buildingLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncBuildingLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyBuildingHighlight(this.highlightedBuilding);
    this.syncLayerSourceLoads();
  }

  getEnabledBuildingLayerIds(): string[] {
    return this.buildingLayers.map((layer) => layer.id);
  }

  queryBuildingFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryBuildingFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledBuildingLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightBuildingFeature(featureId: string | null): void {
    const parsed = featureId ? parseBuildingFeatureId(featureId) : null;
    this.applyBuildingHighlight(parsed);
  }

  setPoiLayers(definitions: PoiLayerDefinition[]): void {
    this.poiLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncPoiLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.applyPoiHighlight(this.highlightedPoi);
    this.syncLayerSourceLoads();
  }

  setRasterLayers(definitions: RasterLayerDefinition[]): void {
    const previousIds = new Set(this.rasterLayers.map((layer) => layer.id));
    const nextIds = new Set(definitions.map((layer) => layer.id));

    for (const layerId of previousIds) {
      if (!nextIds.has(layerId)) {
        this.rasterLoadTracker.markIdle(layerId);
      }
    }

    this.rasterLayers = definitions;

    if (!this.map?.loaded()) {
      return;
    }

    syncRasterLayersOnMap(this.map, definitions);
    this.moveThreeLayerToTop();
    this.syncRasterLoadStates();
  }

  getEnabledRasterLayerIds(): string[] {
    return this.rasterLayers.map((layer) => layer.id);
  }

  getEnabledPoiLayerIds(): string[] {
    return this.poiLayers.map((layer) => layer.id);
  }

  queryPoiFeatureAtScreen(x: number, y: number): string | null {
    if (!this.map?.loaded()) {
      return null;
    }

    const pick = queryPoiFeatureAtScreen(
      this.map,
      x,
      y,
      this.getEnabledPoiLayerIds()
    );

    return pick?.featureId ?? null;
  }

  highlightPoiFeature(featureId: string | null): void {
    const parsed = featureId ? parsePoiFeatureId(featureId) : null;
    this.applyPoiHighlight(
      parsed && !parsed.isCluster
        ? { layerId: parsed.layerId, featureKey: parsed.featureKey.replace(/^cluster:/, "") }
        : null
    );
  }

  async expandClusterAt(screenX: number, screenY: number): Promise<boolean> {
    if (!this.map?.loaded()) {
      return false;
    }

    const result = await expandClusterAtScreen(
      this.map,
      screenX,
      screenY,
      this.getEnabledPoiLayerIds()
    );

    return result !== null;
  }

  async frameCluster(layerId: string, clusterId: number): Promise<import("../../types/bounds").GeographicBounds | null> {
    if (!this.map?.loaded()) {
      return null;
    }

    const coordinates = await frameClusterOnMap(this.map, layerId, clusterId);
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    let minLng = coordinates[0].lng;
    let maxLng = coordinates[0].lng;
    let minLat = coordinates[0].lat;
    let maxLat = coordinates[0].lat;

    for (const point of coordinates) {
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
    }

    return [minLng, minLat, maxLng, maxLat];
  }

  private applyPoiHighlight(next: { layerId: string; featureKey: string } | null): void {
    if (!this.map?.loaded()) {
      this.highlightedPoi = next;
      return;
    }

    setPoiFeatureHighlight(this.map, next?.layerId ?? "", next?.featureKey ?? null, this.highlightedPoi);
    this.highlightedPoi = next;
    this.map.triggerRepaint();
  }

  private applyRoadHighlight(next: { layerId: string; featureKey: string } | null): void {
    if (!this.map?.loaded()) {
      this.highlightedRoad = next;
      return;
    }

    setRoadFeatureHighlight(this.map, next?.layerId ?? "", next?.featureKey ?? null, this.highlightedRoad);
    this.highlightedRoad = next;
    this.map.triggerRepaint();
  }

  private applyAreaHighlight(next: { layerId: string; featureKey: string } | null): void {
    if (!this.map?.loaded()) {
      this.highlightedArea = next;
      return;
    }

    setAreaFeatureHighlight(this.map, next?.layerId ?? "", next?.featureKey ?? null, this.highlightedArea);
    this.highlightedArea = next;
    this.map.triggerRepaint();
  }

  private applyBuildingHighlight(next: { layerId: string; featureKey: string } | null): void {
    if (!this.map?.loaded()) {
      this.highlightedBuilding = next;
      return;
    }

    setBuildingFeatureHighlight(
      this.map,
      next?.layerId ?? "",
      next?.featureKey ?? null,
      this.highlightedBuilding
    );
    this.highlightedBuilding = next;
    this.map.triggerRepaint();
  }

  private applyLabelHighlight(next: { layerId: string; featureKey: string } | null): void {
    if (!this.map?.loaded()) {
      this.highlightedLabel = next;
      return;
    }

    setLabelFeatureHighlight(this.map, next?.layerId ?? "", next?.featureKey ?? null, this.highlightedLabel);
    this.highlightedLabel = next;
    this.map.triggerRepaint();
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

  onLayerLoadChange(listener: LayerLoadChangeListener): () => void {
    this.layerLoadChangeListeners.add(listener);
    return () => {
      this.layerLoadChangeListeners.delete(listener);
    };
  }

  getLayerLoadState(layerId: string): LayerLoadState | undefined {
    return (
      this.layerSourceLoader.findState(layerId) ?? this.rasterLoadTracker.findState(layerId)
    );
  }

  getLayerLoadStates(): LayerLoadState[] {
    return [...this.layerSourceLoader.getStates(), ...this.rasterLoadTracker.getStates()];
  }

  retryLayerLoad(layerId: string, family?: LayerFamily): boolean {
    if (family === "raster" || (!family && this.rasterLoadTracker.getState(layerId))) {
      const definition = this.rasterLayers.find((layer) => layer.id === layerId);
      if (!definition || !this.map?.loaded()) {
        return false;
      }

      this.rasterLoadTracker.markLoading(
        layerId,
        resolveRasterSourceUrlForTracking(definition)
      );
      addRasterLayerToMap(this.map, definition);
      this.moveThreeLayerToTop();
      return true;
    }

    if (family) {
      return this.layerSourceLoader.retry(family, layerId);
    }

    return this.layerSourceLoader.retryByLayerId(layerId);
  }

  private async onMapStyleReady(reason: MapReadyReason): Promise<void> {
    this.addThreeLayer();
    this.applyVisualEnvironment();
    await this.applyTerrainState();
    if (this.rasterLayers.length > 0) {
      syncRasterLayersOnMap(this.map!, this.rasterLayers);
      this.moveThreeLayerToTop();
      this.syncRasterLoadStates();
    }
    if (this.boundaryLayers.length > 0) {
      syncBoundaryLayersOnMap(this.map!, this.boundaryLayers);
      this.moveThreeLayerToTop();
      this.applyBoundaryHighlight(this.highlightedBoundary);
    }
    if (this.areaLayers.length > 0) {
      syncAreaLayersOnMap(this.map!, this.areaLayers);
      this.moveThreeLayerToTop();
      this.applyAreaHighlight(this.highlightedArea);
    }
    if (this.buildingLayers.length > 0) {
      syncBuildingLayersOnMap(this.map!, this.buildingLayers);
      this.moveThreeLayerToTop();
      this.applyBuildingHighlight(this.highlightedBuilding);
    }
    if (this.poiLayers.length > 0) {
      syncPoiLayersOnMap(this.map!, this.poiLayers);
      this.moveThreeLayerToTop();
      this.applyPoiHighlight(this.highlightedPoi);
    }
    if (this.labelLayers.length > 0) {
      syncLabelLayersOnMap(this.map!, this.labelLayers);
      this.moveThreeLayerToTop();
      this.applyLabelHighlight(this.highlightedLabel);
    }
    if (this.roadLayers.length > 0) {
      syncRoadLayersOnMap(this.map!, this.roadLayers);
      this.moveThreeLayerToTop();
      this.applyRoadHighlight(this.highlightedRoad);
    }
    this.syncLayerSourceLoads();
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

  private emitLayerLoadChange(state: LayerLoadState): void {
    for (const listener of this.layerLoadChangeListeners) {
      listener({ state });
    }
  }

  private emitLayerLoadError(error: ClassifiedMapError): void {
    this.emitError(error);
  }

  private syncLayerSourceLoads(): void {
    if (!this.map?.loaded()) {
      return;
    }

    const enabledFamilies = this.currentEnabledLayerFamilies();
    const enabledLayerIds = new Set(
      [
        ...this.boundaryLayers.map((layer) => layer.id),
        ...this.labelLayers.map((layer) => layer.id),
        ...this.roadLayers.map((layer) => layer.id),
        ...this.areaLayers.map((layer) => layer.id),
        ...this.buildingLayers.map((layer) => layer.id),
        ...this.poiLayers.map((layer) => layer.id)
      ]
    );

    for (const state of this.layerSourceLoader.getStates()) {
      if (!enabledLayerIds.has(state.layerId)) {
        this.layerSourceLoader.markIdle(state.family, state.layerId);
      }
    }

    const layerInput = {
      boundaryLayers: this.boundaryLayers,
      labelLayers: this.labelLayers,
      roadLayers: this.roadLayers,
      areaLayers: this.areaLayers,
      buildingLayers: this.buildingLayers,
      poiLayers: this.poiLayers
    };

    for (const inline of collectInlineLayerDescriptors(layerInput)) {
      this.layerSourceLoader.markInlineReady(inline.family, inline.layerId);
    }

    for (const descriptor of collectAsyncLayerDescriptors(layerInput)) {
      if (!enabledFamilies.has(descriptor.family)) {
        continue;
      }

      void this.layerSourceLoader.load(
        descriptor.family,
        descriptor.layerId,
        descriptor.url,
        (data) => {
          if (!this.map?.loaded()) {
            return;
          }

          applyGeoJsonToLayerSource(this.map, descriptor.family, descriptor.layerId, data);
          this.map.triggerRepaint();
        }
      );
    }
  }

  private syncRasterLoadStates(): void {
    const enabledIds = new Set(this.rasterLayers.map((layer) => layer.id));

    for (const state of this.rasterLoadTracker.getStates()) {
      if (!enabledIds.has(state.layerId)) {
        this.rasterLoadTracker.markIdle(state.layerId);
      }
    }

    for (const definition of this.rasterLayers) {
      const sourceId = rasterSourceId(definition.id);
      const source = this.map?.getSource(sourceId);
      const url = resolveRasterSourceUrlForTracking(definition);

      if (source && this.map?.isSourceLoaded(sourceId)) {
        this.rasterLoadTracker.markReady(definition.id, url);
      } else if (!this.rasterLoadTracker.getState(definition.id)) {
        this.rasterLoadTracker.markLoading(definition.id, url);
      }
    }
  }

  private currentEnabledLayerFamilies(): Set<LayerFamily> {
    const families = new Set<LayerFamily>();

    if (this.boundaryLayers.length > 0) {
      families.add("boundary");
    }

    if (this.labelLayers.length > 0) {
      families.add("label");
    }

    if (this.roadLayers.length > 0) {
      families.add("road");
    }

    if (this.areaLayers.length > 0) {
      families.add("area");
    }

    if (this.buildingLayers.length > 0) {
      families.add("building");
    }

    if (this.poiLayers.length > 0) {
      families.add("poi");
    }

    return families;
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
