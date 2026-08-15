export const TILESET3D_FEATURE_PREFIX = "tileset3d:";

export const TILESET3D_MESH_FEATURE_PREFIX = "mf:";
export const TILESET3D_BATCH_PREFIX = "batch:";

export interface ParsedTileset3DFeatureKey {
  kind: "mesh-feature" | "batch" | "uuid";
  meshFeatureId?: number;
  batchId?: number;
  objectUuid?: string;
}

export function formatTileset3DFeatureId(layerId: string, featureKey: string): string {
  return `${TILESET3D_FEATURE_PREFIX}${layerId}:${featureKey}`;
}

export function parseTileset3DFeatureId(
  featureId: string
): { layerId: string; featureKey: string } | null {
  if (!featureId.startsWith(TILESET3D_FEATURE_PREFIX)) {
    return null;
  }

  const rest = featureId.slice(TILESET3D_FEATURE_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return null;
  }

  return {
    layerId: rest.slice(0, separator),
    featureKey: rest.slice(separator + 1)
  };
}

export function isTileset3DFeatureId(featureId: string): boolean {
  return featureId.startsWith(TILESET3D_FEATURE_PREFIX);
}

function formatStableKey(prefix: string, id: number, objectUuid: string): string {
  return `${prefix}${id}@${objectUuid}`;
}

export function parseTileset3DFeatureKey(featureKey: string): ParsedTileset3DFeatureKey {
  if (featureKey.startsWith(TILESET3D_MESH_FEATURE_PREFIX)) {
    const rest = featureKey.slice(TILESET3D_MESH_FEATURE_PREFIX.length);
    const at = rest.indexOf("@");
    if (at !== -1) {
      const meshFeatureId = Number.parseInt(rest.slice(0, at), 10);
      return {
        kind: "mesh-feature",
        meshFeatureId: Number.isFinite(meshFeatureId) ? meshFeatureId : undefined,
        objectUuid: rest.slice(at + 1)
      };
    }

    const meshFeatureId = Number.parseInt(rest, 10);
    return {
      kind: "mesh-feature",
      meshFeatureId: Number.isFinite(meshFeatureId) ? meshFeatureId : undefined
    };
  }

  if (featureKey.startsWith(TILESET3D_BATCH_PREFIX)) {
    const rest = featureKey.slice(TILESET3D_BATCH_PREFIX.length);
    const at = rest.indexOf("@");
    if (at !== -1) {
      const batchId = Number.parseInt(rest.slice(0, at), 10);
      return {
        kind: "batch",
        batchId: Number.isFinite(batchId) ? batchId : undefined,
        objectUuid: rest.slice(at + 1)
      };
    }

    const batchId = Number.parseInt(rest, 10);
    return {
      kind: "batch",
      batchId: Number.isFinite(batchId) ? batchId : undefined
    };
  }

  return { kind: "uuid", objectUuid: featureKey };
}

interface MeshFeatureInfo {
  propertyTable?: number | null;
  texture?: unknown;
}

export interface MeshFeaturesReader {
  getFeatureInfo(): MeshFeatureInfo[];
  getFeatures(
    triangle: number,
    barycoord: { x: number; y: number; z: number }
  ): Array<number | null>;
  getFeaturesAsync?(
    triangle: number,
    barycoord: { x: number; y: number; z: number }
  ): Promise<Array<number | null>>;
}

export interface TilesetPickObject {
  uuid: string;
  geometry?: {
    attributes?: Record<string, { getX(index: number): number }>;
  };
  userData?: {
    meshFeatures?: MeshFeaturesReader;
    structuralMetadata?: StructuralMetadataReader;
  };
  parent?: TilesetPickObject | null;
}

export interface TilesetPickIntersection {
  object: TilesetPickObject;
  face?: { a: number; b: number; c: number };
  faceIndex?: number | null;
  point?: { x: number; y: number; z: number };
  batchId?: number;
}

export interface StructuralMetadataReader {
  getPropertyTableData(
    tableIndex: number,
    rowId: number,
    target?: Record<string, unknown>
  ): Record<string, unknown>;
  getPropertyTextureData?(
    triangle: number,
    barycoord: { x: number; y: number; z: number },
    target?: unknown[]
  ): unknown[];
  getPropertyTextureDataAsync?(
    triangle: number,
    barycoord: { x: number; y: number; z: number },
    target?: unknown[]
  ): Promise<unknown[]>;
}

export interface BatchTableReader {
  getDataFromId(id: number, target?: Record<string, unknown>): Record<string, unknown>;
}

function readBatchIdFromGeometry(object: TilesetPickObject, face?: { a: number }): number | null {
  const batchAttribute = object.geometry?.attributes?._BATCHID;
  if (!batchAttribute || !face) {
    return null;
  }

  const value = batchAttribute.getX(face.a);
  return Number.isFinite(value) ? value : null;
}

function hasTextureBasedMeshFeatures(meshFeatures: MeshFeaturesReader): boolean {
  return meshFeatures.getFeatureInfo().some((info) => info.texture !== undefined);
}

/** True when mesh-feature ids require an async texture read (sync pick missed). */
export function meshFeaturePickNeedsAsync(intersection: TilesetPickIntersection): boolean {
  const meshFeatures = intersection.object.userData?.meshFeatures;
  if (
    !meshFeatures ||
    intersection.faceIndex === undefined ||
    intersection.faceIndex === null ||
    !intersection.point ||
    !hasTextureBasedMeshFeatures(meshFeatures)
  ) {
    return false;
  }

  return readMeshFeatureId(intersection) === null;
}

/** Resolve mesh-feature id via async texture read; returns null when unavailable. */
export async function resolveMeshFeatureIdAsync(
  intersection: TilesetPickIntersection
): Promise<number | null> {
  const meshFeatures = intersection.object.userData?.meshFeatures;
  if (
    !meshFeatures?.getFeaturesAsync ||
    intersection.faceIndex === undefined ||
    intersection.faceIndex === null ||
    !intersection.point
  ) {
    return null;
  }

  const barycoord = computeBarycentricCoordinate(intersection);
  if (!barycoord) {
    return null;
  }

  const features = await meshFeatures.getFeaturesAsync(intersection.faceIndex, barycoord);
  for (const featureId of features) {
    if (featureId !== null && featureId !== undefined) {
      return featureId;
    }
  }

  return null;
}

export function computeBarycentricCoordinateForPick(
  intersection: TilesetPickIntersection
): { x: number; y: number; z: number } | null {
  return computeBarycentricCoordinate(intersection);
}

function readMeshFeatureId(intersection: TilesetPickIntersection): number | null {
  const meshFeatures = intersection.object.userData?.meshFeatures;
  if (
    !meshFeatures ||
    intersection.faceIndex === undefined ||
    intersection.faceIndex === null ||
    !intersection.point
  ) {
    return null;
  }

  const barycoord = computeBarycentricCoordinate(intersection);
  if (!barycoord) {
    return null;
  }

  const features = meshFeatures.getFeatures(intersection.faceIndex, barycoord);
  for (const featureId of features) {
    if (featureId !== null && featureId !== undefined) {
      return featureId;
    }
  }

  return null;
}

function computeBarycentricCoordinate(
  intersection: TilesetPickIntersection
): { x: number; y: number; z: number } | null {
  const { object, face, point } = intersection;
  const position = object.geometry?.attributes?.position as
    | { getX(index: number): number; getY(index: number): number; getZ(index: number): number }
    | undefined;
  if (!face || !point || !position) {
    return null;
  }

  const ax = position.getX(face.a);
  const ay = position.getY(face.a);
  const az = position.getZ(face.a);
  const bx = position.getX(face.b);
  const by = position.getY(face.b);
  const bz = position.getZ(face.b);
  const cx = position.getX(face.c);
  const cy = position.getY(face.c);
  const cz = position.getZ(face.c);

  const meshObject = object as { matrixWorld?: { elements: number[] } };
  const elements = meshObject.matrixWorld?.elements;
  if (elements) {
    const transform = (x: number, y: number, z: number) => {
      const wx =
        elements[0] * x + elements[4] * y + elements[8] * z + elements[12];
      const wy =
        elements[1] * x + elements[5] * y + elements[9] * z + elements[13];
      const wz =
        elements[2] * x + elements[6] * y + elements[10] * z + elements[14];
      return { x: wx, y: wy, z: wz };
    };

    const aw = transform(ax, ay, az);
    const bw = transform(bx, by, bz);
    const cw = transform(cx, cy, cz);

    return barycentricFromTriangle(aw, bw, cw, point);
  }

  return barycentricFromTriangle(
    { x: ax, y: ay, z: az },
    { x: bx, y: by, z: bz },
    { x: cx, y: cy, z: cz },
    point
  );
}

function barycentricFromTriangle(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
  point: { x: number; y: number; z: number }
): { x: number; y: number; z: number } | null {
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v0z = c.z - a.z;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v1z = b.z - a.z;
  const v2x = point.x - a.x;
  const v2y = point.y - a.y;
  const v2z = point.z - a.z;

  const dot00 = v0x * v0x + v0y * v0y + v0z * v0z;
  const dot01 = v0x * v1x + v0y * v1y + v0z * v1z;
  const dot02 = v0x * v2x + v0y * v2y + v0z * v2z;
  const dot11 = v1x * v1x + v1y * v1y + v1z * v1z;
  const dot12 = v1x * v2x + v1y * v2y + v1z * v2z;

  const denom = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denom) < 1e-12) {
    return null;
  }

  const invDenom = 1 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return { x: 1 - u - v, y: v, z: u };
}

/** Stable feature key for a raycast hit (mesh feature id, batch id, or mesh uuid). */
export function featureKeyFromTilesetPickObject(
  object: { uuid: string },
  intersection?: TilesetPickIntersection
): string {
  if (intersection) {
    const meshFeatureId = readMeshFeatureId(intersection);
    if (meshFeatureId !== null) {
      return formatStableKey(TILESET3D_MESH_FEATURE_PREFIX, meshFeatureId, object.uuid);
    }

    const batchId =
      intersection.batchId ?? readBatchIdFromGeometry(intersection.object, intersection.face);
    if (batchId !== null && batchId !== undefined) {
      return formatStableKey(TILESET3D_BATCH_PREFIX, batchId, object.uuid);
    }
  }

  return object.uuid;
}
