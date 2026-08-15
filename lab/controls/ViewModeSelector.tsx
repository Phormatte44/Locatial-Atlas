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

  useEffect(() => {
    return engine.onViewModeChange((event) => {
      setViewMode(event.viewMode);
    });
  }, [engine]);

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      View mode
      <select
        style={selectStyle}
        value={viewMode}
        onChange={(event) => {
          engine.setViewMode(event.target.value as AtlasViewMode);
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
