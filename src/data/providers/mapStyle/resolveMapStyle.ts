import {
  defaultMapStyleRegistry,
  MapStyleRegistry
} from "../../mapStyles/MapStyleRegistry";
import type { MapStyleDefinition } from "../../../types/mapStyle";

export function listAvailableMapStyles(registry: MapStyleRegistry = defaultMapStyleRegistry): MapStyleDefinition[] {
  return registry.list();
}

export function resolveMapStyleUrl(
  styleId: string,
  registry: MapStyleRegistry = defaultMapStyleRegistry
): string {
  return registry.resolveStyleUrl(styleId);
}

export function getMapStyleDefinition(
  styleId: string,
  registry: MapStyleRegistry = defaultMapStyleRegistry
): MapStyleDefinition | undefined {
  return registry.get(styleId);
}
