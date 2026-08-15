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

const readoutStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#666",
  lineHeight: 1.4
};

export function VisualEnvironmentControls({ engine }: VisualEnvironmentControlsProps) {
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(engine.getAtmosphereSettings().enabled);
  const [lightingEnabled, setLightingEnabled] = useState(engine.getLightingSettings().enabled);
  const [shadowEnabled, setShadowEnabled] = useState(engine.getLightingSettings().shadowEnabled);
  const [blendProgress, setBlendProgress] = useState(engine.getProjectionTransition());
  const [effectiveAtmosphereBlend, setEffectiveAtmosphereBlend] = useState(
    engine.getEffectiveAtmosphereSettings().atmosphereBlend
  );
  const [effectiveAmbient, setEffectiveAmbient] = useState(
    engine.getEffectiveLightingSettings().ambientIntensity
  );

  useEffect(() => {
    const refreshEffectiveReadout = () => {
      setEffectiveAtmosphereBlend(engine.getEffectiveAtmosphereSettings().atmosphereBlend);
      setEffectiveAmbient(engine.getEffectiveLightingSettings().ambientIntensity);
    };

    const unsubAtmosphere = engine.onAtmosphereChange((event) => {
      setAtmosphereEnabled(event.settings.enabled);
      refreshEffectiveReadout();
    });

    const unsubLighting = engine.onLightingChange((event) => {
      setLightingEnabled(event.settings.enabled);
      setShadowEnabled(event.settings.shadowEnabled);
      refreshEffectiveReadout();
    });

    const unsubBlend = engine.onProjectionBlendProgress((transition) => {
      setBlendProgress(transition);
      refreshEffectiveReadout();
    });

    return () => {
      unsubAtmosphere();
      unsubLighting();
      unsubBlend();
    };
  }, [engine]);

  const blendActive = blendProgress > 0.001 && blendProgress < 0.999;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      <div style={readoutStyle}>
        Globeness: {(blendProgress * 100).toFixed(0)}%
        {blendActive ? " (blending)" : " (settled)"}
        {" · "}
        Effective atmosphere blend: {effectiveAtmosphereBlend.toFixed(2)}
        {" · "}
        Effective ambient: {effectiveAmbient.toFixed(2)}
      </div>
    </div>
  );
}
