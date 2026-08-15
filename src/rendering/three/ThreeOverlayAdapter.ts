import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import {
  applyLocalVertexPositions,
  createGlobeAwareCircleShapeGeometry,
  createGlobeAwareEllipseShapeGeometry,
  createGlobeAwareLineGeometry,
  createGlobeAwarePolygonShapeGeometry,
  createStableFillGeometry,
  effectiveRingVertexCount,
  lineLegibilityForGlobeness
} from "../../geometry/globeMarkupGeometry";
import {
  hasSignificantCameraMove,
  MarkupVertexCache,
  readCameraSignature,
  type CameraSignature
} from "../../geometry/markupVertexCache";
import type { WorldMarkup } from "../../types/worldMarkup";
import { createLabelSprite, disposeLabelObject, createLabelPlaneMesh, applyLabelOpacity } from "./labelSprites";
import { createOverlayMatrixForMarkup } from "../../world/overlayModelMatrix";
import { isProjectionBlendActive } from "../maplibre/projectionBlend";
import {
  labelLegibilityForGlobeness,
  labelUsesTangentPlane,
  resolveLabelGlobeness
} from "../../geometry/labelGlobeAlignment";
import {
  beginMarkupOverlayPass,
  resetOverlayRendererState
} from "./overlayDepthCompositing";
import {
  applyMarkupMaterialAppearance,
  applyOverlayShadowFlags,
  createMarkupMaterial,
  getTintableMarkupMaterial,
  replaceMeshMarkupMaterial,
  resolveMarkupFillColor,
  resolveMarkupOpacity,
  resolveMarkupStrokeColor,
  resolveMarkupStrokeWidth,
  type LitMarkupKind
} from "./markupMaterials";
import { markupMatchesHighlight } from "../../interaction/placeHighlightIds";
import type { AtlasViewMode } from "../../types/viewMode";
import type { LightingSettings } from "../../types/lighting";
import { OverlayLightingRig } from "../lighting/OverlayLightingRig";
import { DEFAULT_LIGHTING_SETTINGS } from "../lighting/atmosphereDefaults";
import { createOverlayShadowGroundReceiver } from "../lighting/overlayShadowConfig";
import { HIGHLIGHTED_MARKER_SCALE } from "./markerColors";

const LAYER_ID = "atlas-three-overlay";

/** Draw order when depth testing is disabled: area fills first, labels last. */
function markupRenderPriority(kind: WorldMarkup["kind"]): number {
  switch (kind) {
    case "polygon":
      return 0;
    case "line":
      return 1;
    case "circle":
    case "ellipse":
      return 2;
    case "sphere":
      return 3;
    case "label":
      return 4;
  }
}

function isLitMeshKind(kind: WorldMarkup["kind"]): kind is LitMarkupKind {
  return kind === "sphere" || kind === "polygon" || kind === "circle" || kind === "ellipse";
}

function isFillGeometryKind(
  kind: WorldMarkup["kind"]
): kind is "polygon" | "circle" | "ellipse" {
  return kind === "polygon" || kind === "circle" || kind === "ellipse";
}

interface MarkupEntry {
  id: string;
  kind: WorldMarkup["kind"];
  scene: THREE.Scene;
  anchor: THREE.Group | null;
  object: THREE.Object3D;
  groundReceiver: THREE.Mesh | null;
  baseMatrix: THREE.Matrix4;
  modelMatrix: THREE.Matrix4;
  labelUsesTangent?: boolean;
  labelHighlighted?: boolean;
  linePolygonGlobeness?: number;
  cachedVertexCount?: number;
  fillIndices?: Uint32Array | null;
}

function isGlobeAwareGeometryKind(
  kind: WorldMarkup["kind"]
): kind is "line" | "polygon" | "circle" | "ellipse" {
  return kind === "line" || kind === "polygon" || kind === "circle" || kind === "ellipse";
}

function isGlobeAwareMarkup(
  markup: WorldMarkup
): markup is Extract<WorldMarkup, { kind: "line" | "polygon" | "circle" | "ellipse" }> {
  return isGlobeAwareGeometryKind(markup.kind);
}

export class ThreeOverlayAdapter {
  private markups: WorldMarkup[] = [];
  private markupEntries: MarkupEntry[] = [];
  private highlightedMarkupId: string | null = null;
  private camera: THREE.Camera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private map: MapLibreMap | null = null;
  private viewMode: AtlasViewMode = "map";
  private projectionTransition = 0;
  private getElevationMeters: ((lng: number, lat: number) => number) | null = null;
  private lightingSettings: LightingSettings = DEFAULT_LIGHTING_SETTINGS;
  private readonly lightingRig = new OverlayLightingRig();
  private litScene: THREE.Scene | null = null;
  private readonly vertexCache = new MarkupVertexCache();
  private lastCameraSignature: CameraSignature | null = null;
  private projectionBlendWasActive = false;

  getLayer(): CustomLayerInterface {
    return {
      id: LAYER_ID,
      type: "custom",
      renderingMode: "3d",
      onAdd: (map, gl) => {
        this.map = map;
        this.camera = new THREE.Camera();
        this.litScene = new THREE.Scene();
        this.lightingRig.attachToScene(this.litScene);

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.rebuildMarkups();
      },
      render: (gl, options) => {
        this.renderMarkups(gl, options);
      },
      onRemove: () => {
        this.disposeMarkups();
        this.litScene = null;
        this.renderer?.dispose();
        this.renderer = null;
        this.camera = null;
        this.map = null;
      }
    };
  }

  setMarkups(markups: WorldMarkup[]): void {
    this.markups = markups;

    if (this.highlightedMarkupId && !markups.some((markup) => markup.id === this.highlightedMarkupId)) {
      this.highlightedMarkupId = null;
    }

    this.rebuildMarkups();
    this.map?.triggerRepaint();
  }

  setViewMode(mode: AtlasViewMode): void {
    if (this.viewMode === mode) {
      return;
    }

    this.viewMode = mode;
    this.vertexCache.invalidateGlobe();
    this.map?.triggerRepaint();
  }

  setLightingSettings(settings: LightingSettings): void {
    const lightingModeChanged = this.lightingSettings.enabled !== settings.enabled;
    const shadowModeChanged =
      this.lightingSettings.shadowEnabled !== settings.shadowEnabled ||
      this.lightingSettings.shadowIntensity !== settings.shadowIntensity;

    this.lightingSettings = settings;
    this.applyLightingSettings(settings, lightingModeChanged, shadowModeChanged);
  }

  /** Apply lighting without replacing configured base settings (projection-blend frames). */
  applyEffectiveLighting(settings: LightingSettings): void {
    this.applyLightingSettings(settings, false, false);
  }

  private applyLightingSettings(
    settings: LightingSettings,
    lightingModeChanged: boolean,
    shadowModeChanged: boolean
  ): void {
    this.lightingRig.applySettings(settings);

    if (this.litScene) {
      this.lightingRig.attachToScene(this.litScene);
    }

    for (const entry of this.markupEntries) {
      if (!entry.scene.children.includes(this.lightingRig.getDirectionalLight())) {
        this.lightingRig.attachToScene(entry.scene);
      }
    }

    if (lightingModeChanged) {
      this.refreshMarkupMaterialModes();
    }

    if (shadowModeChanged || lightingModeChanged) {
      this.refreshOverlayShadowState();
    }

    this.map?.triggerRepaint();
  }

  getViewMode(): AtlasViewMode {
    return this.viewMode;
  }

  setHighlightedMarkupId(markupId: string | null): void {
    if (this.highlightedMarkupId === markupId) {
      return;
    }

    this.highlightedMarkupId = markupId;
    this.applyHighlightStyles();
    this.map?.triggerRepaint();
  }

  refreshMarkupGrounding(getElevationMeters: (lng: number, lat: number) => number): void {
    this.getElevationMeters = getElevationMeters;
    this.refreshMarkupMatrices();
  }

  getProjectionTransition(): number {
    return this.projectionTransition;
  }

  private renderMarkups(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    options: CustomRenderMethodInput
  ): void {
    if (!this.renderer || !this.camera || !this.map || this.markupEntries.length === 0) {
      return;
    }

    this.projectionTransition = options.defaultProjectionData.projectionTransition;

    const globeInvalidated = this.syncVertexCacheInvalidation();

    if (isProjectionBlendActive(this.projectionTransition) || globeInvalidated) {
      if (isProjectionBlendActive(this.projectionTransition)) {
        this.refreshMarkupMatrices();
      }
      this.refreshGlobeAwareGeometry();
    }

    const mapMatrix = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
    const litEntries = this.markupEntries.filter((entry) => entry.anchor !== null);
    const unlitEntries = this.markupEntries.filter((entry) => entry.anchor === null);

    resetOverlayRendererState(this.renderer);
    beginMarkupOverlayPass(gl);

    if (this.litScene && litEntries.length > 0) {
      for (const entry of litEntries) {
        if (!entry.anchor) {
          continue;
        }

        entry.anchor.matrix.copy(entry.modelMatrix);
        entry.anchor.matrixAutoUpdate = false;
        entry.anchor.updateMatrixWorld(true);
      }

      this.lightingRig.updateShadowTargets(
        litEntries.flatMap((entry) => (entry.anchor ? [entry.anchor] : []))
      );

      this.camera.projectionMatrix.copy(mapMatrix);
      this.renderer.render(this.litScene, this.camera);
    }

    for (const entry of unlitEntries) {
      this.camera.projectionMatrix = mapMatrix.clone().multiply(entry.modelMatrix);
      this.renderer.render(entry.scene, this.camera);
    }

    this.map.triggerRepaint();
  }

  private rebuildMarkups(): void {
    this.vertexCache.clear();
    this.lastCameraSignature = null;
    this.disposeMarkups();

    if (this.litScene) {
      this.clearLitScene();
      this.lightingRig.attachToScene(this.litScene);
      this.lightingRig.applySettings(this.lightingSettings);
    }

    for (const markup of this.markups) {
      const scene = new THREE.Scene();
      this.lightingRig.attachToScene(scene);
      this.lightingRig.applySettings(this.lightingSettings);

      const object = this.createObjectForMarkup(markup);
      let anchor: THREE.Group | null = null;
      let groundReceiver: THREE.Mesh | null = null;

      if (isLitMeshKind(markup.kind) && this.litScene) {
        anchor = new THREE.Group();
        anchor.add(object);

        if (this.lightingRig.shadowsEnabled()) {
          groundReceiver = createOverlayShadowGroundReceiver();
          anchor.add(groundReceiver);
        }

        this.litScene.add(anchor);
      } else {
        scene.add(object);
      }

      const baseMatrix = this.createMatrixForMarkup(markup, 0);

      this.markupEntries.push({
        id: markup.id,
        kind: markup.kind,
        scene,
        anchor,
        object,
        groundReceiver,
        baseMatrix,
        modelMatrix: baseMatrix.clone(),
        linePolygonGlobeness: isGlobeAwareGeometryKind(markup.kind)
          ? resolveLabelGlobeness(this.getOverlayTransformContext())
          : undefined
      });
    }

    this.markupEntries.sort(
      (left, right) => markupRenderPriority(left.kind) - markupRenderPriority(right.kind)
    );

    this.applyHighlightStyles();
    this.refreshOverlayShadowState();
    this.map?.triggerRepaint();
  }

  private createObjectForMarkup(markup: WorldMarkup): THREE.Object3D {
    if (markup.kind === "label") {
      return this.createLabelObjectForMarkup(markup, false);
    }

    const lightingEnabled = this.lightingSettings.enabled;
    const context = this.getOverlayTransformContext();
    const globeness = resolveLabelGlobeness(context);
    const altitudeMeters = markup.altitudeMeters ?? 0;

    if (markup.kind === "line") {
      const legibility = lineLegibilityForGlobeness(globeness);
      return new THREE.Line(
        createGlobeAwareLineGeometry(markup.path, markup.lng, markup.lat, altitudeMeters, context),
        createMarkupMaterial({
          kind: "line",
          color: resolveMarkupStrokeColor(markup, false),
          opacity: resolveMarkupOpacity(markup, "line", false, legibility),
          lightingEnabled,
          strokeWidth: resolveMarkupStrokeWidth(markup)
        })
      );
    }

    if (markup.kind === "polygon") {
      const mesh = new THREE.Mesh(
        createGlobeAwarePolygonShapeGeometry(
          markup.ring,
          markup.lng,
          markup.lat,
          altitudeMeters,
          context
        ),
        createMarkupMaterial({
          kind: "polygon",
          color: resolveMarkupFillColor(markup, false),
          opacity: resolveMarkupOpacity(markup, "polygon", false),
          lightingEnabled
        })
      );
      applyOverlayShadowFlags(mesh, "polygon", this.lightingRig.shadowsEnabled());
      mesh.renderOrder = markupRenderPriority("polygon");
      return mesh;
    }

    if (markup.kind === "circle") {
      const mesh = new THREE.Mesh(
        createGlobeAwareCircleShapeGeometry(
          markup.lng,
          markup.lat,
          markup.radiusMeters,
          markup.lng,
          markup.lat,
          altitudeMeters,
          context
        ),
        createMarkupMaterial({
          kind: "circle",
          color: resolveMarkupFillColor(markup, false),
          opacity: resolveMarkupOpacity(markup, "circle", false),
          lightingEnabled
        })
      );
      applyOverlayShadowFlags(mesh, "circle", this.lightingRig.shadowsEnabled());
      mesh.renderOrder = markupRenderPriority("circle");
      return mesh;
    }

    if (markup.kind === "ellipse") {
      const mesh = new THREE.Mesh(
        createGlobeAwareEllipseShapeGeometry(
          markup.lng,
          markup.lat,
          markup.radiusXMeters,
          markup.radiusYMeters,
          markup.bearingDegrees ?? 0,
          markup.lng,
          markup.lat,
          altitudeMeters,
          context
        ),
        createMarkupMaterial({
          kind: "ellipse",
          color: resolveMarkupFillColor(markup, false),
          opacity: resolveMarkupOpacity(markup, "ellipse", false),
          lightingEnabled
        })
      );
      applyOverlayShadowFlags(mesh, "ellipse", this.lightingRig.shadowsEnabled());
      mesh.renderOrder = markupRenderPriority("ellipse");
      return mesh;
    }

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 24),
      createMarkupMaterial({
        kind: "sphere",
        color: resolveMarkupFillColor(markup, false),
        opacity: resolveMarkupOpacity(markup, "sphere", false),
        lightingEnabled
      })
    );
    applyOverlayShadowFlags(mesh, "sphere", this.lightingRig.shadowsEnabled());
    mesh.renderOrder = markupRenderPriority("sphere");
    return mesh;
  }

  private getOverlayTransformContext(): {
    viewMode: AtlasViewMode;
    map: MapLibreMap | null;
    projectionTransition: number;
  } {
    return {
      viewMode: this.viewMode,
      map: this.map,
      projectionTransition: this.projectionTransition
    };
  }

  private createLabelObjectForMarkup(
    markup: Extract<WorldMarkup, { kind: "label" }>,
    isHighlighted: boolean
  ): THREE.Object3D {
    const globeness = resolveLabelGlobeness(this.getOverlayTransformContext());
    const accentColor = resolveMarkupStrokeColor(markup, isHighlighted);

    const options = {
      text: markup.text,
      accentColor,
      highlighted: isHighlighted,
      strokeWidth: resolveMarkupStrokeWidth(markup)
    };

    return labelUsesTangentPlane(globeness)
      ? createLabelPlaneMesh(options)
      : createLabelSprite(options);
  }

  private createMatrixForMarkup(markup: WorldMarkup, terrainElevationMeters: number): THREE.Matrix4 {
    const altitudeMeters = (markup.altitudeMeters ?? 0) + terrainElevationMeters;

    return createOverlayMatrixForMarkup(markup, altitudeMeters, this.getOverlayTransformContext());
  }

  private syncLabelPresentation(entry: MarkupEntry): void {
    const markup = this.markups.find((candidate) => candidate.id === entry.id);
    if (!markup || markup.kind !== "label") {
      return;
    }

    const globeness = resolveLabelGlobeness(this.getOverlayTransformContext());
    const useTangent = labelUsesTangentPlane(globeness);
    const isHighlighted = this.isMarkupHighlighted(entry.id);
    const needsRebuild =
      useTangent !== entry.labelUsesTangent || isHighlighted !== entry.labelHighlighted;

    if (needsRebuild) {
      disposeLabelObject(entry.object);
      entry.scene.remove(entry.object);
      entry.object = this.createLabelObjectForMarkup(markup, isHighlighted);
      entry.scene.add(entry.object);
      entry.labelUsesTangent = useTangent;
      entry.labelHighlighted = isHighlighted;
    }

    applyLabelOpacity(
      entry.object,
      resolveMarkupOpacity(markup, "label", isHighlighted, labelLegibilityForGlobeness(globeness).opacity)
    );

    entry.object.renderOrder = isHighlighted
      ? markupRenderPriority(entry.kind) + 10
      : markupRenderPriority(entry.kind);

    const highlightScale = new THREE.Matrix4().makeScale(
      HIGHLIGHTED_MARKER_SCALE,
      HIGHLIGHTED_MARKER_SCALE,
      HIGHLIGHTED_MARKER_SCALE
    );

    entry.modelMatrix.copy(entry.baseMatrix);
    if (isHighlighted) {
      entry.modelMatrix.multiply(highlightScale);
    }
  }

  private syncVertexCacheInvalidation(): boolean {
    if (!this.map) {
      return false;
    }

    const cameraSignature = readCameraSignature(this.map);
    const blendActive = isProjectionBlendActive(this.projectionTransition);
    let globeInvalidated = false;

    if (hasSignificantCameraMove(this.lastCameraSignature, cameraSignature)) {
      this.vertexCache.invalidateGlobe();
      globeInvalidated = true;
    }

    if (this.projectionBlendWasActive && !blendActive) {
      this.vertexCache.invalidateGlobe();
      globeInvalidated = true;
    }

    this.lastCameraSignature = cameraSignature;
    this.projectionBlendWasActive = blendActive;
    return globeInvalidated;
  }

  private syncGlobeAwareGeometry(entry: MarkupEntry): void {
    const markup = this.markups.find((candidate) => candidate.id === entry.id);
    if (!markup || !isGlobeAwareMarkup(markup)) {
      return;
    }

    const context = this.getOverlayTransformContext();
    const globeness = resolveLabelGlobeness(context);
    const altitudeMeters = (markup.altitudeMeters ?? 0) + (this.getElevationMeters?.(markup.lng, markup.lat) ?? 0);

    if (
      entry.linePolygonGlobeness !== undefined &&
      Math.abs(entry.linePolygonGlobeness - globeness) < 0.0001
    ) {
      return;
    }

    entry.linePolygonGlobeness = globeness;

    const cacheEntry = this.vertexCache.ensureEntry(markup, this.map, altitudeMeters);
    if (!cacheEntry) {
      return;
    }

    const positions = new Float32Array(cacheEntry.vertexCount * 3);
    this.vertexCache.applyBlendedVertices(positions, cacheEntry, globeness);

    if (markup.kind === "line" && entry.object instanceof THREE.Line) {
      applyLocalVertexPositions(entry.object.geometry, positions);

      const material = getTintableMarkupMaterial(entry.object);
      if (material) {
        const isHighlighted = this.isMarkupHighlighted(entry.id);
        applyMarkupMaterialAppearance(
          material,
          resolveMarkupStrokeColor(markup, isHighlighted),
          resolveMarkupOpacity(
            markup,
            "line",
            isHighlighted,
            lineLegibilityForGlobeness(globeness)
          ),
          resolveMarkupStrokeWidth(markup)
        );
      }
      return;
    }

    if (isFillGeometryKind(markup.kind) && entry.object instanceof THREE.Mesh) {
      const effectiveCount = effectiveRingVertexCount(positions, cacheEntry.vertexCount);
      const fillPositions =
        effectiveCount === cacheEntry.vertexCount
          ? positions
          : positions.subarray(0, effectiveCount * 3);

      const needsTopologyRebuild =
        entry.cachedVertexCount !== cacheEntry.vertexCount ||
        entry.fillIndices !== cacheEntry.fillIndices;

      if (needsTopologyRebuild) {
        entry.object.geometry.dispose();
        entry.object.geometry = createStableFillGeometry(
          fillPositions,
          effectiveCount,
          cacheEntry.fillIndices
        );
        entry.cachedVertexCount = cacheEntry.vertexCount;
        entry.fillIndices = cacheEntry.fillIndices;
      } else {
        applyLocalVertexPositions(entry.object.geometry, fillPositions);
      }
    }
  }

  private refreshGlobeAwareGeometry(): void {
    for (const entry of this.markupEntries) {
      if (isGlobeAwareGeometryKind(entry.kind)) {
        entry.linePolygonGlobeness = undefined;
        this.syncGlobeAwareGeometry(entry);
      }
    }
  }

  private refreshMarkupMatrices(): void {
    if (!this.getElevationMeters) {
      return;
    }

    for (const entry of this.markupEntries) {
      const markup = this.markups.find((candidate) => candidate.id === entry.id);
      if (!markup) {
        continue;
      }

      const terrainElevationMeters = this.getElevationMeters(markup.lng, markup.lat);
      entry.baseMatrix = this.createMatrixForMarkup(markup, terrainElevationMeters);
    }

    this.applyHighlightStyles();
  }

  private applyHighlightStyles(): void {
    const highlightScale = new THREE.Matrix4().makeScale(
      HIGHLIGHTED_MARKER_SCALE,
      HIGHLIGHTED_MARKER_SCALE,
      HIGHLIGHTED_MARKER_SCALE
    );

    for (const entry of this.markupEntries) {
      const isHighlighted = this.isMarkupHighlighted(entry.id);
      const markup = this.markups.find((candidate) => candidate.id === entry.id);

      if (entry.kind === "label") {
        this.syncLabelPresentation(entry);
        continue;
      }

      if (isGlobeAwareGeometryKind(entry.kind)) {
        this.syncGlobeAwareGeometry(entry);
      }

      const material = getTintableMarkupMaterial(entry.object);

      if (!material || !markup) {
        continue;
      }

      const color =
        entry.kind === "line"
          ? resolveMarkupStrokeColor(markup, isHighlighted)
          : resolveMarkupFillColor(markup, isHighlighted);
      const legibility =
        entry.kind === "line" && entry.linePolygonGlobeness !== undefined
          ? lineLegibilityForGlobeness(entry.linePolygonGlobeness)
          : 1;
      applyMarkupMaterialAppearance(
        material,
        color,
        resolveMarkupOpacity(markup, entry.kind, isHighlighted, legibility),
        resolveMarkupStrokeWidth(markup)
      );
      entry.object.renderOrder = isHighlighted
        ? markupRenderPriority(entry.kind) + 10
        : markupRenderPriority(entry.kind);

      entry.modelMatrix.copy(entry.baseMatrix);
      if (isHighlighted && entry.kind === "sphere") {
        entry.modelMatrix.multiply(highlightScale);
      }
    }
  }

  private isMarkupHighlighted(markupId: string): boolean {
    return markupMatchesHighlight(markupId, this.highlightedMarkupId);
  }

  private refreshMarkupMaterialModes(): void {
    const lightingEnabled = this.lightingSettings.enabled;

    for (const entry of this.markupEntries) {
      if (!isLitMeshKind(entry.kind)) {
        continue;
      }

      if (!(entry.object instanceof THREE.Mesh)) {
        continue;
      }

      const markup = this.markups.find((candidate) => candidate.id === entry.id);
      if (!markup) {
        continue;
      }

      const isHighlighted = this.isMarkupHighlighted(entry.id);
      replaceMeshMarkupMaterial(
        entry.object,
        entry.kind,
        resolveMarkupFillColor(markup, isHighlighted),
        resolveMarkupOpacity(markup, entry.kind, isHighlighted),
        lightingEnabled,
        resolveMarkupStrokeWidth(markup)
      );
    }
  }

  private refreshOverlayShadowState(): void {
    const shadowsEnabled = this.lightingRig.shadowsEnabled();

    for (const entry of this.markupEntries) {
      if (!isLitMeshKind(entry.kind) || !(entry.object instanceof THREE.Mesh)) {
        continue;
      }

      applyOverlayShadowFlags(entry.object, entry.kind, shadowsEnabled);

      if (shadowsEnabled) {
        if (!entry.groundReceiver && entry.anchor) {
          entry.groundReceiver = createOverlayShadowGroundReceiver();
          entry.anchor.add(entry.groundReceiver);
        }
        continue;
      }

      if (entry.groundReceiver && entry.anchor) {
        entry.anchor.remove(entry.groundReceiver);
        entry.groundReceiver.geometry.dispose();
        const groundMaterial = entry.groundReceiver.material;
        if (groundMaterial instanceof THREE.Material) {
          groundMaterial.dispose();
        }
        entry.groundReceiver = null;
      }
    }
  }

  private clearLitScene(): void {
    if (!this.litScene) {
      return;
    }

    for (const child of [...this.litScene.children]) {
      if (
        child instanceof THREE.AmbientLight ||
        child instanceof THREE.HemisphereLight ||
        child instanceof THREE.DirectionalLight
      ) {
        continue;
      }

      this.litScene.remove(child);
    }
  }

  private disposeMarkups(): void {
    for (const entry of this.markupEntries) {
      if (entry.groundReceiver) {
        entry.groundReceiver.geometry.dispose();
        const groundMaterial = entry.groundReceiver.material;
        if (groundMaterial instanceof THREE.Material) {
          groundMaterial.dispose();
        }
      }

      if (entry.anchor && this.litScene) {
        this.litScene.remove(entry.anchor);
      }

      if (entry.kind === "label") {
        disposeLabelObject(entry.object);
      } else if (entry.object instanceof THREE.Line || entry.object instanceof THREE.Mesh) {
        entry.object.geometry.dispose();

        if (Array.isArray(entry.object.material)) {
          entry.object.material.forEach((material) => {
            material.dispose();
          });
        } else {
          entry.object.material.dispose();
        }
      }
    }

    this.markupEntries = [];
  }
}

export { LAYER_ID };
