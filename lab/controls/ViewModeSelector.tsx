import { useEffect, useState } from "react";
import type { AtlasEngine, AtlasViewMode } from "../../src";

interface ViewModeSelectorProps {
  engine: AtlasEngine;
}

const selectStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  background: "#fff"
};

function formatBlendPercent(transition: number): string {
  return `${(transition * 100).toFixed(0)}%`;
}

function formatAltitudeMeters(altitudeMeters: number): string {
  if (altitudeMeters >= 1000) {
    return `${(altitudeMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(altitudeMeters)} m`;
}

export function ViewModeSelector({ engine }: ViewModeSelectorProps) {
  const [viewMode, setViewMode] = useState<AtlasViewMode>(engine.getViewMode());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blendProgress, setBlendProgress] = useState<number | null>(() => {
    const transition = engine.getProjectionTransition();
    return transition > 0.001 && transition < 0.999 ? transition : null;
  });
  const [cameraChoreo, setCameraChoreo] = useState<string | null>(null);

  useEffect(() => {
    const unsubViewMode = engine.onViewModeChange((event) => {
      setViewMode(event.viewMode);
      if (event.transitionProgress !== undefined) {
        setBlendProgress(event.transitionProgress);
        setIsTransitioning(true);
      } else {
        setIsTransitioning(false);
        setCameraChoreo(null);
        const transition = engine.getProjectionTransition();
        setBlendProgress(transition > 0.001 && transition < 0.999 ? transition : null);
      }
    });

    const unsubBlend = engine.onProjectionBlendProgress((transition) => {
      setBlendProgress(transition > 0.001 && transition < 0.999 ? transition : null);
    });

    const unsubCamera = engine.onCameraChange((event) => {
      if (event.reason !== "view-mode-transition") {
        return;
      }

      const { pitchDegrees, altitudeMeters } = event.state;
      setCameraChoreo(
        `pitch ${pitchDegrees.toFixed(0)}° · alt ${formatAltitudeMeters(altitudeMeters)}`
      );
    });

    return () => {
      unsubViewMode();
      unsubBlend();
      unsubCamera();
    };
  }, [engine]);

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      View mode
      {blendProgress !== null ? (
        <span style={{ color: "#666" }}>
          Globeness / projection blend: {formatBlendPercent(blendProgress)}
          {isTransitioning ? " · transitioning" : ""}
          {cameraChoreo ? ` · camera choreo: ${cameraChoreo}` : ""}
        </span>
      ) : null}
      <select
        style={selectStyle}
        value={viewMode}
        disabled={isTransitioning}
        onChange={(event) => {
          const nextMode = event.target.value as AtlasViewMode;
          setViewMode(nextMode);
          setIsTransitioning(true);
          void engine.transitionViewMode(nextMode, { preserveFraming: true }).finally(() => {
            setIsTransitioning(false);
          });
        }}
      >
        {engine.listViewModes().map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </label>
  );
}
