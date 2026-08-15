import React, { useEffect, useState } from "react";
import type { AtlasEngine, AtlasPlace } from "../../src";
import { MapStyleSelector } from "./MapStyleSelector";
import { TerrainSourceSelector } from "./TerrainSourceSelector";
import { TerrainToggle } from "./TerrainToggle";

interface PlaceSelectorProps {
  engine: AtlasEngine;
  places: AtlasPlace[];
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.92)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
  fontFamily: "system-ui, sans-serif"
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "8px 12px",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#222",
  background: "#222",
  color: "#fff"
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  fontSize: 12,
  padding: "6px 10px"
};

export function PlaceSelector({ engine, places }: PlaceSelectorProps) {
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? "");

  useEffect(() => {
    const initialPlace = places[0];
    if (!initialPlace) {
      return;
    }

    void engine.framePlace(initialPlace);
  }, [engine, places]);

  const handleSelect = (place: AtlasPlace) => {
    setSelectedId(place.id);
    void engine.framePlace(place);
  };

  const handleFrameBounds = (place: AtlasPlace) => {
    if (!place.bounds) {
      return;
    }

    setSelectedId(place.id);
    void engine.frameBounds(place.bounds);
  };

  return (
    <div style={panelStyle}>
      <strong style={{ fontSize: 14 }}>Atlas Lab — Foundation 28</strong>
      <span style={{ fontSize: 12, color: "#555" }}>
        City buttons frame the center point; area buttons frame metro bounds.
      </span>
      <MapStyleSelector engine={engine} />
      <TerrainSourceSelector engine={engine} />
      <TerrainToggle engine={engine} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            engine.highlightFeature("london-dubai-route");
          }}
        >
          Highlight route
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            engine.clearHighlights();
          }}
        >
          Clear highlights
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {places.map((place) => (
          <div key={place.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={selectedId === place.id ? activeButtonStyle : buttonStyle}
              onClick={() => {
                handleSelect(place);
              }}
            >
              {place.name}
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={!place.bounds}
              onClick={() => {
                handleFrameBounds(place);
              }}
            >
              {place.name} area
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
