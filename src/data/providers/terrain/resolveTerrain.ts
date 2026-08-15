import {
  defaultTerrainRegistry,
  TerrainRegistry
} from "../../terrain/TerrainRegistry";
import type { TerrainSourceDefinition } from "../../../types/terrain";

export function resolveTerrainSource(
  sourceId: string,
  registry: TerrainRegistry = defaultTerrainRegistry
): TerrainSourceDefinition {
  return registry.resolve(sourceId);
}

export function listAvailableTerrainSources(
  registry: TerrainRegistry = defaultTerrainRegistry
): TerrainSourceDefinition[] {
  return registry.list();
}

export function getTerrainSourceDefinition(
  sourceId: string,
  registry: TerrainRegistry = defaultTerrainRegistry
): TerrainSourceDefinition | undefined {
  return registry.get(sourceId);
}
