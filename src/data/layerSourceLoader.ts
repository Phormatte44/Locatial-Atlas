import { isFeatureCollection } from "./geoJsonLayerSource";
import type {
  LayerFamily,
  LayerLoadChangeListener,
  LayerLoadState,
  LayerLoadStatus
} from "../types/layerLoadState";

export type LayerSourceKey = `${LayerFamily}:${string}`;

export function formatLayerSourceKey(family: LayerFamily, layerId: string): LayerSourceKey {
  return `${family}:${layerId}`;
}

type LayerReadyCallback = (data: import("geojson").FeatureCollection) => void;

interface PendingLoad {
  family: LayerFamily;
  layerId: string;
  url: string;
  onReady: LayerReadyCallback;
}

export class LayerSourceLoader {
  private readonly states = new Map<LayerSourceKey, LayerLoadState>();
  private readonly abortControllers = new Map<LayerSourceKey, AbortController>();
  private readonly listeners = new Set<LayerLoadChangeListener>();
  private readonly pendingRetries = new Map<LayerSourceKey, PendingLoad>();
  private invalidateGeneration = 0;

  getState(family: LayerFamily, layerId: string): LayerLoadState | undefined {
    return this.states.get(formatLayerSourceKey(family, layerId));
  }

  findState(layerId: string): LayerLoadState | undefined {
    for (const state of this.states.values()) {
      if (state.layerId === layerId) {
        return state;
      }
    }

    return undefined;
  }

  getStates(): LayerLoadState[] {
    return [...this.states.values()];
  }

  onChange(listener: LayerLoadChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  markInlineReady(family: LayerFamily, layerId: string): void {
    this.setState(formatLayerSourceKey(family, layerId), {
      layerId,
      family,
      status: "ready"
    });
  }

  markIdle(family: LayerFamily, layerId: string): void {
    const key = formatLayerSourceKey(family, layerId);
    this.cancel(key);
    this.states.delete(key);
    this.pendingRetries.delete(key);
  }

  invalidateAll(): void {
    this.invalidateGeneration += 1;

    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }

    this.abortControllers.clear();

    for (const [key, state] of this.states) {
      if (state.status === "loading") {
        this.states.set(key, { ...state, status: "idle", error: undefined });
        this.emitChange(this.states.get(key)!);
      }
    }
  }

  cancelAll(): void {
    this.invalidateAll();
    this.states.clear();
    this.pendingRetries.clear();
  }

  async load(
    family: LayerFamily,
    layerId: string,
    url: string,
    onReady: LayerReadyCallback
  ): Promise<void> {
    const key = formatLayerSourceKey(family, layerId);
    this.pendingRetries.set(key, { family, layerId, url, onReady });
    await this.startLoad(key, family, layerId, url, onReady);
  }

  retry(family: LayerFamily, layerId: string): boolean {
    const key = formatLayerSourceKey(family, layerId);
    const pending = this.pendingRetries.get(key);

    if (!pending) {
      return false;
    }

    void this.startLoad(key, pending.family, pending.layerId, pending.url, pending.onReady);
    return true;
  }

  retryByLayerId(layerId: string): boolean {
    for (const pending of this.pendingRetries.values()) {
      if (pending.layerId === layerId) {
        return this.retry(pending.family, layerId);
      }
    }

    return false;
  }

  private async startLoad(
    key: LayerSourceKey,
    family: LayerFamily,
    layerId: string,
    url: string,
    onReady: LayerReadyCallback
  ): Promise<void> {
    this.cancel(key);

    const generation = this.invalidateGeneration;
    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    this.setState(key, {
      layerId,
      family,
      status: "loading",
      url
    });

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON (${response.status}): ${url}`);
      }

      const payload: unknown = await response.json();

      if (generation !== this.invalidateGeneration) {
        return;
      }

      if (!isFeatureCollection(payload)) {
        throw new Error(`GeoJSON at ${url} is not a FeatureCollection`);
      }

      this.setState(key, {
        layerId,
        family,
        status: "ready",
        url
      });
      onReady(payload);
    } catch (error) {
      if (controller.signal.aborted || generation !== this.invalidateGeneration) {
        const current = this.states.get(key);
        if (current?.status === "loading") {
          this.setState(key, {
            layerId,
            family,
            status: "idle",
            url
          });
        }
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown layer load error";
      this.setState(key, {
        layerId,
        family,
        status: "error",
        url,
        error: message
      });
    } finally {
      if (this.abortControllers.get(key) === controller) {
        this.abortControllers.delete(key);
      }
    }
  }

  private cancel(key: LayerSourceKey): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  private setState(key: LayerSourceKey, state: LayerLoadState): void {
    this.states.set(key, state);
    this.emitChange(state);
  }

  private emitChange(state: LayerLoadState): void {
    for (const listener of this.listeners) {
      listener({ state });
    }
  }
}

export function isLayerLoadSettled(status: LayerLoadStatus): boolean {
  return status === "ready" || status === "error";
}
