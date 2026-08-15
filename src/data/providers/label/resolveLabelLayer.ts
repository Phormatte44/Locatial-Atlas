import {
  LabelLayerRegistry,
  defaultLabelLayerRegistry
} from "../../labels/LabelLayerRegistry";
import type { LabelLayerDefinition } from "../../../types/labelLayer";

export function listAvailableLabelLayers(
  registry: LabelLayerRegistry = defaultLabelLayerRegistry
): LabelLayerDefinition[] {
  return registry.list();
}

export function getLabelLayerDefinition(
  id: string,
  registry: LabelLayerRegistry = defaultLabelLayerRegistry
): LabelLayerDefinition | undefined {
  return registry.get(id);
}

export function registerLabelLayer(
  def: LabelLayerDefinition,
  registry: LabelLayerRegistry = defaultLabelLayerRegistry
): void {
  registry.register(def);
}

export function resolveLabelLayers(
  ids: string[],
  registry: LabelLayerRegistry = defaultLabelLayerRegistry
): LabelLayerDefinition[] {
  const resolved: LabelLayerDefinition[] = [];

  for (const id of ids) {
    const layer = registry.get(id);
    if (!layer) {
      throw new Error(`Unknown label layer id: ${id}`);
    }

    resolved.push(layer);
  }

  return resolved;
}
