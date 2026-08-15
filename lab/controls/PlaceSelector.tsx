import React, { useEffect, useState } from "react";
import type { AtlasEngine, AtlasPlace } from "../../src";
import { MapStyleSelector } from "./MapStyleSelector";
import { TerrainSourceSelector } from "./TerrainSourceSelector";
import { TerrainToggle } from "./TerrainToggle";
import { BoundaryLayerToggle } from "./BoundaryLayerToggle";
import { LabelLayerToggle } from "./LabelLayerToggle";
import { RoadLayerToggle } from "./RoadLayerToggle";
import { AreaLayerToggle } from "./AreaLayerToggle";
import { BuildingLayerToggle } from "./BuildingLayerToggle";
import { PoiLayerToggle } from "./PoiLayerToggle";
import { RasterLayerToggle } from "./RasterLayerToggle";
import { Tileset3DLayerToggle } from "./Tileset3DLayerToggle";
import { ViewModeSelector } from "./ViewModeSelector";
import { VisualEnvironmentControls } from "./VisualEnvironmentControls";
import { CameraPathFamilyButtons } from "./CameraPathFamilyButtons";

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
      <strong style={{ fontSize: 14 }}>Atlas Lab — Foundation 60</strong>
      <span style={{ fontSize: 12, color: "#555" }}>
        City buttons frame the center point via GSAP camera paths (local-glide within a city,
        orbit-reveal for regional hops, departure-arrival-arc for London ↔ Dubai). Path-family
        buttons override auto-select on the London ↔ Dubai pair. Area buttons frame metro bounds.
        View-mode selector uses Atlas-owned `transitionViewMode()` with camera choreography to
        preserve framing across globe↔map blends; labels align to the globe tangent plane and
        lines, polygons, core circles, and area ellipses follow geodesic-aware vertex placement with projection
        blend and Douglas–Peucker simplification plus cached mercator/globe vertex lerp. Enable 3D Tiles for Re:Earth Buildings — async mesh-feature picks, structural
        metadata on hover, click-to-frame single features, emissive highlight. Toggle POI layers
        for clustered landmarks — click a cluster to expand.
      </span>
      <ViewModeSelector engine={engine} />
      <VisualEnvironmentControls engine={engine} />
      <MapStyleSelector engine={engine} />
      <TerrainSourceSelector engine={engine} />
      <TerrainToggle engine={engine} />
      <RasterLayerToggle engine={engine} />
      <Tileset3DLayerToggle engine={engine} />
      <CameraPathFamilyButtons engine={engine} places={places} selectedPlaceId={selectedId} />
      <BoundaryLayerToggle engine={engine} />
      <LabelLayerToggle engine={engine} />
      <RoadLayerToggle engine={engine} />
      <AreaLayerToggle engine={engine} />
      <BuildingLayerToggle engine={engine} />
      <PoiLayerToggle engine={engine} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            engine.highlightFeature("building:lab-london-buildings:london-shard");
          }}
        >
          Highlight tower
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            engine.highlightFeature("area:lab-london-park:london-park");
          }}
        >
          Highlight park
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            engine.highlightFeature("road:lab-london-dubai-route:london-dubai-route");
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
