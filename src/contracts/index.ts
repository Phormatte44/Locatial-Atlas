import type { MapStyleDefinition } from "../types/mapStyle";
import type { CameraTransitionListener } from "../types/cameraTransition";
import type { CameraPathFamily } from "../types/cameraTransition";

export interface AtlasEngineOptions {
  mapStyleId?: string;
  terrainEnabled?: boolean;
  terrainSourceId?: string;
  viewMode?: import("../types/viewMode").AtlasViewMode;
  atmosphere?: Partial<import("../types/atmosphere").AtmosphereSettings>;
  lighting?: Partial<import("../types/lighting").LightingSettings>;
  /**
   * Default base URL for Three.js Draco/KTX2 decoder assets used by 3D Tiles overlays.
   * Per-layer {@link Tileset3DLayerDefinition.decoderBaseUrl} overrides this value.
   */
  tileset3DDecoderBaseUrl?: string;
}

export type { CameraState } from "../types/camera";
export type { AtlasPlace } from "../types/place";
export type { GeographicBounds } from "../types/bounds";
export type { WorldMarker } from "../types/worldMarker";
export type {
  GeoAnchoredFeature,
  GeoRing,
  WorldCircleMarkup,
  WorldLabelMarkup,
  WorldLineMarkup,
  WorldMarkup,
  WorldPolygonMarkup,
  WorldSphereMarkup
} from "../types/worldMarkup";
export type { GeographicPoint, ScreenPoint } from "../types/projection";
export type { MapStyleDefinition } from "../types/mapStyle";
export type { TerrainSourceDefinition } from "../types/terrain";
export type {
  BoundaryGeoJsonInline,
  BoundaryGeoJsonSource,
  BoundaryLayerDefinition,
  BoundarySemanticType,
  BoundaryStyleTokens
} from "../types/boundaryLayer";
export type {
  LabelGeoJsonInline,
  LabelGeoJsonSource,
  LabelLayerDefinition,
  LabelSemanticType,
  LabelStyleTokens
} from "../types/labelLayer";
export type {
  RoadGeoJsonInline,
  RoadGeoJsonSource,
  RoadLayerDefinition,
  RoadSemanticType,
  RoadStyleTokens
} from "../types/roadLayer";
export type {
  AreaGeoJsonInline,
  AreaGeoJsonSource,
  AreaLayerDefinition,
  AreaSemanticType,
  AreaStyleTokens
} from "../types/areaLayer";
export type {
  BuildingGeoJsonInline,
  BuildingGeoJsonSource,
  BuildingLayerDefinition,
  BuildingSemanticType,
  BuildingStyleTokens
} from "../types/buildingLayer";
export type {
  PoiClusterConfig,
  PoiGeoJsonInline,
  PoiGeoJsonSource,
  PoiLayerDefinition,
  PoiSemanticType,
  PoiStyleTokens
} from "../types/poiLayer";
export type {
  RasterLayerDefinition,
  RasterSemanticType,
  RasterStyleTokens,
  RasterTileSource
} from "../types/rasterLayer";
export type {
  Tileset3DLayerDefinition,
  Tileset3DSemanticType,
  Tileset3DStyleTokens,
  Tileset3DTransform
} from "../types/tileset3DLayer";
export type { FrameCameraOptions } from "../types/frameCamera";
export type {
  CameraTransitionEvent,
  CameraTransitionListener,
  CameraPathFamily
} from "../types/cameraTransition";
export type { GeoHoverEvent, GeoHoverListener } from "../types/geoHover";
export type { GeoSelectEvent, GeoSelectListener } from "../types/geoSelect";
export type { MapReadyEvent, MapReadyListener, MapReadyReason } from "../types/mapReady";
export type { MapErrorEvent, MapErrorKind, MapErrorListener } from "../types/mapError";
export type {
  LayerFamily,
  LayerLoadChangeEvent,
  LayerLoadChangeListener,
  LayerLoadState,
  LayerLoadStatus
} from "../types/layerLoadState";
export type { CameraChangeEvent, CameraChangeListener, CameraChangeReason } from "../types/cameraChange";
export type { AtlasViewMode, ViewModeChangeEvent, ViewModeChangeListener, ProjectionBlendListener } from "../types/viewMode";
export { ATLAS_VIEW_MODES } from "../types/viewMode";
export type {
  AtmosphereChangeEvent,
  AtmosphereChangeListener,
  AtmosphereSettings
} from "../types/atmosphere";
export type {
  LightingChangeEvent,
  LightingChangeListener,
  LightingSettings
} from "../types/lighting";

export interface AtlasEngineContract {
  getCameraState(): import("../types/camera").CameraState;
  isTransitionRunning(): boolean;
  setCamera(state: import("../types/camera").CameraState): void;
  framePlace(
    place: import("../types/place").AtlasPlace,
    options?: import("../types/frameCamera").FrameCameraOptions
  ): Promise<void>;
  frameBounds(
    bounds: import("../types/bounds").GeographicBounds,
    options?: import("../types/frameCamera").FrameCameraOptions
  ): Promise<void>;
  setWorldMarkup(markups: import("../types/worldMarkup").WorldMarkup[]): void;
  setWorldMarkers(markers: import("../types/worldMarker").WorldMarker[]): void;
  listMapStyles(): MapStyleDefinition[];
  registerMapStyle(def: MapStyleDefinition): void;
  getMapStyleId(): string;
  setMapStyle(styleId: string): Promise<void>;
  isTerrainEnabled(): boolean;
  listTerrainSources(): import("../types/terrain").TerrainSourceDefinition[];
  registerTerrainSource(def: import("../types/terrain").TerrainSourceDefinition): void;
  getTerrainSourceId(): string;
  setTerrainSource(sourceId: string): Promise<void>;
  setTerrainEnabled(enabled: boolean): Promise<void>;
  listBoundaryLayers(): import("../types/boundaryLayer").BoundaryLayerDefinition[];
  registerBoundaryLayer(def: import("../types/boundaryLayer").BoundaryLayerDefinition): void;
  getEnabledBoundaryLayerIds(): string[];
  setBoundaryLayers(layerIds: string[]): void;
  listLabelLayers(): import("../types/labelLayer").LabelLayerDefinition[];
  registerLabelLayer(def: import("../types/labelLayer").LabelLayerDefinition): void;
  getEnabledLabelLayerIds(): string[];
  setLabelLayers(layerIds: string[]): void;
  listRoadLayers(): import("../types/roadLayer").RoadLayerDefinition[];
  registerRoadLayer(def: import("../types/roadLayer").RoadLayerDefinition): void;
  getEnabledRoadLayerIds(): string[];
  setRoadLayers(layerIds: string[]): void;
  listAreaLayers(): import("../types/areaLayer").AreaLayerDefinition[];
  registerAreaLayer(def: import("../types/areaLayer").AreaLayerDefinition): void;
  getEnabledAreaLayerIds(): string[];
  setAreaLayers(layerIds: string[]): void;
  listBuildingLayers(): import("../types/buildingLayer").BuildingLayerDefinition[];
  registerBuildingLayer(def: import("../types/buildingLayer").BuildingLayerDefinition): void;
  getEnabledBuildingLayerIds(): string[];
  setBuildingLayers(layerIds: string[]): void;
  listPoiLayers(): import("../types/poiLayer").PoiLayerDefinition[];
  registerPoiLayer(def: import("../types/poiLayer").PoiLayerDefinition): void;
  getEnabledPoiLayerIds(): string[];
  setPoiLayers(layerIds: string[]): void;
  expandClusterAt(screenX: number, screenY: number): Promise<boolean>;
  frameCluster(layerId: string, clusterId: number): Promise<void>;
  listRasterLayers(): import("../types/rasterLayer").RasterLayerDefinition[];
  registerRasterLayer(def: import("../types/rasterLayer").RasterLayerDefinition): void;
  getEnabledRasterLayerIds(): string[];
  setRasterLayers(layerIds: string[]): void;
  listTileset3DLayers(): import("../types/tileset3DLayer").Tileset3DLayerDefinition[];
  registerTileset3DLayer(def: import("../types/tileset3DLayer").Tileset3DLayerDefinition): void;
  getEnabledTileset3DLayerIds(): string[];
  setTileset3DLayers(layerIds: string[]): void;
  flyToTilesetBounds(layerId: string): Promise<void>;
  frameTilesetOnReady(layerId: string): Promise<void>;
  frameTilesetFeature(layerId: string, featureId: string): Promise<void>;
  getTilesetFeatureProperties(layerId: string, featureId: string): Record<string, unknown> | null;
  getTransitionPathFamily(to: import("../types/place").AtlasPlace): CameraPathFamily;
  isMapReady(): boolean;
  onMapReady(listener: import("../types/mapReady").MapReadyListener): () => void;
  onMapError(listener: import("../types/mapError").MapErrorListener): () => void;
  getLayerLoadState(layerId: string): import("../types/layerLoadState").LayerLoadState | undefined;
  getLayerLoadStates(): import("../types/layerLoadState").LayerLoadState[];
  onLayerLoadChange(
    listener: import("../types/layerLoadState").LayerLoadChangeListener
  ): () => void;
  retryLayerLoad(
    layerId: string,
    family?: import("../types/layerLoadState").LayerFamily
  ): boolean;
  onCameraChange(listener: import("../types/cameraChange").CameraChangeListener): () => void;
  onCameraTransition(listener: CameraTransitionListener): () => void;
  onGeoHover(listener: import("../types/geoHover").GeoHoverListener): () => void;
  onGeoSelect(listener: import("../types/geoSelect").GeoSelectListener): () => void;
  updateGeoHover(screenX: number, screenY: number, thresholdPx?: number): void;
  clearGeoHover(): void;
  selectGeoAt(screenX: number, screenY: number): void;
  clearGeoSelection(): void;
  getSelectedFeatureId(): string | null;
  highlightFeature(featureId: string | null): void;
  getHighlightedFeatureId(): string | null;
  clearHighlights(): void;
  highlightPlace(placeId: string | null): void;
  project(lng: number, lat: number, altitudeMeters?: number): { x: number; y: number } | null;
  unproject(x: number, y: number): { lng: number; lat: number; altitudeMeters?: number } | null;
  findWorldMarkerAtScreen(x: number, y: number, thresholdPx?: number): string | null;
  getViewMode(): import("../types/viewMode").AtlasViewMode;
  setViewMode(mode: import("../types/viewMode").AtlasViewMode): void;
  transitionViewMode(
    mode: import("../types/viewMode").AtlasViewMode,
    options?: import("../types/viewMode").ViewModeTransitionOptions
  ): Promise<void>;
  listViewModes(): readonly import("../types/viewMode").AtlasViewMode[];
  onViewModeChange(listener: import("../types/viewMode").ViewModeChangeListener): () => void;
  getProjectionTransition(): number;
  getEffectiveAtmosphereSettings(): import("../types/atmosphere").AtmosphereSettings;
  getEffectiveLightingSettings(): import("../types/lighting").LightingSettings;
  onProjectionBlendProgress(listener: import("../types/viewMode").ProjectionBlendListener): () => void;
  getAtmosphereSettings(): import("../types/atmosphere").AtmosphereSettings;
  setAtmosphereSettings(settings: Partial<import("../types/atmosphere").AtmosphereSettings>): void;
  onAtmosphereChange(listener: import("../types/atmosphere").AtmosphereChangeListener): () => void;
  getLightingSettings(): import("../types/lighting").LightingSettings;
  setLightingSettings(settings: Partial<import("../types/lighting").LightingSettings>): void;
  onLightingChange(listener: import("../types/lighting").LightingChangeListener): () => void;
  queryGroundElevation(lng: number, lat: number): number | null;
}
