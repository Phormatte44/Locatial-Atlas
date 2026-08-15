import type { AtlasEngineContract, AtlasEngineOptions } from "../contracts";
import type { CameraState } from "../types/camera";
import type { CameraTransitionEvent, CameraTransitionListener } from "../types/cameraTransition";
import type { CameraPathFamily } from "../types/cameraTransition";
import type { AtlasPlace } from "../types/place";
import type { GeographicBounds } from "../types/bounds";
import type { MapStyleDefinition } from "../types/mapStyle";
import type { TerrainSourceDefinition } from "../types/terrain";
import type { BoundaryLayerDefinition } from "../types/boundaryLayer";
import type { LabelLayerDefinition } from "../types/labelLayer";
import type { RoadLayerDefinition } from "../types/roadLayer";
import type { AreaLayerDefinition } from "../types/areaLayer";
import type { BuildingLayerDefinition } from "../types/buildingLayer";
import type { PoiLayerDefinition } from "../types/poiLayer";
import type { RasterLayerDefinition } from "../types/rasterLayer";
import type { Tileset3DLayerDefinition } from "../types/tileset3DLayer";
import { markupsFromMarkers } from "../geometry/worldMarkup";
import type { WorldMarker } from "../types/worldMarker";
import { getMarkupAnchor, type WorldMarkup } from "../types/worldMarkup";
import { CameraController } from "../camera/CameraController";
import { CameraTransitionRunner } from "../camera/CameraTransitionRunner";
import { selectPathFamily } from "../camera/paths";
import { computeTransitionDurationMs } from "../camera/transitionDuration";
import {
  getMapStyleDefinition,
  listAvailableMapStyles,
  registerMapStyle as registerMapStyleDefinition,
  resolveMapStyleUrl
} from "../data/providers/mapStyle/resolveMapStyle";
import {
  getTerrainSourceDefinition,
  listAvailableTerrainSources,
  registerTerrainSource as registerTerrainSourceDefinition,
  resolveTerrainSource
} from "../data/providers/terrain/resolveTerrain";
import {
  listAvailableBoundaryLayers,
  registerBoundaryLayer as registerBoundaryLayerDefinition,
  resolveBoundaryLayers
} from "../data/providers/boundary/resolveBoundaryLayer";
import {
  listAvailableLabelLayers,
  registerLabelLayer as registerLabelLayerDefinition,
  resolveLabelLayers
} from "../data/providers/label/resolveLabelLayer";
import {
  listAvailableRoadLayers,
  registerRoadLayer as registerRoadLayerDefinition,
  resolveRoadLayers
} from "../data/providers/road/resolveRoadLayer";
import {
  listAvailableAreaLayers,
  registerAreaLayer as registerAreaLayerDefinition,
  resolveAreaLayers
} from "../data/providers/area/resolveAreaLayer";
import {
  listAvailableBuildingLayers,
  registerBuildingLayer as registerBuildingLayerDefinition,
  resolveBuildingLayers
} from "../data/providers/building/resolveBuildingLayer";
import {
  listAvailablePoiLayers,
  registerPoiLayer as registerPoiLayerDefinition,
  resolvePoiLayers
} from "../data/providers/poi/resolvePoiLayer";
import {
  listAvailableRasterLayers,
  registerRasterLayer as registerRasterLayerDefinition,
  resolveRasterLayers
} from "../data/providers/raster/resolveRasterLayer";
import {
  listAvailableTileset3DLayers,
  registerTileset3DLayer as registerTileset3DLayerDefinition,
  resolveTileset3DLayers
} from "../data/providers/tileset3d/resolveTileset3DLayer";
import { isBoundaryFeatureId } from "../interaction/boundaryFeatureIds";
import { isLabelFeatureId } from "../interaction/labelFeatureIds";
import { isRoadFeatureId } from "../interaction/roadFeatureIds";
import { isAreaFeatureId } from "../interaction/areaFeatureIds";
import { isBuildingFeatureId } from "../interaction/buildingFeatureIds";
import { isPoiFeatureId, parsePoiFeatureId } from "../interaction/poiFeatureIds";
import { isTileset3DFeatureId } from "../interaction/tileset3dFeatureIds";
import { DEFAULT_MAP_STYLE_ID } from "../data/mapStyles/builtinMapStyles";
import { DEFAULT_TERRAIN_SOURCE_ID } from "../data/terrain/builtinTerrainSources";
import type { GeoHoverEvent, GeoHoverListener } from "../types/geoHover";
import type { GeoSelectEvent, GeoSelectListener } from "../types/geoSelect";
import type { MapReadyEvent, MapReadyListener } from "../types/mapReady";
import type { MapErrorEvent, MapErrorListener } from "../types/mapError";
import type {
  LayerFamily,
  LayerLoadChangeEvent,
  LayerLoadChangeListener,
  LayerLoadState
} from "../types/layerLoadState";
import type { CameraChangeEvent, CameraChangeListener } from "../types/cameraChange";
import type { AtlasViewMode, ViewModeChangeEvent, ViewModeChangeListener } from "../types/viewMode";
import { ATLAS_VIEW_MODES } from "../types/viewMode";
import type {
  AtmosphereChangeEvent,
  AtmosphereChangeListener,
  AtmosphereSettings
} from "../types/atmosphere";
import type {
  LightingChangeEvent,
  LightingChangeListener,
  LightingSettings
} from "../types/lighting";
import {
  DEFAULT_ATMOSPHERE_SETTINGS,
  DEFAULT_LIGHTING_SETTINGS,
  mergeAtmosphereSettings,
  mergeLightingSettings
} from "../rendering/lighting/atmosphereDefaults";
import { findNearestGeoFeature } from "../interaction/pickGeoFeature";
import { findNearestInteractiveMarkup } from "../interaction/pickInteractiveMarkup";
import { MapLibreAdapter } from "../rendering/maplibre/MapLibreAdapter";
import { snapCameraStateForMapLibre } from "../rendering/maplibre/cameraToMapLibre";
import {
  isProjectionBlendActive,
  viewModeSwitchUsesProjectionBlend
} from "../rendering/maplibre/projectionBlend";

export class AtlasEngine implements AtlasEngineContract {
  private readonly camera = new CameraController();
  private readonly mapAdapter = new MapLibreAdapter();
  private readonly transitionRunner = new CameraTransitionRunner();
  private worldMarkups: WorldMarkup[] = [];
  private mapStyleId: string;
  private terrainSourceId: string;
  private terrainEnabled: boolean;
  private attached = false;
  private pendingAnimatedFrame: AtlasPlace | null = null;
  private readonly transitionListeners = new Set<CameraTransitionListener>();
  private readonly geoHoverListeners = new Set<GeoHoverListener>();
  private readonly geoSelectListeners = new Set<GeoSelectListener>();
  private readonly mapReadyListeners = new Set<MapReadyListener>();
  private readonly mapErrorListeners = new Set<MapErrorListener>();
  private readonly layerLoadChangeListeners = new Set<LayerLoadChangeListener>();
  private readonly cameraChangeListeners = new Set<CameraChangeListener>();
  private lastGeoHoverKey = "";
  private hoverFeatureId: string | null = null;
  private selectedFeatureId: string | null = null;
  private explicitHighlightId: string | null = null;
  private activeTransition: { pathFamily: CameraPathFamily; from: CameraState; to: CameraState } | null =
    null;
  private lastTransitionProgressEmit = -1;
  private viewMode: AtlasViewMode;
  private atmosphereSettings: AtmosphereSettings;
  private lightingSettings: LightingSettings;
  private readonly viewModeListeners = new Set<ViewModeChangeListener>();
  private readonly atmosphereListeners = new Set<AtmosphereChangeListener>();
  private readonly lightingListeners = new Set<LightingChangeListener>();
  private pendingViewModeChange: ViewModeChangeEvent | null = null;
  private lastViewModeProgressEmit = -1;
  private enabledBoundaryLayerIds: string[] = [];
  private enabledLabelLayerIds: string[] = [];
  private enabledRoadLayerIds: string[] = [];
  private enabledAreaLayerIds: string[] = [];
  private enabledBuildingLayerIds: string[] = [];
  private enabledPoiLayerIds: string[] = [];
  private enabledRasterLayerIds: string[] = [];
  private enabledTileset3DLayerIds: string[] = [];

  constructor(options: AtlasEngineOptions = {}) {
    this.mapStyleId = options.mapStyleId ?? DEFAULT_MAP_STYLE_ID;
    this.terrainSourceId = options.terrainSourceId ?? DEFAULT_TERRAIN_SOURCE_ID;
    this.terrainEnabled = options.terrainEnabled ?? false;
    this.viewMode = options.viewMode ?? "map";
    this.atmosphereSettings = mergeAtmosphereSettings(DEFAULT_ATMOSPHERE_SETTINGS, options.atmosphere);
    this.lightingSettings = mergeLightingSettings(DEFAULT_LIGHTING_SETTINGS, options.lighting);

    this.mapAdapter.configureTileset3DDecoderBaseUrl(options.tileset3DDecoderBaseUrl);

    this.mapAdapter.configureViewMode(this.viewMode);
    this.mapAdapter.configureAtmosphere(this.atmosphereSettings);
    this.mapAdapter.configureLighting(this.lightingSettings);

    this.mapAdapter.configureTerrain(
      this.terrainEnabled,
      this.terrainEnabled ? resolveTerrainSource(this.terrainSourceId) : null
    );

    this.mapAdapter.onCameraChange((state) => {
      if (this.transitionRunner.isRunning()) {
        return;
      }

      this.camera.setState(state);
      this.emitCameraChange({
        state,
        reason: "user-interaction"
      });
    });

    this.mapAdapter.onMapReady((reason) => {
      this.emitMapReady({
        ready: true,
        reason,
        mapStyleId: this.mapStyleId
      });
    });

    this.mapAdapter.onMapError((error) => {
      this.emitMapError({
        ...error,
        mapStyleId: this.mapStyleId
      });
    });

    this.mapAdapter.onLayerLoadChange((event) => {
      this.emitLayerLoadChange(event);
    });

    this.mapAdapter.onProjectionBlendProgress((transition) => {
      this.handleProjectionBlendProgress(transition);
    });
  }

  isMapReady(): boolean {
    return this.attached && this.mapAdapter.isReady();
  }

  onMapReady(listener: MapReadyListener): () => void {
    this.mapReadyListeners.add(listener);

    if (this.isMapReady()) {
      listener({
        ready: true,
        reason: "initial-load",
        mapStyleId: this.mapStyleId
      });
    }

    return () => {
      this.mapReadyListeners.delete(listener);
    };
  }

  onMapError(listener: MapErrorListener): () => void {
    this.mapErrorListeners.add(listener);
    return () => {
      this.mapErrorListeners.delete(listener);
    };
  }

  getLayerLoadState(layerId: string): LayerLoadState | undefined {
    return this.mapAdapter.getLayerLoadState(layerId);
  }

  getLayerLoadStates(): LayerLoadState[] {
    return this.mapAdapter.getLayerLoadStates();
  }

  onLayerLoadChange(listener: LayerLoadChangeListener): () => void {
    this.layerLoadChangeListeners.add(listener);

    for (const state of this.getLayerLoadStates()) {
      listener({ state });
    }

    return () => {
      this.layerLoadChangeListeners.delete(listener);
    };
  }

  retryLayerLoad(layerId: string, family?: LayerFamily): boolean {
    return this.mapAdapter.retryLayerLoad(layerId, family);
  }

  onCameraChange(listener: CameraChangeListener): () => void {
    this.cameraChangeListeners.add(listener);
    listener({
      state: this.getCameraState(),
      reason: "sync"
    });
    return () => {
      this.cameraChangeListeners.delete(listener);
    };
  }

  attach(container: HTMLElement): void {
    if (this.attached) {
      return;
    }

    const styleUrl = resolveMapStyleUrl(this.mapStyleId);
    this.mapAdapter.create(container, this.camera.getState(), styleUrl);
    this.attached = true;

    if (this.pendingAnimatedFrame) {
      const place = this.pendingAnimatedFrame;
      this.pendingAnimatedFrame = null;
      void this.framePlace(place);
    }
  }

  detach(): void {
    if (!this.attached) {
      return;
    }

    this.cancelActiveTransition("cancelled");
    this.lastGeoHoverKey = "";
    this.hoverFeatureId = null;
    this.selectedFeatureId = null;
    this.explicitHighlightId = null;
    this.enabledBoundaryLayerIds = [];
    this.enabledLabelLayerIds = [];
    this.enabledRoadLayerIds = [];
    this.enabledAreaLayerIds = [];
    this.enabledBuildingLayerIds = [];
    this.syncFeatureHighlight();
    this.emitMapReady({
      ready: false,
      reason: "detached",
      mapStyleId: this.mapStyleId
    });
    this.mapAdapter.destroy();
    this.attached = false;
  }

  getCameraState(): CameraState {
    const state = this.camera.getState();

    if (this.isTransitionRunning() && state.transitionProgress === undefined) {
      return { ...state, transitionProgress: 0 };
    }

    return state;
  }

  isTransitionRunning(): boolean {
    return this.transitionRunner.isRunning();
  }

  setCamera(state: CameraState): void {
    this.cancelActiveTransition("cancelled");
    this.camera.setState(state);

    if (this.attached) {
      this.mapAdapter.applyCameraInstant(state);
    }

    this.emitCameraChange({
      state: this.getCameraState(),
      reason: "programmatic"
    });
  }

  async framePlace(place: AtlasPlace): Promise<void> {
    const target = this.camera.computePlaceTarget(place);

    if (!this.attached) {
      this.camera.setState(target);
      this.pendingAnimatedFrame = place;
      this.emitCameraChange({ state: target, reason: "programmatic" });
      return;
    }

    await this.animateCameraTo(target);
  }

  async frameBounds(bounds: GeographicBounds): Promise<void> {
    const target = this.camera.computeBoundsTarget(bounds);

    if (!this.attached) {
      this.camera.setState(target);
      this.emitCameraChange({ state: target, reason: "programmatic" });
      return;
    }

    await this.animateCameraTo(target);
  }

  getTransitionPathFamily(place: AtlasPlace): CameraPathFamily {
    return selectPathFamily(this.camera.getState(), this.camera.computePlaceTarget(place));
  }

  onCameraTransition(listener: CameraTransitionListener): () => void {
    this.transitionListeners.add(listener);
    return () => {
      this.transitionListeners.delete(listener);
    };
  }

  onGeoHover(listener: GeoHoverListener): () => void {
    this.geoHoverListeners.add(listener);
    return () => {
      this.geoHoverListeners.delete(listener);
    };
  }

  updateGeoHover(screenX: number, screenY: number, thresholdPx?: number): void {
    const geo = this.unproject(screenX, screenY);
    this.hoverFeatureId =
      this.findInteractiveMarkupAtScreen(screenX, screenY, thresholdPx) ??
      this.mapAdapter.queryPoiFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryTileset3DFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryLabelFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryRoadFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryBuildingFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryAreaFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryBoundaryFeatureAtScreen(screenX, screenY);
    this.syncFeatureHighlight();
    this.emitGeoHover({
      featureId: this.hoverFeatureId,
      screen: { x: screenX, y: screenY },
      geo
    });
  }

  clearGeoHover(): void {
    this.hoverFeatureId = null;
    this.lastGeoHoverKey = "";
    this.syncFeatureHighlight();
    this.emitGeoHover({
      featureId: null,
      screen: null,
      geo: null
    });
  }

  onGeoSelect(listener: GeoSelectListener): () => void {
    this.geoSelectListeners.add(listener);
    return () => {
      this.geoSelectListeners.delete(listener);
    };
  }

  getSelectedFeatureId(): string | null {
    return this.selectedFeatureId;
  }

  selectGeoAt(screenX: number, screenY: number): void {
    const geo = this.unproject(screenX, screenY);
    this.selectedFeatureId =
      this.findInteractiveMarkupAtScreen(screenX, screenY) ??
      this.mapAdapter.queryPoiFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryTileset3DFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryLabelFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryRoadFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryBuildingFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryAreaFeatureAtScreen(screenX, screenY) ??
      this.mapAdapter.queryBoundaryFeatureAtScreen(screenX, screenY);

    if (this.selectedFeatureId) {
      const poiSelection = parsePoiFeatureId(this.selectedFeatureId);
      if (poiSelection?.isCluster) {
        void this.expandClusterAt(screenX, screenY);
      }
    }

    this.syncFeatureHighlight();
    this.emitGeoSelect({
      featureId: this.selectedFeatureId,
      screen: { x: screenX, y: screenY },
      geo
    });
  }

  clearGeoSelection(): void {
    this.selectedFeatureId = null;
    this.syncFeatureHighlight();
    this.emitGeoSelect({
      featureId: null,
      screen: null,
      geo: null
    });
  }

  setWorldMarkup(markups: WorldMarkup[]): void {
    this.worldMarkups = markups;
    this.mapAdapter.setWorldMarkup(markups);
  }

  setWorldMarkers(markers: WorldMarker[]): void {
    this.setWorldMarkup(markupsFromMarkers(markers));
  }

  listMapStyles(): MapStyleDefinition[] {
    return listAvailableMapStyles();
  }

  registerMapStyle(def: MapStyleDefinition): void {
    registerMapStyleDefinition(def);
  }

  getMapStyleId(): string {
    return this.mapStyleId;
  }

  async setMapStyle(styleId: string): Promise<void> {
    const style = getMapStyleDefinition(styleId);
    if (!style) {
      throw new Error(`Unknown map style id: ${styleId}`);
    }

    this.mapStyleId = styleId;

    if (!this.attached) {
      return;
    }

    await this.mapAdapter.setMapStyle(style.styleUrl);
    this.mapAdapter.setWorldMarkup(this.worldMarkups);
  }

  isTerrainEnabled(): boolean {
    return this.terrainEnabled;
  }

  listTerrainSources(): TerrainSourceDefinition[] {
    return listAvailableTerrainSources();
  }

  registerTerrainSource(def: TerrainSourceDefinition): void {
    registerTerrainSourceDefinition(def);
  }

  getTerrainSourceId(): string {
    return this.terrainSourceId;
  }

  async setTerrainSource(sourceId: string): Promise<void> {
    const source = getTerrainSourceDefinition(sourceId);
    if (!source) {
      throw new Error(`Unknown terrain source id: ${sourceId}`);
    }

    this.terrainSourceId = sourceId;

    const resolved = this.terrainEnabled ? source : null;
    this.mapAdapter.configureTerrain(this.terrainEnabled, resolved);

    if (!this.attached) {
      return;
    }

    await this.mapAdapter.setTerrainEnabled(this.terrainEnabled, resolved);
  }

  async setTerrainEnabled(enabled: boolean): Promise<void> {
    this.terrainEnabled = enabled;

    const source = enabled ? resolveTerrainSource(this.terrainSourceId) : null;
    this.mapAdapter.configureTerrain(enabled, source);

    if (!this.attached) {
      return;
    }

    await this.mapAdapter.setTerrainEnabled(enabled, source);
  }

  listBoundaryLayers(): BoundaryLayerDefinition[] {
    return listAvailableBoundaryLayers();
  }

  registerBoundaryLayer(def: BoundaryLayerDefinition): void {
    registerBoundaryLayerDefinition(def);
  }

  getEnabledBoundaryLayerIds(): string[] {
    return [...this.enabledBoundaryLayerIds];
  }

  setBoundaryLayers(layerIds: string[]): void {
    const definitions = resolveBoundaryLayers(layerIds);
    this.enabledBoundaryLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setBoundaryLayers(definitions);
  }

  listLabelLayers(): LabelLayerDefinition[] {
    return listAvailableLabelLayers();
  }

  registerLabelLayer(def: LabelLayerDefinition): void {
    registerLabelLayerDefinition(def);
  }

  getEnabledLabelLayerIds(): string[] {
    return [...this.enabledLabelLayerIds];
  }

  setLabelLayers(layerIds: string[]): void {
    const definitions = resolveLabelLayers(layerIds);
    this.enabledLabelLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setLabelLayers(definitions);
  }

  listRoadLayers(): RoadLayerDefinition[] {
    return listAvailableRoadLayers();
  }

  registerRoadLayer(def: RoadLayerDefinition): void {
    registerRoadLayerDefinition(def);
  }

  getEnabledRoadLayerIds(): string[] {
    return [...this.enabledRoadLayerIds];
  }

  setRoadLayers(layerIds: string[]): void {
    const definitions = resolveRoadLayers(layerIds);
    this.enabledRoadLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setRoadLayers(definitions);
  }

  listAreaLayers(): AreaLayerDefinition[] {
    return listAvailableAreaLayers();
  }

  registerAreaLayer(def: AreaLayerDefinition): void {
    registerAreaLayerDefinition(def);
  }

  getEnabledAreaLayerIds(): string[] {
    return [...this.enabledAreaLayerIds];
  }

  setAreaLayers(layerIds: string[]): void {
    const definitions = resolveAreaLayers(layerIds);
    this.enabledAreaLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setAreaLayers(definitions);
  }

  listBuildingLayers(): BuildingLayerDefinition[] {
    return listAvailableBuildingLayers();
  }

  registerBuildingLayer(def: BuildingLayerDefinition): void {
    registerBuildingLayerDefinition(def);
  }

  getEnabledBuildingLayerIds(): string[] {
    return [...this.enabledBuildingLayerIds];
  }

  setBuildingLayers(layerIds: string[]): void {
    const definitions = resolveBuildingLayers(layerIds);
    this.enabledBuildingLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setBuildingLayers(definitions);
  }

  listPoiLayers(): PoiLayerDefinition[] {
    return listAvailablePoiLayers();
  }

  registerPoiLayer(def: PoiLayerDefinition): void {
    registerPoiLayerDefinition(def);
  }

  getEnabledPoiLayerIds(): string[] {
    return [...this.enabledPoiLayerIds];
  }

  setPoiLayers(layerIds: string[]): void {
    const definitions = resolvePoiLayers(layerIds);
    this.enabledPoiLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setPoiLayers(definitions);
  }

  listRasterLayers(): RasterLayerDefinition[] {
    return listAvailableRasterLayers();
  }

  registerRasterLayer(def: RasterLayerDefinition): void {
    registerRasterLayerDefinition(def);
  }

  getEnabledRasterLayerIds(): string[] {
    return [...this.enabledRasterLayerIds];
  }

  setRasterLayers(layerIds: string[]): void {
    const definitions = resolveRasterLayers(layerIds);
    this.enabledRasterLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setRasterLayers(definitions);
  }

  listTileset3DLayers(): Tileset3DLayerDefinition[] {
    return listAvailableTileset3DLayers();
  }

  registerTileset3DLayer(def: Tileset3DLayerDefinition): void {
    registerTileset3DLayerDefinition(def);
  }

  getEnabledTileset3DLayerIds(): string[] {
    return [...this.enabledTileset3DLayerIds];
  }

  setTileset3DLayers(layerIds: string[]): void {
    const definitions = resolveTileset3DLayers(layerIds);
    this.enabledTileset3DLayerIds = definitions.map((layer) => layer.id);
    this.mapAdapter.setTileset3DLayers(definitions);
  }

  async flyToTilesetBounds(layerId: string): Promise<void> {
    const bounds = this.mapAdapter.getTileset3DGeographicBounds(layerId);
    if (!bounds) {
      return;
    }

    await this.frameBounds(bounds);
  }

  async frameTilesetOnReady(layerId: string): Promise<void> {
    const current = this.getLayerLoadState(layerId);
    if (current?.family === "tiles3d" && current.status === "ready") {
      await this.flyToTilesetBounds(layerId);
      return;
    }

    await new Promise<void>((resolve) => {
      const unsubscribe = this.onLayerLoadChange(({ state }) => {
        if (state.layerId !== layerId || state.family !== "tiles3d") {
          return;
        }

        if (state.status === "ready") {
          unsubscribe();
          void this.flyToTilesetBounds(layerId).finally(resolve);
          return;
        }

        if (state.status === "error") {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  async expandClusterAt(screenX: number, screenY: number): Promise<boolean> {
    if (!this.attached) {
      return false;
    }

    return this.mapAdapter.expandClusterAt(screenX, screenY);
  }

  async frameCluster(layerId: string, clusterId: number): Promise<void> {
    if (!this.attached) {
      return;
    }

    const bounds = await this.mapAdapter.frameCluster(layerId, clusterId);
    if (!bounds) {
      return;
    }

    await this.frameBounds(bounds);
  }

  highlightFeature(featureId: string | null): void {
    this.explicitHighlightId = featureId;
    this.syncFeatureHighlight();
  }

  getHighlightedFeatureId(): string | null {
    return this.selectedFeatureId ?? this.hoverFeatureId ?? this.explicitHighlightId;
  }

  clearHighlights(): void {
    this.explicitHighlightId = null;
    this.clearGeoHover();
    this.clearGeoSelection();
  }

  highlightPlace(placeId: string | null): void {
    this.highlightFeature(placeId);
  }

  project(lng: number, lat: number, altitudeMeters = 0): { x: number; y: number } | null {
    if (!this.attached) {
      return null;
    }

    return this.mapAdapter.projectGeo(lng, lat, altitudeMeters);
  }

  unproject(x: number, y: number): { lng: number; lat: number; altitudeMeters?: number } | null {
    if (!this.attached) {
      return null;
    }

    return this.mapAdapter.unprojectScreen(x, y);
  }

  findWorldMarkerAtScreen(x: number, y: number, thresholdPx?: number): string | null {
    return this.findPlaceMarkupAtScreen(x, y, thresholdPx);
  }

  getViewMode(): AtlasViewMode {
    return this.viewMode;
  }

  setViewMode(mode: AtlasViewMode): void {
    if (this.viewMode === mode) {
      return;
    }

    const previousViewMode = this.viewMode;
    this.viewMode = mode;
    this.mapAdapter.setViewMode(mode);

    const pendingChange: ViewModeChangeEvent = { viewMode: mode, previousViewMode };

    if (!viewModeSwitchUsesProjectionBlend(previousViewMode, mode)) {
      this.emitViewModeChange(pendingChange);
      return;
    }

    this.pendingViewModeChange = pendingChange;
    this.lastViewModeProgressEmit = -1;

    if (this.mapAdapter.isViewModeProjectionSettled(mode)) {
      this.completePendingViewModeChange();
      return;
    }

    if (isProjectionBlendActive(this.mapAdapter.readProjectionTransition())) {
      this.emitViewModeTransitionProgress(this.mapAdapter.readProjectionTransition());
    }
  }

  listViewModes(): readonly AtlasViewMode[] {
    return ATLAS_VIEW_MODES;
  }

  onViewModeChange(listener: ViewModeChangeListener): () => void {
    this.viewModeListeners.add(listener);
    return () => {
      this.viewModeListeners.delete(listener);
    };
  }

  getAtmosphereSettings(): AtmosphereSettings {
    return { ...this.atmosphereSettings };
  }

  setAtmosphereSettings(settings: Partial<AtmosphereSettings>): void {
    this.atmosphereSettings = mergeAtmosphereSettings(this.atmosphereSettings, settings);
    this.mapAdapter.configureAtmosphere(this.atmosphereSettings);
    this.mapAdapter.setAtmosphereSettings(this.atmosphereSettings);
    this.emitAtmosphereChange({ settings: this.getAtmosphereSettings() });
  }

  onAtmosphereChange(listener: AtmosphereChangeListener): () => void {
    this.atmosphereListeners.add(listener);
    listener({ settings: this.getAtmosphereSettings() });
    return () => {
      this.atmosphereListeners.delete(listener);
    };
  }

  getLightingSettings(): LightingSettings {
    return { ...this.lightingSettings };
  }

  setLightingSettings(settings: Partial<LightingSettings>): void {
    this.lightingSettings = mergeLightingSettings(this.lightingSettings, settings);
    this.mapAdapter.configureLighting(this.lightingSettings);
    this.mapAdapter.setLightingSettings(this.lightingSettings);
    this.emitLightingChange({ settings: this.getLightingSettings() });
  }

  onLightingChange(listener: LightingChangeListener): () => void {
    this.lightingListeners.add(listener);
    listener({ settings: this.getLightingSettings() });
    return () => {
      this.lightingListeners.delete(listener);
    };
  }

  queryGroundElevation(lng: number, lat: number): number | null {
    if (!this.attached) {
      return null;
    }

    return this.mapAdapter.queryGroundElevation(lng, lat);
  }

  private findPlaceMarkupAtScreen(x: number, y: number, thresholdPx?: number): string | null {
    const anchors = this.worldMarkups
      .filter((markup) => markup.kind === "sphere")
      .map(getMarkupAnchor);
    const feature = findNearestGeoFeature(
      anchors,
      x,
      y,
      (lng, lat) => this.project(lng, lat),
      thresholdPx
    );

    return feature?.id ?? null;
  }

  private findInteractiveMarkupAtScreen(
    x: number,
    y: number,
    pointThresholdPx?: number
  ): string | null {
    return findNearestInteractiveMarkup(
      this.worldMarkups,
      x,
      y,
      (lng, lat, altitudeMeters) => this.project(lng, lat, altitudeMeters ?? 0),
      pointThresholdPx
    );
  }

  private syncFeatureHighlight(): void {
    const activeFeatureId =
      this.selectedFeatureId ?? this.hoverFeatureId ?? this.explicitHighlightId;

    if (activeFeatureId && isBoundaryFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightBoundaryFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isLabelFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightLabelFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isRoadFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightRoadFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isBuildingFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightBuildingFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isAreaFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isPoiFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightTileset3DFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightPoiFeature(activeFeatureId);
      return;
    }

    if (activeFeatureId && isTileset3DFeatureId(activeFeatureId)) {
      this.mapAdapter.highlightWorldMarkup(null);
      this.mapAdapter.highlightBoundaryFeature(null);
      this.mapAdapter.highlightPoiFeature(null);
      this.mapAdapter.highlightLabelFeature(null);
      this.mapAdapter.highlightRoadFeature(null);
      this.mapAdapter.highlightBuildingFeature(null);
      this.mapAdapter.highlightAreaFeature(null);
      this.mapAdapter.highlightTileset3DFeature(activeFeatureId);
      return;
    }

    this.mapAdapter.highlightBoundaryFeature(null);
    this.mapAdapter.highlightPoiFeature(null);
    this.mapAdapter.highlightTileset3DFeature(null);
    this.mapAdapter.highlightLabelFeature(null);
    this.mapAdapter.highlightRoadFeature(null);
    this.mapAdapter.highlightBuildingFeature(null);
    this.mapAdapter.highlightAreaFeature(null);
    this.mapAdapter.highlightWorldMarkup(activeFeatureId);
  }

  private emitGeoSelect(event: GeoSelectEvent): void {
    for (const listener of this.geoSelectListeners) {
      listener(event);
    }
  }

  private emitGeoHover(event: GeoHoverEvent): void {
    const key = `${event.featureId ?? "none"}:${event.geo?.lng ?? "x"}:${event.geo?.lat ?? "y"}`;
    if (key === this.lastGeoHoverKey) {
      return;
    }

    this.lastGeoHoverKey = key;
    for (const listener of this.geoHoverListeners) {
      listener(event);
    }
  }

  private emitMapReady(event: MapReadyEvent): void {
    for (const listener of this.mapReadyListeners) {
      listener(event);
    }
  }

  private emitMapError(event: MapErrorEvent): void {
    for (const listener of this.mapErrorListeners) {
      listener(event);
    }
  }

  private emitLayerLoadChange(event: LayerLoadChangeEvent): void {
    for (const listener of this.layerLoadChangeListeners) {
      listener(event);
    }
  }

  private emitCameraChange(event: CameraChangeEvent): void {
    for (const listener of this.cameraChangeListeners) {
      listener(event);
    }
  }

  private emitViewModeChange(event: ViewModeChangeEvent): void {
    for (const listener of this.viewModeListeners) {
      listener(event);
    }
  }

  private handleProjectionBlendProgress(transition: number): void {
    if (!this.pendingViewModeChange) {
      return;
    }

    if (this.mapAdapter.isViewModeProjectionSettled(this.pendingViewModeChange.viewMode)) {
      this.completePendingViewModeChange();
      return;
    }

    if (isProjectionBlendActive(transition)) {
      this.emitViewModeTransitionProgress(transition);
    }
  }

  private emitViewModeTransitionProgress(transition: number): void {
    if (!this.pendingViewModeChange) {
      return;
    }

    const progressBucket = Math.min(1, Math.floor(transition * 20) / 20);
    if (progressBucket === this.lastViewModeProgressEmit) {
      return;
    }

    this.lastViewModeProgressEmit = progressBucket;
    this.emitViewModeChange({
      ...this.pendingViewModeChange,
      transitionProgress: transition
    });
  }

  private completePendingViewModeChange(): void {
    if (!this.pendingViewModeChange) {
      return;
    }

    const settled: ViewModeChangeEvent = {
      viewMode: this.pendingViewModeChange.viewMode,
      previousViewMode: this.pendingViewModeChange.previousViewMode
    };
    this.pendingViewModeChange = null;
    this.lastViewModeProgressEmit = -1;
    this.emitViewModeChange(settled);
  }

  private emitAtmosphereChange(event: AtmosphereChangeEvent): void {
    for (const listener of this.atmosphereListeners) {
      listener(event);
    }
  }

  private emitLightingChange(event: LightingChangeEvent): void {
    for (const listener of this.lightingListeners) {
      listener(event);
    }
  }

  private settleCameraState(state: CameraState): CameraState {
    const settled = { ...state };
    delete settled.transitionProgress;
    return settled;
  }

  private emitTransitionCameraProgress(state: CameraState): void {
    const progress = state.transitionProgress;
    if (progress === undefined) {
      return;
    }

    const progressBucket = Math.min(1, Math.floor(progress * 20) / 20);
    if (progressBucket === this.lastTransitionProgressEmit) {
      return;
    }

    this.lastTransitionProgressEmit = progressBucket;
    this.emitCameraChange({
      state,
      reason: "transition"
    });
  }

  private async animateCameraTo(to: CameraState): Promise<void> {
    this.cancelActiveTransition("cancelled");

    const from = this.camera.getState();
    const pathFamily = selectPathFamily(from, to);

    await this.mapAdapter.waitForReady();

    this.activeTransition = { pathFamily, from, to };
    this.lastTransitionProgressEmit = -1;
    this.emitTransition({ phase: "started", pathFamily, from, to });

    this.mapAdapter.setCameraSyncSuppressed(true);

    try {
      await this.transitionRunner.run({
        from,
        to,
        pathFamily,
        durationMs: computeTransitionDurationMs(from, to),
        onFrame: (state) => {
          const snapped = snapCameraStateForMapLibre(state);
          this.camera.setState(snapped);
          this.mapAdapter.applyCameraInstant(snapped);
          this.emitTransitionCameraProgress(snapped);
        }
      });

      this.emitTransition({ phase: "completed", pathFamily, from, to });
      const settled = this.settleCameraState(to);
      this.camera.setState(settled);
      this.mapAdapter.applyCameraInstant(settled);
      this.lastTransitionProgressEmit = -1;
      this.emitCameraChange({
        state: settled,
        reason: "transition"
      });
    } finally {
      this.activeTransition = null;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
      this.mapAdapter.setCameraSyncSuppressed(false);
    }
  }

  private cancelActiveTransition(phase: "cancelled"): void {
    if (!this.activeTransition || !this.transitionRunner.isRunning()) {
      this.transitionRunner.cancel();
      this.lastTransitionProgressEmit = -1;
      return;
    }

    const snapshot = this.activeTransition;
    this.transitionRunner.cancel();
    this.activeTransition = null;
    this.lastTransitionProgressEmit = -1;
    const settled = this.settleCameraState(this.camera.getState());
    this.camera.setState(settled);

    if (this.attached) {
      this.mapAdapter.applyCameraInstant(settled);
    }

    this.emitTransition({
      phase,
      pathFamily: snapshot.pathFamily,
      from: snapshot.from,
      to: snapshot.to
    });
  }

  private emitTransition(event: CameraTransitionEvent): void {
    for (const listener of this.transitionListeners) {
      listener(event);
    }
  }
}
