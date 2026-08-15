import type { AtlasEngine, AtlasPlace, CameraPathFamily } from "../../src";
import { CAMERA_PATH_CATALOG } from "../presets/cameraPathTests";

interface CameraPathFamilyButtonsProps {
  engine: AtlasEngine;
  places: AtlasPlace[];
  selectedPlaceId: string;
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

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap"
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 11,
  background: "#fff",
  cursor: "pointer"
};

export function CameraPathFamilyButtons({
  engine,
  places,
  selectedPlaceId
}: CameraPathFamilyButtonsProps) {
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0];
  const alternatePlace = places.find((place) => place.id !== selectedPlace?.id) ?? places[1];

  const runPathFamily = (pathFamily: CameraPathFamily) => {
    if (!alternatePlace) {
      return;
    }

    void engine.framePlace(alternatePlace, { pathFamily });
  };

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>
        Path-family motion (London ↔ Dubai pair, manual override)
      </span>
      <div style={buttonRowStyle}>
        {CAMERA_PATH_CATALOG.map((entry) => (
          <button
            key={entry.id}
            type="button"
            style={buttonStyle}
            title={entry.description}
            disabled={!alternatePlace}
            onClick={() => {
              runPathFamily(entry.id);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}
