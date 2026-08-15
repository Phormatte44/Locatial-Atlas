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

export function ViewModeSelector({ engine }: ViewModeSelectorProps) {
  const [viewMode, setViewMode] = useState<AtlasViewMode>(engine.getViewMode());
  const [blendProgress, setBlendProgress] = useState<number | null>(null);

  useEffect(() => {
    return engine.onViewModeChange((event) => {
      setViewMode(event.viewMode);
      setBlendProgress(event.transitionProgress ?? null);
    });
  }, [engine]);

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      View mode
      {blendProgress !== null ? (
        <span style={{ color: "#666" }}>Projection blend: {(blendProgress * 100).toFixed(0)}%</span>
      ) : null}
      <select
        style={selectStyle}
        value={viewMode}
        onChange={(event) => {
          const nextMode = event.target.value as AtlasViewMode;
          setViewMode(nextMode);
          engine.setViewMode(nextMode);
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
