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
export type { CameraTransitionEvent, CameraTransitionListener } from "../types/cameraTransition";
export type { CameraPathFamily } from "../types/cameraTransition";
export type { GeoHoverEvent, GeoHoverListener } from "../types/geoHover";
export type { GeoSelectEvent, GeoSelectListener } from "../types/geoSelect";
export type { MapReadyEvent, MapReadyListener, MapReadyReason } from "../types/mapReady";
export type { MapErrorEvent, MapErrorKind, MapErrorListener } from "../types/mapError";
export type { CameraChangeEvent, CameraChangeListener, CameraChangeReason } from "../types/cameraChange";
export type { AtlasViewMode, ViewModeChangeEvent, ViewModeChangeListener } from "../types/viewMode";
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
  framePlace(place: import("../types/place").AtlasPlace): Promise<void>;
  frameBounds(bounds: import("../types/bounds").GeographicBounds): Promise<void>;
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
  getTransitionPathFamily(to: import("../types/place").AtlasPlace): CameraPathFamily;
  isMapReady(): boolean;
  onMapReady(listener: import("../types/mapReady").MapReadyListener): () => void;
  onMapError(listener: import("../types/mapError").MapErrorListener): () => void;
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
  listViewModes(): readonly import("../types/viewMode").AtlasViewMode[];
  onViewModeChange(listener: import("../types/viewMode").ViewModeChangeListener): () => void;
  getAtmosphereSettings(): import("../types/atmosphere").AtmosphereSettings;
  setAtmosphereSettings(settings: Partial<import("../types/atmosphere").AtmosphereSettings>): void;
  onAtmosphereChange(listener: import("../types/atmosphere").AtmosphereChangeListener): () => void;
  getLightingSettings(): import("../types/lighting").LightingSettings;
  setLightingSettings(settings: Partial<import("../types/lighting").LightingSettings>): void;
  onLightingChange(listener: import("../types/lighting").LightingChangeListener): () => void;
  queryGroundElevation(lng: number, lat: number): number | null;
}
