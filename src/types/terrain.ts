/** Provider-agnostic terrain source descriptor for Atlas. */
export interface TerrainSourceDefinition {
  id: string;
  label: string;
  url: string;
  tileSize: number;
  encoding: "terrarium" | "mapbox";
  exaggeration: number;
  attribution?: string;
}
