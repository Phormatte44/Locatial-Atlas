/** Provider-agnostic basemap style descriptor exposed by Atlas. */
export interface MapStyleDefinition {
  id: string;
  label: string;
  styleUrl: string;
  attribution?: string;
}
