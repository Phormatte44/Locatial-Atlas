import { useEffect, useState } from "react";
import type { AtlasEngine, LayerLoadState } from "../../src";
import {
  DEFAULT_LAB_TILESET3D_LAYER_ID,
  LAB_TILESET3D_LAYERS
} from "../presets/tileset3DLayers";

function parseTilesetLayerId(featureId: string): string | null {
  if (!featureId.startsWith("tileset3d:")) {
    return null;
  }

  const rest = featureId.slice("tileset3d:".length);
  const separator = rest.indexOf(":");
  return separator === -1 ? null : rest.slice(0, separator);
}

interface Tileset3DLayerToggleProps {
  engine: AtlasEngine;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#555"
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  background: "#fff"
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12
};

const statusStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#666",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
};

const noteStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#777",
  lineHeight: 1.35
};

function describeLoadState(state: LayerLoadState | undefined): string {
  if (!state) {
    return "idle";
  }

  if (state.status === "error") {
    return `error: ${state.error ?? "unknown"}`;
  }

  return state.url ? `${state.status} (${state.url})` : state.status;
}

export function Tileset3DLayerToggle({ engine }: Tileset3DLayerToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_LAB_TILESET3D_LAYER_ID);
  const [loadState, setLoadState] = useState<LayerLoadState | undefined>();

  useEffect(() => {
    for (const layer of LAB_TILESET3D_LAYERS) {
      engine.registerTileset3DLayer(layer);
    }
  }, [engine]);

  useEffect(() => {
    engine.setTileset3DLayers(enabled ? [selectedLayerId] : []);
  }, [engine, enabled, selectedLayerId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void engine.frameTilesetOnReady(selectedLayerId);
  }, [engine, enabled, selectedLayerId]);

  useEffect(() => {
    return engine.onLayerLoadChange(({ state }) => {
      if (state.layerId === selectedLayerId && state.family === "tiles3d") {
        setLoadState(state);
      }
    });
  }, [engine, selectedLayerId]);

  useEffect(() => {
    setLoadState(engine.getLayerLoadState(selectedLayerId));
  }, [engine, selectedLayerId, enabled]);

  useEffect(() => {
    return engine.onGeoSelect((event) => {
      const layerId = event.featureId ? parseTilesetLayerId(event.featureId) : null;
      if (!layerId || !event.featureId) {
        return;
      }

      void engine.frameTilesetFeature(layerId, event.featureId);
    });
  }, [engine]);

  const showRetry = loadState?.status === "error";
  const selectedLayer = LAB_TILESET3D_LAYERS.find((layer) => layer.id === selectedLayerId);

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>3D Tiles overlay (Lab demo)</span>
      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
          }}
        />
        Enable 3D Tiles layer
      </label>
      <select
        style={selectStyle}
        value={selectedLayerId}
        disabled={!enabled}
        onChange={(event) => {
          setSelectedLayerId(event.target.value);
        }}
      >
        {LAB_TILESET3D_LAYERS.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
      <span style={noteStyle}>
        Foundation 51 picks stable feature keys (EXT_mesh_features / batch table when present,
        mesh uuid fallback). Click a building to frame its mesh bounds. Hover highlights via the
        shared tileset3d: pipeline after markup/POI.
      </span>
      {enabled ? (
        <span style={statusStyle}>
          Load: {describeLoadState(loadState)}
          {selectedLayer?.semanticType ? ` · ${selectedLayer.semanticType}` : ""}
        </span>
      ) : null}
      {showRetry ? (
        <button
          type="button"
          style={{
            border: "1px solid #d0d0d0",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            background: "#fff",
            cursor: "pointer",
            alignSelf: "flex-start"
          }}
          onClick={() => {
            engine.retryLayerLoad(selectedLayerId, "tiles3d");
          }}
        >
          Retry tileset load
        </button>
      ) : null}
    </div>
  );
}
