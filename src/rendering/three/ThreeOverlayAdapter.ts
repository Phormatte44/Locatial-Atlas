import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { createLineGeometry } from "../../geometry/lineMarkup";
import { createPolygonShapeGeometry } from "../../geometry/polygonMarkup";
import type { WorldMarkup } from "../../types/worldMarkup";
import {
  createLabelModelMatrix,
  createLabelSprite,
  disposeLabelSprite,
  measureLabelSpriteMeters
} from "./labelSprites";
import {
  createMarkerModelMatrix,
  createMercatorGroundMatrix,
  createMercatorMatrix
} from "../../world/mercatorTransform";
import { DEFAULT_MARKER_RADIUS_METERS } from "../../world/mercatorTransform";
import {
  highlightedMarkerColorForId,
  HIGHLIGHTED_MARKER_SCALE,
  markerColorForId
} from "./markerColors";
import { markupMatchesHighlight } from "../../interaction/placeHighlightIds";
import type { AtlasViewMode } from "../../types/viewMode";
import type { LightingSettings } from "../../types/lighting";
import { OverlayLightingRig } from "../lighting/OverlayLightingRig";
import { DEFAULT_LIGHTING_SETTINGS } from "../lighting/atmosphereDefaults";

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

interface MarkupEntry {
  id: string;
  kind: WorldMarkup["kind"];
  scene: THREE.Scene;
  object: THREE.Object3D;
  baseMatrix: THREE.Matrix4;
  modelMatrix: THREE.Matrix4;
}

export class ThreeOverlayAdapter {
  private markups: WorldMarkup[] = [];
  private markupEntries: MarkupEntry[] = [];
  private highlightedMarkupId: string | null = null;
  private camera: THREE.Camera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private map: MapLibreMap | null = null;
  private viewMode: AtlasViewMode = "map";
  private lightingSettings: LightingSettings = DEFAULT_LIGHTING_SETTINGS;
  private readonly lightingRig = new OverlayLightingRig();

  getLayer(): CustomLayerInterface {
    return {
      id: LAYER_ID,
      type: "custom",
      renderingMode: "3d",
      onAdd: (map, gl) => {
        this.map = map;
        this.camera = new THREE.Camera();

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        this.renderer.autoClear = false;

        this.rebuildMarkups();
      },
      render: (gl, options) => {
        this.renderMarkups(gl, options);
      },
      onRemove: () => {
        this.disposeMarkups();
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
    this.lightingSettings = settings;
    this.lightingRig.applySettings(settings);

    for (const entry of this.markupEntries) {
      this.lightingRig.attachToScene(entry.scene);
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
    for (const entry of this.markupEntries) {
      const markup = this.markups.find((candidate) => candidate.id === entry.id);
      if (!markup) {
        continue;
      }

      const terrainElevationMeters = getElevationMeters(markup.lng, markup.lat);
      entry.baseMatrix = this.createMatrixForMarkup(markup, terrainElevationMeters);
    }

    this.applyHighlightStyles();
    this.map?.triggerRepaint();
  }

  private renderMarkups(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    options: CustomRenderMethodInput
  ): void {
    if (!this.renderer || !this.camera || !this.map || this.markupEntries.length === 0) {
      return;
    }

    const mapMatrix = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix);

    this.renderer.resetState();
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    for (const entry of this.markupEntries) {
      this.camera.projectionMatrix = mapMatrix.clone().multiply(entry.modelMatrix);
      this.renderer.render(entry.scene, this.camera);
    }

    this.map.triggerRepaint();
  }

  private rebuildMarkups(): void {
    this.disposeMarkups();

    for (const markup of this.markups) {
      const scene = new THREE.Scene();
      this.lightingRig.attachToScene(scene);
      this.lightingRig.applySettings(this.lightingSettings);
      const object = this.createObjectForMarkup(markup);
      scene.add(object);

      const baseMatrix = this.createMatrixForMarkup(markup, 0);

      this.markupEntries.push({
        id: markup.id,
        kind: markup.kind,
        scene,
        object,
        baseMatrix,
        modelMatrix: baseMatrix.clone()
      });
    }

    this.markupEntries.sort(
      (left, right) => markupRenderPriority(left.kind) - markupRenderPriority(right.kind)
    );

    this.applyHighlightStyles();
    this.map?.triggerRepaint();
  }

  private createObjectForMarkup(markup: WorldMarkup): THREE.Object3D {
    if (markup.kind === "label") {
      return createLabelSprite({
        text: markup.text,
        accentColor: markerColorForId(markup.id)
      });
    }

    if (markup.kind === "line") {
      return new THREE.Line(
        createLineGeometry(markup.path, markup.lng, markup.lat),
        new THREE.LineBasicMaterial({
          color: markerColorForId(markup.id),
          transparent: true,
          opacity: 0.88,
          depthTest: false,
          depthWrite: false
        })
      );
    }

    if (markup.kind === "polygon") {
      return new THREE.Mesh(
        createPolygonShapeGeometry(markup.ring, markup.lng, markup.lat),
        new THREE.MeshBasicMaterial({
          color: markerColorForId(markup.id),
          transparent: true,
          opacity: 0.24,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
    }

    if (markup.kind === "circle") {
      return new THREE.Mesh(
        new THREE.CircleGeometry(1, 64),
        new THREE.MeshBasicMaterial({
          color: markerColorForId(markup.id),
          transparent: true,
          opacity: 0.28,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
    }

    return new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 24),
      new THREE.MeshBasicMaterial({
        color: markerColorForId(markup.id),
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false
      })
    );
  }

  private createMatrixForMarkup(markup: WorldMarkup, terrainElevationMeters: number): THREE.Matrix4 {
    const altitudeMeters = (markup.altitudeMeters ?? 0) + terrainElevationMeters;

    if (markup.kind === "circle") {
      return createMercatorMatrix(markup.lng, markup.lat, altitudeMeters, markup.radiusMeters);
    }

    if (markup.kind === "polygon" || markup.kind === "line") {
      return createMercatorGroundMatrix(markup.lng, markup.lat, altitudeMeters);
    }

    if (markup.kind === "label") {
      const dimensions = measureLabelSpriteMeters(markup.text);
      return createLabelModelMatrix(
        markup.lng,
        markup.lat,
        altitudeMeters,
        dimensions.widthMeters,
        dimensions.heightMeters
      );
    }

    return createMarkerModelMatrix(
      markup.lng,
      markup.lat,
      altitudeMeters,
      markup.radiusMeters ?? DEFAULT_MARKER_RADIUS_METERS
    );
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
        this.applyLabelHighlight(entry, isHighlighted, highlightScale);
        continue;
      }

      const material = this.getMarkupMaterial(entry.object);

      if (!material) {
        continue;
      }

      material.color.setHex(
        isHighlighted ? highlightedMarkerColorForId(entry.id) : markerColorForId(entry.id)
      );
      material.opacity = isHighlighted
        ? entry.kind === "sphere"
          ? 1
          : entry.kind === "line"
            ? 1
            : entry.kind === "circle"
              ? 0.42
              : 0.38
        : entry.kind === "sphere"
          ? 0.92
          : entry.kind === "line"
            ? 0.88
            : entry.kind === "circle"
              ? 0.28
              : 0.24;
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

  private applyLabelHighlight(
    entry: MarkupEntry,
    isHighlighted: boolean,
    highlightScale: THREE.Matrix4
  ): void {
    const markup = this.markups.find((candidate) => candidate.id === entry.id);
    if (!markup || markup.kind !== "label") {
      return;
    }

    if (entry.object instanceof THREE.Sprite) {
      disposeLabelSprite(entry.object);
      entry.scene.remove(entry.object);
    }

    const sprite = createLabelSprite({
      text: markup.text,
      accentColor: isHighlighted ? highlightedMarkerColorForId(markup.id) : markerColorForId(markup.id),
      highlighted: isHighlighted
    });
    entry.scene.add(sprite);
    entry.object = sprite;
    entry.object.renderOrder = isHighlighted
      ? markupRenderPriority(entry.kind) + 10
      : markupRenderPriority(entry.kind);
    entry.modelMatrix.copy(entry.baseMatrix);

    if (isHighlighted) {
      entry.modelMatrix.multiply(highlightScale);
    }
  }

  private getMarkupMaterial(object: THREE.Object3D): THREE.LineBasicMaterial | THREE.MeshBasicMaterial | null {
    if (object instanceof THREE.Line) {
      const material = object.material;
      return material instanceof THREE.LineBasicMaterial ? material : null;
    }

    if (object instanceof THREE.Mesh) {
      const material = object.material;
      return material instanceof THREE.MeshBasicMaterial ? material : null;
    }

    return null;
  }

  private disposeMarkups(): void {
    for (const entry of this.markupEntries) {
      for (const child of entry.scene.children) {
        if (child instanceof THREE.Sprite) {
          disposeLabelSprite(child);
          continue;
        }

        if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
          child.geometry.dispose();

          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              material.dispose();
            });
          } else {
            child.material.dispose();
          }
        }
      }
    }

    this.markupEntries = [];
  }
}

export { LAYER_ID };
