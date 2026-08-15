import {
  computeBarycentricCoordinateForPick,
  parseTileset3DFeatureKey,
  type BatchTableReader,
  type ParsedTileset3DFeatureKey,
  type StructuralMetadataReader,
  type TilesetPickIntersection,
  type TilesetPickObject
} from "../../interaction/tileset3dFeatureIds";

function flattenPropertyEntry(entry: unknown): Record<string, unknown> {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return { ...(entry as Record<string, unknown>) };
  }

  return {};
}

function findBatchTable(object: TilesetPickObject): BatchTableReader | null {
  let current: TilesetPickObject | null | undefined = object;
  while (current) {
    const batchTable = (current as TilesetPickObject & { batchTable?: BatchTableReader }).batchTable;
    if (batchTable?.getDataFromId) {
      return batchTable;
    }

    current = current.parent ?? null;
  }

  return null;
}

function findStructuralMetadata(object: TilesetPickObject): StructuralMetadataReader | null {
  let current: TilesetPickObject | null | undefined = object;
  while (current) {
    const metadata = current.userData?.structuralMetadata;
    if (metadata?.getPropertyTableData) {
      return metadata;
    }

    current = current.parent ?? null;
  }

  return null;
}

function readPropertyTableRows(
  structuralMetadata: StructuralMetadataReader,
  meshFeatures: { getFeatureInfo(): Array<{ propertyTable?: number | null }> } | undefined,
  rowId: number,
  target: Record<string, unknown>
): void {
  const featureInfo = meshFeatures?.getFeatureInfo?.() ?? [];
  const tableIndices = new Set<number>();

  for (const info of featureInfo) {
    if (info.propertyTable !== null && info.propertyTable !== undefined) {
      tableIndices.add(info.propertyTable);
    }
  }

  if (tableIndices.size === 0) {
    return;
  }

  for (const tableIndex of tableIndices) {
    Object.assign(
      target,
      flattenPropertyEntry(structuralMetadata.getPropertyTableData(tableIndex, rowId))
    );
  }
}

function readPropertyTexturesSync(
  structuralMetadata: StructuralMetadataReader,
  intersection: TilesetPickIntersection,
  target: Record<string, unknown>
): void {
  if (
    !structuralMetadata.getPropertyTextureData ||
    intersection.faceIndex === undefined ||
    intersection.faceIndex === null
  ) {
    return;
  }

  const barycoord = computeBarycentricCoordinateForPick(intersection);
  if (!barycoord) {
    return;
  }

  const textureData = structuralMetadata.getPropertyTextureData(intersection.faceIndex, barycoord);
  for (const entry of textureData) {
    Object.assign(target, flattenPropertyEntry(entry));
  }
}

async function readPropertyTexturesAsync(
  structuralMetadata: StructuralMetadataReader,
  intersection: TilesetPickIntersection,
  target: Record<string, unknown>
): Promise<void> {
  if (
    !structuralMetadata.getPropertyTextureDataAsync ||
    intersection.faceIndex === undefined ||
    intersection.faceIndex === null
  ) {
    return;
  }

  const barycoord = computeBarycentricCoordinateForPick(intersection);
  if (!barycoord) {
    return;
  }

  const textureData = await structuralMetadata.getPropertyTextureDataAsync(
    intersection.faceIndex,
    barycoord
  );

  for (const entry of textureData) {
    Object.assign(target, flattenPropertyEntry(entry));
  }
}

export function readTilesetFeaturePropertiesSync(
  featureKey: string,
  intersection: TilesetPickIntersection
): Record<string, unknown> | null {
  const parsed = parseTileset3DFeatureKey(featureKey);
  return readTilesetFeaturePropertiesForParsed(parsed, intersection);
}

export async function readTilesetFeaturePropertiesAsync(
  featureKey: string,
  intersection: TilesetPickIntersection
): Promise<Record<string, unknown> | null> {
  const parsed = parseTileset3DFeatureKey(featureKey);
  return readTilesetFeaturePropertiesForParsedAsync(parsed, intersection);
}

function readTilesetFeaturePropertiesForParsed(
  parsed: ParsedTileset3DFeatureKey,
  intersection: TilesetPickIntersection
): Record<string, unknown> | null {
  const properties: Record<string, unknown> = {};
  const object = intersection.object;
  const structuralMetadata = findStructuralMetadata(object);
  const meshFeatures = object.userData?.meshFeatures;

  if (parsed.kind === "batch" && parsed.batchId !== undefined) {
    const batchTable = findBatchTable(object);
    if (batchTable) {
      Object.assign(properties, batchTable.getDataFromId(parsed.batchId));
    }

    if (structuralMetadata) {
      readPropertyTableRows(structuralMetadata, meshFeatures, parsed.batchId, properties);
    }
  }

  if (parsed.kind === "mesh-feature" && parsed.meshFeatureId !== undefined && structuralMetadata) {
    readPropertyTableRows(structuralMetadata, meshFeatures, parsed.meshFeatureId, properties);
  }

  if (structuralMetadata) {
    readPropertyTexturesSync(structuralMetadata, intersection, properties);
  }

  return Object.keys(properties).length > 0 ? properties : null;
}

export async function readTilesetFeaturePropertiesForParsedAsync(
  parsed: ParsedTileset3DFeatureKey,
  intersection: TilesetPickIntersection
): Promise<Record<string, unknown> | null> {
  const properties: Record<string, unknown> = {};
  const object = intersection.object;
  const structuralMetadata = findStructuralMetadata(object);
  const meshFeatures = object.userData?.meshFeatures;

  if (parsed.kind === "batch" && parsed.batchId !== undefined) {
    const batchTable = findBatchTable(object);
    if (batchTable) {
      Object.assign(properties, batchTable.getDataFromId(parsed.batchId));
    }

    if (structuralMetadata) {
      readPropertyTableRows(structuralMetadata, meshFeatures, parsed.batchId, properties);
    }
  }

  if (parsed.kind === "mesh-feature" && parsed.meshFeatureId !== undefined && structuralMetadata) {
    readPropertyTableRows(structuralMetadata, meshFeatures, parsed.meshFeatureId, properties);
  }

  if (structuralMetadata) {
    readPropertyTexturesSync(structuralMetadata, intersection, properties);
    await readPropertyTexturesAsync(structuralMetadata, intersection, properties);
  }

  return Object.keys(properties).length > 0 ? properties : null;
}
