import { useEffect, useState } from "react";
import type { AtlasEngine, LayerLoadState } from "../../src";
import {
  DEFAULT_LAB_BOUNDARY_LAYER_ID,
  LAB_BOUNDARY_LAYERS
} from "../presets/boundaryLayers";

interface BoundaryLayerToggleProps {
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

function describeLoadState(state: LayerLoadState | undefined): string {
  if (!state) {
    return "idle";
  }

  if (state.status === "error") {
    return `error: ${state.error ?? "unknown"}`;
  }

  return state.url ? `${state.status} (${state.url})` : state.status;
}

export function BoundaryLayerToggle({ engine }: BoundaryLayerToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_LAB_BOUNDARY_LAYER_ID);
  const [loadState, setLoadState] = useState<LayerLoadState | undefined>();

  useEffect(() => {
    for (const layer of LAB_BOUNDARY_LAYERS) {
      engine.registerBoundaryLayer(layer);
    }
  }, [engine]);

  useEffect(() => {
    engine.setBoundaryLayers(enabled ? [selectedLayerId] : []);
  }, [engine, enabled, selectedLayerId]);

  useEffect(() => {
    return engine.onLayerLoadChange(({ state }) => {
      if (state.layerId === selectedLayerId) {
        setLoadState(state);
      }
    });
  }, [engine, selectedLayerId]);

  useEffect(() => {
    setLoadState(engine.getLayerLoadState(selectedLayerId));
  }, [engine, selectedLayerId, enabled]);

  const showRetry = loadState?.status === "error";

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>Boundary layers (Lab demo)</span>
      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
          }}
        />
        Show boundary layer
      </label>
      <select
        style={selectStyle}
        value={selectedLayerId}
        disabled={!enabled}
        onChange={(event) => {
          setSelectedLayerId(event.target.value);
        }}
      >
        {LAB_BOUNDARY_LAYERS.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
      {enabled ? <span style={statusStyle}>Load: {describeLoadState(loadState)}</span> : null}
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
            engine.retryLayerLoad(selectedLayerId, "boundary");
          }}
        >
          Retry URL load
        </button>
      ) : null}
    </div>
  );
}
