import type { MapStyleDefinition } from "../../types/mapStyle";
import { BUILTIN_MAP_STYLES, DEFAULT_MAP_STYLE_ID } from "./builtinMapStyles";

export class MapStyleRegistry {
  private readonly styles: Map<string, MapStyleDefinition>;

  constructor(styles: MapStyleDefinition[] = BUILTIN_MAP_STYLES) {
    this.styles = new Map(styles.map((style) => [style.id, style]));
  }

  list(): MapStyleDefinition[] {
    return [...this.styles.values()];
  }

  get(id: string): MapStyleDefinition | undefined {
    return this.styles.get(id);
  }

  resolveStyleUrl(id: string = DEFAULT_MAP_STYLE_ID): string {
    const style = this.styles.get(id) ?? this.styles.get(DEFAULT_MAP_STYLE_ID);
    if (!style) {
      throw new Error(`Unknown map style id: ${id}`);
    }

    return style.styleUrl;
  }
}

export const defaultMapStyleRegistry = new MapStyleRegistry();
