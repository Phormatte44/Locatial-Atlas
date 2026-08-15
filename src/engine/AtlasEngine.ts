import type { AtlasEngineContract, AtlasEngineOptions } from "../contracts";
import type { CameraState } from "../types/camera";
import type { CameraTransitionEvent, CameraTransitionListener } from "../types/cameraTransition";
import type { CameraPathFamily } from "../types/cameraTransition";
import type { AtlasPlace } from "../types/place";
import type { GeographicBounds } from "../types/bounds";
import type { MapStyleDefinition } from "../types/mapStyle";
import type { TerrainSourceDefinition } from "../types/terrain";
import { markupsFromMarkers } from "../geometry/worldMarkup";
import type { WorldMarker } from "../types/worldMarker";
import { getMarkupAnchor, type WorldMarkup } from "../types/worldMarkup";
import { CameraController } from "../camera/CameraController";
import { CameraTransitionRunner } from "../camera/CameraTransitionRunner";
import { selectPathFamily } from "../camera/pathFamilies";
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
  resolveTerrainSource
} from "../data/providers/terrain/resolveTerrain";
import { DEFAULT_MAP_STYLE_ID } from "../data/mapStyles/builtinMapStyles";
import { DEFAULT_TERRAIN_SOURCE_ID } from "../data/terrain/builtinTerrainSources";
import type { GeoHoverEvent, GeoHoverListener } from "../types/geoHover";
import type { GeoSelectEvent, GeoSelectListener } from "../types/geoSelect";
import type { MapReadyEvent, MapReadyListener } from "../types/mapReady";
import type { MapErrorEvent, MapErrorListener } from "../types/mapError";
import type { CameraChangeEvent, CameraChangeListener } from "../types/cameraChange";
import { findNearestGeoFeature } from "../interaction/pickGeoFeature";
import { findNearestInteractiveMarkup } from "../interaction/pickInteractiveMarkup";
import { MapLibreAdapter } from "../rendering/maplibre/MapLibreAdapter";
import { snapCameraStateForMapLibre } from "../rendering/maplibre/cameraToMapLibre";

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
  private readonly cameraChangeListeners = new Set<CameraChangeListener>();
  private lastGeoHoverKey = "";
  private hoverFeatureId: string | null = null;
  private selectedFeatureId: string | null = null;
  private explicitHighlightId: string | null = null;
  private activeTransition: { pathFamily: CameraPathFamily; from: CameraState; to: CameraState } | null =
    null;
  private lastTransitionProgressEmit = -1;

  constructor(options: AtlasEngineOptions = {}) {
    this.mapStyleId = options.mapStyleId ?? DEFAULT_MAP_STYLE_ID;
    this.terrainSourceId = options.terrainSourceId ?? DEFAULT_TERRAIN_SOURCE_ID;
    this.terrainEnabled = options.terrainEnabled ?? false;

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
    this.syncMarkupHighlight();
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
    this.hoverFeatureId = this.findInteractiveMarkupAtScreen(screenX, screenY, thresholdPx);
    this.syncMarkupHighlight();
    this.emitGeoHover({
      featureId: this.hoverFeatureId,
      screen: { x: screenX, y: screenY },
      geo
    });
  }

  clearGeoHover(): void {
    this.hoverFeatureId = null;
    this.lastGeoHoverKey = "";
    this.syncMarkupHighlight();
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
    this.selectedFeatureId = this.findInteractiveMarkupAtScreen(screenX, screenY);
    this.syncMarkupHighlight();
    this.emitGeoSelect({
      featureId: this.selectedFeatureId,
      screen: { x: screenX, y: screenY },
      geo
    });
  }

  clearGeoSelection(): void {
    this.selectedFeatureId = null;
    this.syncMarkupHighlight();
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

  highlightFeature(featureId: string | null): void {
    this.explicitHighlightId = featureId;
    this.syncMarkupHighlight();
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

  private syncMarkupHighlight(): void {
    const activeFeatureId =
      this.selectedFeatureId ?? this.hoverFeatureId ?? this.explicitHighlightId;
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

  private emitCameraChange(event: CameraChangeEvent): void {
    for (const listener of this.cameraChangeListeners) {
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
