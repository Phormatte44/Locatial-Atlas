import { useEffect, useState } from "react";
import type { AtlasEngine } from "../../src";
import {
  DEFAULT_LAB_BUILDING_LAYER_ID,
  LAB_BUILDING_LAYERS
} from "../presets/buildingLayers";

interface BuildingLayerToggleProps {
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

export function BuildingLayerToggle({ engine }: BuildingLayerToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_LAB_BUILDING_LAYER_ID);

  useEffect(() => {
    for (const layer of LAB_BUILDING_LAYERS) {
      engine.registerBuildingLayer(layer);
    }
  }, [engine]);

  useEffect(() => {
    engine.setBuildingLayers(enabled ? [selectedLayerId] : []);
  }, [engine, enabled, selectedLayerId]);

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>Building layers (Lab demo)</span>
      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
          }}
        />
        Show building footprints
      </label>
      <select
        style={selectStyle}
        value={selectedLayerId}
        disabled={!enabled}
        onChange={(event) => {
          setSelectedLayerId(event.target.value);
        }}
      >
        {LAB_BUILDING_LAYERS.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
    </div>
  );
}
