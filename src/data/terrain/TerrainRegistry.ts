import type { TerrainSourceDefinition } from "../../types/terrain";
import { BUILTIN_TERRAIN_SOURCES, DEFAULT_TERRAIN_SOURCE_ID } from "./builtinTerrainSources";

export class TerrainRegistry {
  private readonly sources: Map<string, TerrainSourceDefinition>;

  constructor(sources: TerrainSourceDefinition[] = BUILTIN_TERRAIN_SOURCES) {
    this.sources = new Map(sources.map((source) => [source.id, source]));
  }

  list(): TerrainSourceDefinition[] {
    return [...this.sources.values()];
  }

  get(id: string): TerrainSourceDefinition | undefined {
    return this.sources.get(id);
  }

  resolve(id: string = DEFAULT_TERRAIN_SOURCE_ID): TerrainSourceDefinition {
    const source = this.sources.get(id) ?? this.sources.get(DEFAULT_TERRAIN_SOURCE_ID);
    if (!source) {
      throw new Error(`Unknown terrain source id: ${id}`);
    }

    return source;
  }
}

export const defaultTerrainRegistry = new TerrainRegistry();
