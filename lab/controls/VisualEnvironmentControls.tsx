import { useEffect, useState } from "react";
import type { AtlasEngine } from "../../src";

interface VisualEnvironmentControlsProps {
  engine: AtlasEngine;
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "6px 10px",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12
};

export function VisualEnvironmentControls({ engine }: VisualEnvironmentControlsProps) {
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(engine.getAtmosphereSettings().enabled);
  const [lightingEnabled, setLightingEnabled] = useState(engine.getLightingSettings().enabled);
  const [shadowEnabled, setShadowEnabled] = useState(engine.getLightingSettings().shadowEnabled);

  useEffect(() => {
    return engine.onAtmosphereChange((event) => {
      setAtmosphereEnabled(event.settings.enabled);
    });
  }, [engine]);

  useEffect(() => {
    return engine.onLightingChange((event) => {
      setLightingEnabled(event.settings.enabled);
      setShadowEnabled(event.settings.shadowEnabled);
    });
  }, [engine]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          engine.setAtmosphereSettings({ enabled: !atmosphereEnabled });
        }}
      >
        Atmosphere: {atmosphereEnabled ? "on" : "off"}
      </button>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          engine.setLightingSettings({ enabled: !lightingEnabled });
        }}
      >
        Lighting: {lightingEnabled ? "on" : "off"}
      </button>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          engine.setLightingSettings({ shadowEnabled: !shadowEnabled });
        }}
      >
        Shadows: {shadowEnabled ? "on" : "off"}
      </button>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          engine.setAtmosphereSettings({
            skyColor: "#5a8fd4",
            horizonColor: "#f5e6c8",
            atmosphereBlend: 1
          });
        }}
      >
        Warm sky
      </button>
    </div>
  );
}
