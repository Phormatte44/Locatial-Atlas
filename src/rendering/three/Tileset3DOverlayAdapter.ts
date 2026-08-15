import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type { GeographicBounds } from "../../types/bounds";
import type { Tileset3DLayerDefinition } from "../../types/tileset3DLayer";
import type { Tileset3DSourceLoadTracker } from "../../data/tileset3DSourceLoadTracker";
import { mergeTileset3DStyle } from "../../data/tilesets3d/tileset3DDefaults";
import type { AtlasViewMode } from "../../types/viewMode";
import { isProjectionBlendActive } from "../maplibre/projectionBlend";
import {
  applyTileset3DDepthCompositing,
  applyTileset3DOpacity,
  computeTilesetGeographicBounds,
  createTileset3DPlacementMatrix,
  rebaseTilesGroupToOrigin,
  resolveTileset3DAnchor,
  type Tileset3DAnchor
} from "./tileset3DPlacement";
import { applyTileset3DFeatureHighlight, computeFeatureGeographicBounds } from "./tileset3DHighlight";
import {
  pickTileset3DFeatureAtScreen,
  resolveAsyncMeshFeaturePick,
  type Tileset3DPickResult
} from "./pickTileset3DFeature";
import {
  readTilesetFeaturePropertiesForParsedAsync,
  readTilesetFeaturePropertiesSync
} from "./tileset3DFeatureProperties";
import {
  beginTerrainAlignedDepthPass,
  resetOverlayRendererState
} from "./overlayDepthCompositing";
import { resolveTileset3DDecoderPaths } from "./tileset3DDecoderPaths";
import {
  loadTilesRendererModule,
  TILESET3D_RENDERER_MISSING_MESSAGE,
  type AtlasTilesRenderer,
  type AtlasTilesRendererConstructor
} from "./tilesRendererLoader";
import { tileset3DCustomLayerId, validateTileset3DUrl } from "./tileset3DSetup";
import { parseTileset3DFeatureId, parseTileset3DFeatureKey } from "../../interaction/tileset3dFeatureIds";

interface Tileset3DRuntimeLayer {
  definition: Tileset3DLayerDefinition;
  customLayerId: string;
  anchor: Tileset3DAnchor | null;
  placementMatrix: THREE.Matrix4 | null;
  geographicBounds: GeographicBounds | null;
  renderOrder: number;
  tiles: AtlasTilesRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  tilesCamera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  opacity: number;
  loadHandled: boolean;
  onLoadTileset: (() => void) | null;
  pickProjectionMatrix: THREE.Matrix4 | null;
  pickViewMatrix: THREE.Matrix4 | null;
  highlightedFeatureKey: string | null;
}

export interface Tileset3DOverlaySyncOptions {
  definitions: Tileset3DLayerDefinition[];
  loadTracker: Tileset3DSourceLoadTracker;
  abortControllers: Map<string, AbortController>;
  onLayerMounted?: () => void;
}

export class Tileset3DOverlayAdapter {
  private map: MapLibreMap | null = null;
  private viewMode: AtlasViewMode = "map";
  private projectionTransition = 0;
  private decoderBaseUrl: string | undefined;
  private readonly layers = new Map<string, Tileset3DRuntimeLayer>();
  private readonly pickContextByFeatureId = new Map<string, Tileset3DPickResult>();
  private tilesRendererCtor: AtlasTilesRendererConstructor | null | undefined;
  private readonly pendingDefinitions: Tileset3DLayerDefinition[] = [];
  private syncOptions: Tileset3DOverlaySyncOptions | null = null;

  setDecoderBaseUrl(baseUrl: string | undefined): void {
    this.decoderBaseUrl = baseUrl;
  }

  setMap(map: MapLibreMap | null): void {
    this.map = map;

    if (!map) {
      this.removeAllLayers();
      return;
    }

    if (this.syncOptions) {
      void this.syncLayers(this.syncOptions);
    }
  }

  setViewMode(mode: AtlasViewMode): void {
    if (this.viewMode === mode) {
      return;
    }

    this.viewMode = mode;
    this.refreshPlacementMatrices();
    this.map?.triggerRepaint();
  }

  getLayerIds(): string[] {
    return [...this.layers.keys()];
  }

  getGeographicBounds(layerId: string): GeographicBounds | null {
    return this.layers.get(layerId)?.geographicBounds ?? null;
  }

  getFeatureGeographicBounds(layerId: string, featureKey: string): GeographicBounds | null {
    const runtime = this.layers.get(layerId);
    if (!runtime?.tiles) {
      return null;
    }

    runtime.tiles.group.updateMatrixWorld(true);
    return computeFeatureGeographicBounds(
      runtime.tiles.group,
      featureKey,
      runtime.tiles.group.matrixWorld.clone(),
      runtime.definition.transform
    );
  }

  queryFeatureAtScreen(x: number, y: number, enabledLayerIds: string[]): Tileset3DPickResult | null {
    const pick = this.queryFeaturePickAtScreen(x, y, enabledLayerIds);
    if (pick) {
      this.pickContextByFeatureId.set(pick.featureId, pick);
    }

    return pick;
  }

  queryFeaturePickAtScreen(x: number, y: number, enabledLayerIds: string[]): Tileset3DPickResult | null {
    if (!this.map || enabledLayerIds.length === 0) {
      return null;
    }

    const canvas = this.map.getCanvas();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) {
      return null;
    }

    const orderedLayerIds = enabledLayerIds
      .map((layerId) => this.layers.get(layerId))
      .filter((runtime): runtime is Tileset3DRuntimeLayer => Boolean(runtime?.tiles))
      .sort((left, right) => right.renderOrder - left.renderOrder);

    for (const runtime of orderedLayerIds) {
      if (
        !runtime.tiles ||
        !runtime.pickProjectionMatrix ||
        !runtime.pickViewMatrix
      ) {
        continue;
      }

      const pick = pickTileset3DFeatureAtScreen(
        runtime.definition.id,
        runtime.tiles,
        {
          projectionMatrix: runtime.pickProjectionMatrix,
          matrixWorldInverse: runtime.pickViewMatrix
        },
        x,
        y,
        width,
        height
      );

      if (pick) {
        return pick;
      }
    }

    return null;
  }

  async resolveAsyncMeshFeaturePick(
    pick: Tileset3DPickResult
  ): Promise<Tileset3DPickResult | null> {
    const resolved = await resolveAsyncMeshFeaturePick(pick);
    if (resolved) {
      this.pickContextByFeatureId.set(resolved.featureId, resolved);
    }

    return resolved;
  }

  getFeatureProperties(layerId: string, featureId: string): Record<string, unknown> | null {
    const parsed = parseTileset3DFeatureId(featureId);
    if (!parsed || parsed.layerId !== layerId) {
      return null;
    }

    const pick = this.pickContextByFeatureId.get(featureId);
    if (!pick || pick.layerId !== layerId) {
      return null;
    }

    return readTilesetFeaturePropertiesSync(parsed.featureKey, pick.intersection);
  }

  getFeaturePropertiesFromPick(pick: Tileset3DPickResult): Record<string, unknown> | null {
    return readTilesetFeaturePropertiesSync(pick.featureKey, pick.intersection);
  }

  async getFeaturePropertiesFromPickAsync(
    pick: Tileset3DPickResult
  ): Promise<Record<string, unknown> | null> {
    const parsed = parseTileset3DFeatureKey(pick.featureKey);
    return readTilesetFeaturePropertiesForParsedAsync(parsed, pick.intersection);
  }

  highlightFeature(featureId: string | null): void {
    const parsed = featureId ? parseTileset3DFeatureId(featureId) : null;

    if (featureId && !parsed) {
      this.clearAllHighlights();
      return;
    }

    for (const runtime of this.layers.values()) {
      const isTargetLayer = parsed?.layerId === runtime.definition.id;
      const nextKey = isTargetLayer ? (parsed?.featureKey ?? null) : null;
      this.applyRuntimeHighlight(runtime, nextKey);
    }

    this.map?.triggerRepaint();
  }

  private clearAllHighlights(): void {
    for (const runtime of this.layers.values()) {
      this.applyRuntimeHighlight(runtime, null);
    }
  }

  private applyRuntimeHighlight(runtime: Tileset3DRuntimeLayer, featureKey: string | null): void {
    if (!runtime.tiles) {
      runtime.highlightedFeatureKey = featureKey;
      return;
    }

    applyTileset3DFeatureHighlight(
      runtime.tiles.group,
      featureKey,
      runtime.highlightedFeatureKey
    );
    runtime.highlightedFeatureKey = featureKey;
  }

  async syncLayers(options: Tileset3DOverlaySyncOptions): Promise<void> {
    this.syncOptions = options;
    const nextIds = new Set(options.definitions.map((definition) => definition.id));

    for (const [layerId, controller] of options.abortControllers) {
      if (!nextIds.has(layerId)) {
        controller.abort();
        options.abortControllers.delete(layerId);
        options.loadTracker.markIdle(layerId);
      }
    }

    for (const layerId of [...this.layers.keys()]) {
      if (!nextIds.has(layerId)) {
        this.removeLayer(layerId);
      }
    }

    if (!this.map?.loaded()) {
      this.pendingDefinitions.splice(
        0,
        this.pendingDefinitions.length,
        ...options.definitions
      );
      return;
    }

    this.pendingDefinitions.length = 0;

    const tilesModule = await this.ensureTilesRendererModule();
    if (!tilesModule) {
      for (const definition of options.definitions) {
        options.loadTracker.markError(
          definition.id,
          TILESET3D_RENDERER_MISSING_MESSAGE,
          definition.tilesetUrl
        );
      }
      return;
    }

    for (const [index, definition] of options.definitions.entries()) {
      void this.enableLayer(definition, options, tilesModule.TilesRenderer, index);
    }
  }

  destroy(): void {
    this.removeAllLayers();
    this.map = null;
    this.syncOptions = null;
    this.pendingDefinitions.length = 0;
    this.tilesRendererCtor = undefined;
  }

  removeLayerForRetry(layerId: string): void {
    this.removeLayer(layerId);
  }

  flushPendingLayers(): void {
    if (!this.syncOptions || this.pendingDefinitions.length === 0 || !this.map?.loaded()) {
      return;
    }

    void this.syncLayers({
      ...this.syncOptions,
      definitions: this.pendingDefinitions
    });
  }

  private async ensureTilesRendererModule() {
    if (this.tilesRendererCtor !== undefined) {
      return this.tilesRendererCtor ? { TilesRenderer: this.tilesRendererCtor } : null;
    }

    const module = await loadTilesRendererModule();
    this.tilesRendererCtor = module?.TilesRenderer ?? null;
    return module;
  }

  private async enableLayer(
    definition: Tileset3DLayerDefinition,
    options: Tileset3DOverlaySyncOptions,
    TilesRenderer: AtlasTilesRendererConstructor,
    renderOrder: number
  ): Promise<void> {
    const url = definition.tilesetUrl.trim();
    const controller = new AbortController();
    options.abortControllers.set(definition.id, controller);
    options.loadTracker.markLoading(definition.id, url);

    const existing = this.layers.get(definition.id);
    if (existing) {
      this.updateLayerDefinition(existing, definition, renderOrder);
      options.abortControllers.delete(definition.id);
      return;
    }

    try {
      await validateTileset3DUrl(url, controller.signal);

      if (options.abortControllers.get(definition.id) !== controller || !this.map) {
        return;
      }

      this.mountLayer(definition, TilesRenderer, options, url, renderOrder);
    } catch (error) {
      if (controller.signal.aborted || options.abortControllers.get(definition.id) !== controller) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown 3D Tiles load error";
      options.loadTracker.markError(definition.id, message, url);
    } finally {
      if (options.abortControllers.get(definition.id) === controller) {
        options.abortControllers.delete(definition.id);
      }
    }
  }

  private mountLayer(
    definition: Tileset3DLayerDefinition,
    TilesRenderer: AtlasTilesRendererConstructor,
    options: Tileset3DOverlaySyncOptions,
    url: string,
    renderOrder: number
  ): void {
    if (!this.map) {
      return;
    }

    const customLayerId = tileset3DCustomLayerId(definition.id);
    const style = mergeTileset3DStyle(definition.style);
    const runtime: Tileset3DRuntimeLayer = {
      definition,
      customLayerId,
      anchor: null,
      placementMatrix: null,
      geographicBounds: null,
      renderOrder,
      tiles: null,
      scene: null,
      camera: null,
      tilesCamera: null,
      renderer: null,
      opacity: style.opacity,
      loadHandled: false,
      onLoadTileset: null,
      pickProjectionMatrix: null,
      pickViewMatrix: null,
      highlightedFeatureKey: null
    };

    const customLayer: CustomLayerInterface = {
      id: customLayerId,
      type: "custom",
      renderingMode: "3d",
      onAdd: (map, gl) => {
        runtime.scene = new THREE.Scene();
        runtime.camera = new THREE.Camera();
        runtime.tilesCamera = new THREE.Camera();

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        runtime.scene.add(ambientLight);

        runtime.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        runtime.renderer.autoClear = false;

        runtime.tiles = new TilesRenderer(url);
        runtime.tiles.group.name = `atlas-tileset3d-${definition.id}`;
        runtime.tiles.group.renderOrder = renderOrder;
        runtime.scene.add(runtime.tiles.group);
        runtime.tiles.setCamera(runtime.tilesCamera);
        runtime.tiles.setResolutionFromRenderer(runtime.tilesCamera, runtime.renderer);
        void this.registerTilesetGltfExtensions(runtime, definition.decoderBaseUrl);

        runtime.onLoadTileset = () => {
          this.handleTilesetLoaded(runtime, options, url);
        };
        runtime.tiles.addEventListener("load-tileset", runtime.onLoadTileset);
      },
      render: (_gl, renderOptions) => {
        this.renderLayer(runtime, renderOptions);
      },
      onRemove: () => {
        this.disposeRuntimeLayer(runtime);
      }
    };

    this.layers.set(definition.id, runtime);

    if (this.map.getLayer(customLayerId)) {
      this.map.removeLayer(customLayerId);
    }

    this.map.addLayer(customLayer);
    options.onLayerMounted?.();
    this.map.triggerRepaint();
  }

  private handleTilesetLoaded(
    runtime: Tileset3DRuntimeLayer,
    options: Tileset3DOverlaySyncOptions,
    url: string
  ): void {
    if (!runtime.tiles || runtime.loadHandled) {
      return;
    }

    runtime.loadHandled = true;
    if (runtime.onLoadTileset) {
      runtime.tiles.removeEventListener("load-tileset", runtime.onLoadTileset);
      runtime.onLoadTileset = null;
    }

    runtime.geographicBounds = computeTilesetGeographicBounds(
      runtime.tiles,
      runtime.definition.transform
    );
    rebaseTilesGroupToOrigin(runtime.tiles);
    runtime.anchor = resolveTileset3DAnchor(runtime.tiles, runtime.definition.transform);
    runtime.placementMatrix = this.createPlacementMatrixForRuntime(runtime);
    applyTileset3DDepthCompositing(runtime.tiles.group);
    applyTileset3DOpacity(runtime.tiles.group, runtime.opacity);
    options.loadTracker.markReady(runtime.definition.id, url);
    this.map?.triggerRepaint();
  }

  private renderLayer(runtime: Tileset3DRuntimeLayer, options: CustomRenderMethodInput): void {
    if (
      !this.map ||
      !runtime.renderer ||
      !runtime.camera ||
      !runtime.scene ||
      !runtime.placementMatrix ||
      !runtime.tilesCamera
    ) {
      return;
    }

    this.projectionTransition = options.defaultProjectionData.projectionTransition;

    let placementMatrix = runtime.placementMatrix;
    if (isProjectionBlendActive(this.projectionTransition)) {
      placementMatrix = this.createPlacementMatrixForRuntime(runtime) ?? placementMatrix;
      runtime.placementMatrix = placementMatrix;
    }

    if (!placementMatrix) {
      return;
    }

    runtime.camera.projectionMatrix.fromArray(options.defaultProjectionData.mainMatrix);
    runtime.camera.projectionMatrix.multiply(placementMatrix);

    const projectionMatrix = new THREE.Matrix4().fromArray(options.projectionMatrix);
    const inverseProjection = projectionMatrix.clone().invert();
    const viewMatrix = new THREE.Matrix4().multiplyMatrices(
      inverseProjection,
      runtime.camera.projectionMatrix
    );

    runtime.tilesCamera.projectionMatrix.copy(projectionMatrix);
    runtime.tilesCamera.matrixWorldInverse.copy(viewMatrix);
    runtime.tilesCamera.matrixWorld.copy(viewMatrix).invert();

    runtime.pickProjectionMatrix = projectionMatrix.clone();
    runtime.pickViewMatrix = viewMatrix.clone();

    const gl = runtime.renderer.getContext();
    resetOverlayRendererState(runtime.renderer);
    beginTerrainAlignedDepthPass(gl);
    runtime.renderer.render(runtime.scene, runtime.camera);

    if (runtime.tiles) {
      runtime.tiles.update();
    }

    this.map.triggerRepaint();
  }

  private createPlacementMatrixForRuntime(runtime: Tileset3DRuntimeLayer): THREE.Matrix4 | null {
    if (!runtime.anchor) {
      return runtime.placementMatrix;
    }

    return createTileset3DPlacementMatrix(runtime.anchor, runtime.definition.transform, {
      viewMode: this.viewMode,
      map: this.map,
      projectionTransition: this.projectionTransition
    });
  }

  private async registerTilesetGltfExtensions(
    runtime: Tileset3DRuntimeLayer,
    layerDecoderBaseUrl?: string
  ): Promise<void> {
    if (!runtime.tiles || !runtime.renderer) {
      return;
    }

    try {
      const { GLTFExtensionsPlugin } = await import("3d-tiles-renderer/three/plugins");
      const { dracoDecoderPath, ktx2TranscoderPath } = resolveTileset3DDecoderPaths(
        layerDecoderBaseUrl ?? this.decoderBaseUrl
      );

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(dracoDecoderPath);

      const ktx2Loader = new KTX2Loader();
      ktx2Loader.setTranscoderPath(ktx2TranscoderPath);
      ktx2Loader.detectSupport(runtime.renderer);

      runtime.tiles.registerPlugin?.(
        new GLTFExtensionsPlugin({
          metadata: true,
          dracoLoader,
          ktxLoader: ktx2Loader
        })
      );
    } catch {
      if (runtime.tiles) {
        const gltfLoader = this.createGltfLoader(runtime.renderer, layerDecoderBaseUrl);
        runtime.tiles.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader);
      }
    }
  }

  private createGltfLoader(renderer: THREE.WebGLRenderer, layerDecoderBaseUrl?: string): GLTFLoader {
    const { dracoDecoderPath, ktx2TranscoderPath } = resolveTileset3DDecoderPaths(
      layerDecoderBaseUrl ?? this.decoderBaseUrl
    );

    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(dracoDecoderPath);
    gltfLoader.setDRACOLoader(dracoLoader);

    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(ktx2TranscoderPath);
    ktx2Loader.detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);

    return gltfLoader;
  }

  private updateLayerDefinition(
    runtime: Tileset3DRuntimeLayer,
    definition: Tileset3DLayerDefinition,
    renderOrder: number
  ): void {
    runtime.definition = definition;
    runtime.renderOrder = renderOrder;
    runtime.opacity = mergeTileset3DStyle(definition.style).opacity;

    if (runtime.tiles) {
      runtime.geographicBounds = computeTilesetGeographicBounds(runtime.tiles, definition.transform);
      runtime.anchor = resolveTileset3DAnchor(runtime.tiles, definition.transform);
      runtime.placementMatrix = this.createPlacementMatrixForRuntime(runtime);
      runtime.tiles.group.renderOrder = renderOrder;
      applyTileset3DDepthCompositing(runtime.tiles.group);
      applyTileset3DOpacity(runtime.tiles.group, runtime.opacity);
    }

    this.map?.triggerRepaint();
  }

  private refreshPlacementMatrices(): void {
    for (const runtime of this.layers.values()) {
      if (!runtime.anchor) {
        continue;
      }

      runtime.placementMatrix = this.createPlacementMatrixForRuntime(runtime);
    }
  }

  private disposeRuntimeLayer(runtime: Tileset3DRuntimeLayer): void {
    if (runtime.tiles && runtime.onLoadTileset) {
      runtime.tiles.removeEventListener("load-tileset", runtime.onLoadTileset);
    }

    runtime.tiles?.dispose();
    runtime.renderer?.dispose();
  }

  private removeLayer(layerId: string): void {
    const runtime = this.layers.get(layerId);
    if (!runtime) {
      return;
    }

    if (this.map?.getLayer(runtime.customLayerId)) {
      this.map.removeLayer(runtime.customLayerId);
    } else {
      this.disposeRuntimeLayer(runtime);
    }

    this.layers.delete(layerId);
  }

  private removeAllLayers(): void {
    for (const layerId of [...this.layers.keys()]) {
      this.removeLayer(layerId);
    }
  }
}
