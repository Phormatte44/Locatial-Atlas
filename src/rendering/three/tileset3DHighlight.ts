import * as THREE from "three";
import type { GeographicBounds } from "../../types/bounds";
import type { Tileset3DTransform } from "../../types/tileset3DLayer";
import { parseTileset3DFeatureKey } from "../../interaction/tileset3dFeatureIds";
import { ecefToLngLatAlt } from "./tileset3DPlacement";

const METERS_PER_DEGREE_LAT = 111_320;

function findMeshByUuid(root: THREE.Object3D, uuid: string): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((object) => {
    if (found || !(object instanceof THREE.Mesh) || object.uuid !== uuid) {
      return;
    }

    found = object;
  });

  return found;
}

function resolveHighlightMesh(root: THREE.Object3D, featureKey: string): THREE.Mesh | null {
  const parsed = parseTileset3DFeatureKey(featureKey);
  if (parsed.objectUuid) {
    const mesh = findMeshByUuid(root, parsed.objectUuid);
    if (mesh) {
      return mesh;
    }
  }

  if (parsed.kind === "uuid" && parsed.objectUuid) {
    return findMeshByUuid(root, parsed.objectUuid);
  }

  return null;
}

export function applyTileset3DFeatureHighlight(
  root: THREE.Object3D,
  featureKey: string | null,
  previousFeatureKey: string | null
): void {
  if (previousFeatureKey) {
    const previousMesh = resolveHighlightMesh(root, previousFeatureKey);
    if (previousMesh) {
      setMeshHighlight(previousMesh, false);
    }
  }

  if (!featureKey) {
    return;
  }

  const mesh = resolveHighlightMesh(root, featureKey);
  if (mesh) {
    setMeshHighlight(mesh, true);
  }
}

export function computeObjectGeographicBounds(
  object: THREE.Object3D,
  localToEcef: THREE.Matrix4 | null,
  transform?: Tileset3DTransform
): GeographicBounds | null {
  const boundsBox = new THREE.Box3().setFromObject(object);
  if (boundsBox.isEmpty()) {
    return null;
  }

  if (!localToEcef) {
    return null;
  }

  const corners = [
    new THREE.Vector3(boundsBox.min.x, boundsBox.min.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.min.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.max.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.max.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.min.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.min.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.max.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.max.y, boundsBox.max.z)
  ];

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const corner of corners) {
    const ecef = corner.applyMatrix4(localToEcef);
    const geo = ecefToLngLatAlt(ecef.x, ecef.y, ecef.z);
    minLng = Math.min(minLng, geo.lng);
    minLat = Math.min(minLat, geo.lat);
    maxLng = Math.max(maxLng, geo.lng);
    maxLat = Math.max(maxLat, geo.lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
    return null;
  }

  const centerLng = transform?.lng ?? (minLng + maxLng) / 2;
  const centerLat = transform?.lat ?? (minLat + maxLat) / 2;
  const latSpan = Math.max(maxLat - minLat, 0.0005);
  const lngSpan = Math.max(maxLng - minLng, 0.0005);
  const minPadLat = 80 / METERS_PER_DEGREE_LAT;
  const minPadLng =
    80 / (METERS_PER_DEGREE_LAT * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2));

  return [
    centerLng - Math.max(lngSpan / 2, minPadLng),
    centerLat - Math.max(latSpan / 2, minPadLat),
    centerLng + Math.max(lngSpan / 2, minPadLng),
    centerLat + Math.max(latSpan / 2, minPadLat)
  ];
}

export function computeFeatureGeographicBounds(
  root: THREE.Object3D,
  featureKey: string,
  localToEcef: THREE.Matrix4 | null,
  transform?: Tileset3DTransform
): GeographicBounds | null {
  const mesh = resolveHighlightMesh(root, featureKey);
  if (!mesh || !localToEcef) {
    return null;
  }

  mesh.updateMatrixWorld(true);
  const geometry = mesh.geometry;
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const boundsBox = geometry.boundingBox;
  if (!boundsBox || boundsBox.isEmpty()) {
    return computeObjectGeographicBounds(mesh, localToEcef, transform);
  }

  const meshToEcef = mesh.matrixWorld.clone();
  const corners = [
    new THREE.Vector3(boundsBox.min.x, boundsBox.min.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.min.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.max.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.max.y, boundsBox.min.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.min.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.min.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.min.x, boundsBox.max.y, boundsBox.max.z),
    new THREE.Vector3(boundsBox.max.x, boundsBox.max.y, boundsBox.max.z)
  ];

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const corner of corners) {
    const ecef = corner.applyMatrix4(meshToEcef);
    const geo = ecefToLngLatAlt(ecef.x, ecef.y, ecef.z);
    minLng = Math.min(minLng, geo.lng);
    minLat = Math.min(minLat, geo.lat);
    maxLng = Math.max(maxLng, geo.lng);
    maxLat = Math.max(maxLat, geo.lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
    return null;
  }

  const centerLng = transform?.lng ?? (minLng + maxLng) / 2;
  const centerLat = transform?.lat ?? (minLat + maxLat) / 2;
  const latSpan = Math.max(maxLat - minLat, 0.0005);
  const lngSpan = Math.max(maxLng - minLng, 0.0005);
  const minPadLat = 80 / METERS_PER_DEGREE_LAT;
  const minPadLng =
    80 / (METERS_PER_DEGREE_LAT * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2));

  return [
    centerLng - Math.max(lngSpan / 2, minPadLng),
    centerLat - Math.max(latSpan / 2, minPadLat),
    centerLng + Math.max(lngSpan / 2, minPadLng),
    centerLat + Math.max(latSpan / 2, minPadLat)
  ];
}

const HIGHLIGHT_EMISSIVE = new THREE.Color(0x4488ff);
const HIGHLIGHT_INTENSITY = 0.4;

interface StoredEmissive {
  emissive: THREE.Color;
  emissiveIntensity: number;
}

const storedEmissiveByMaterial = new WeakMap<THREE.Material, StoredEmissive>();

function storeMaterialEmissive(material: THREE.Material): void {
  if (storedEmissiveByMaterial.has(material)) {
    return;
  }

  if ("emissive" in material && material.emissive instanceof THREE.Color) {
    storedEmissiveByMaterial.set(material, {
      emissive: material.emissive.clone(),
      emissiveIntensity:
        "emissiveIntensity" in material && typeof material.emissiveIntensity === "number"
          ? material.emissiveIntensity
          : 0
    });
  }
}

function restoreMaterialEmissive(material: THREE.Material): void {
  const stored = storedEmissiveByMaterial.get(material);
  if (!stored || !("emissive" in material) || !(material.emissive instanceof THREE.Color)) {
    return;
  }

  material.emissive.copy(stored.emissive);
  if ("emissiveIntensity" in material) {
    material.emissiveIntensity = stored.emissiveIntensity;
  }

  material.needsUpdate = true;
}

function applyHighlightToMaterial(material: THREE.Material): void {
  if (!("emissive" in material) || !(material.emissive instanceof THREE.Color)) {
    return;
  }

  storeMaterialEmissive(material);
  material.emissive.copy(HIGHLIGHT_EMISSIVE);
  if ("emissiveIntensity" in material) {
    material.emissiveIntensity = HIGHLIGHT_INTENSITY;
  }

  material.needsUpdate = true;
}

function setMeshHighlight(mesh: THREE.Mesh, highlighted: boolean): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (highlighted) {
      applyHighlightToMaterial(material);
    } else {
      restoreMaterialEmissive(material);
    }
  }
}
