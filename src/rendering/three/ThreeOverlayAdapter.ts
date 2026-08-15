import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { createLineGeometry } from "../../geometry/lineMarkup";
import { createPolygonShapeGeometry } from "../../geometry/polygonMarkup";
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
  highlightedMarkerColorForId,
  HIGHLIGHTED_MARKER_SCALE,
  markerColorForId
} from "./markerColors";
import {
  applyMarkupMaterialAppearance,
  applyOverlayShadowFlags,
  createMarkupMaterial,
  defaultOpacityForMarkup,
  getTintableMarkupMaterial,
  replaceMeshMarkupMaterial,
  type LitMarkupKind
} from "./markupMaterials";
import { markupMatchesHighlight } from "../../interaction/placeHighlightIds";
import type { AtlasViewMode } from "../../types/viewMode";
import type { LightingSettings } from "../../types/lighting";
import { OverlayLightingRig } from "../lighting/OverlayLightingRig";
import { DEFAULT_LIGHTING_SETTINGS } from "../lighting/atmosphereDefaults";
import { createOverlayShadowGroundReceiver } from "../lighting/overlayShadowConfig";

const LAYER_ID = "atlas-three-overlay";

/** Draw order when depth testing is disabled: area fills first, labels last. */
function markupRenderPriority(kind: WorldMarkup["kind"]): number {
  switch (kind) {
    case "polygon":
      return 0;
    case "line":
      return 1;
    case "circle":
      return 2;
    case "sphere":
      return 3;
    case "label":
      return 4;
  }
}

function isLitMeshKind(kind: WorldMarkup["kind"]): kind is LitMarkupKind {
  return kind === "sphere" || kind === "polygon" || kind === "circle";
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

    if (isProjectionBlendActive(this.projectionTransition)) {
      this.refreshMarkupMatrices();
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
        modelMatrix: baseMatrix.clone()
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

    const color = markerColorForId(markup.id);
    const lightingEnabled = this.lightingSettings.enabled;

    if (markup.kind === "line") {
      return new THREE.Line(
        createLineGeometry(markup.path, markup.lng, markup.lat),
        createMarkupMaterial({
          kind: "line",
          color,
          opacity: defaultOpacityForMarkup("line", false),
          lightingEnabled
        })
      );
    }

    if (markup.kind === "polygon") {
      const mesh = new THREE.Mesh(
        createPolygonShapeGeometry(markup.ring, markup.lng, markup.lat),
        createMarkupMaterial({
          kind: "polygon",
          color,
          opacity: defaultOpacityForMarkup("polygon", false),
          lightingEnabled
        })
      );
      applyOverlayShadowFlags(mesh, "polygon", this.lightingRig.shadowsEnabled());
      mesh.renderOrder = markupRenderPriority("polygon");
      return mesh;
    }

    if (markup.kind === "circle") {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1, 64),
        createMarkupMaterial({
          kind: "circle",
          color,
          opacity: defaultOpacityForMarkup("circle", false),
          lightingEnabled
        })
      );
      applyOverlayShadowFlags(mesh, "circle", this.lightingRig.shadowsEnabled());
      mesh.renderOrder = markupRenderPriority("circle");
      return mesh;
    }

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 24),
      createMarkupMaterial({
        kind: "sphere",
        color,
        opacity: defaultOpacityForMarkup("sphere", false),
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
    const accentColor = isHighlighted
      ? highlightedMarkerColorForId(markup.id)
      : markerColorForId(markup.id);

    const options = {
      text: markup.text,
      accentColor,
      highlighted: isHighlighted
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

    applyLabelOpacity(entry.object, labelLegibilityForGlobeness(globeness).opacity);

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

      if (entry.kind === "label") {
        this.syncLabelPresentation(entry);
        continue;
      }

      const material = getTintableMarkupMaterial(entry.object);

      if (!material) {
        continue;
      }

      const color = isHighlighted ? highlightedMarkerColorForId(entry.id) : markerColorForId(entry.id);
      applyMarkupMaterialAppearance(material, color, defaultOpacityForMarkup(entry.kind, isHighlighted));
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

      const isHighlighted = this.isMarkupHighlighted(entry.id);
      const color = isHighlighted ? highlightedMarkerColorForId(entry.id) : markerColorForId(entry.id);
      const opacity = defaultOpacityForMarkup(entry.kind, isHighlighted);

      replaceMeshMarkupMaterial(entry.object, entry.kind, color, opacity, lightingEnabled);
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
