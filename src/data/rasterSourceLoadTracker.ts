import type {
  LayerLoadChangeListener,
  LayerLoadState
} from "../types/layerLoadState";

export class RasterSourceLoadTracker {
  private readonly states = new Map<string, LayerLoadState>();
  private readonly listeners = new Set<LayerLoadChangeListener>();

  getState(layerId: string): LayerLoadState | undefined {
    return this.states.get(layerId);
  }

  findState(layerId: string): LayerLoadState | undefined {
    return this.states.get(layerId);
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

  markLoading(layerId: string, url?: string): void {
    this.setState({
      layerId,
      family: "raster",
      status: "loading",
      url
    });
  }

  markReady(layerId: string, url?: string): void {
    this.setState({
      layerId,
      family: "raster",
      status: "ready",
      url
    });
  }

  markError(layerId: string, error: string, url?: string): void {
    this.setState({
      layerId,
      family: "raster",
      status: "error",
      url,
      error
    });
  }

  markIdle(layerId: string): void {
    this.states.delete(layerId);
  }

  cancelAll(): void {
    this.states.clear();
  }

  private setState(state: LayerLoadState): void {
    this.states.set(state.layerId, state);
    this.emitChange(state);
  }

  private emitChange(state: LayerLoadState): void {
    for (const listener of this.listeners) {
      listener({ state });
    }
  }
}
