import * as THREE from "three";

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

export function applyTileset3DFeatureHighlight(
  root: THREE.Object3D,
  featureKey: string | null,
  previousFeatureKey: string | null
): void {
  if (previousFeatureKey) {
    const previousMesh = findMeshByUuid(root, previousFeatureKey);
    if (previousMesh) {
      setMeshHighlight(previousMesh, false);
    }
  }

  if (!featureKey) {
    return;
  }

  const mesh = findMeshByUuid(root, featureKey);
  if (mesh) {
    setMeshHighlight(mesh, true);
  }
}
