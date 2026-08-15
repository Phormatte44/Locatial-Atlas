import { useEffect, useState } from "react";
import type { AtlasEngine } from "../../src";

interface TerrainToggleProps {
  engine: AtlasEngine;
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  cursor: "pointer"
};

export function TerrainToggle({ engine }: TerrainToggleProps) {
  const [enabled, setEnabled] = useState(engine.isTerrainEnabled());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEnabled(engine.isTerrainEnabled());
  }, [engine]);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    setIsLoading(true);

    void engine
      .setTerrainEnabled(next)
      .catch((error: unknown) => {
        console.error(error);
        setEnabled(engine.isTerrainEnabled());
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <label style={labelStyle}>
      <input type="checkbox" checked={enabled} disabled={isLoading} onChange={handleToggle} />
      3D terrain
    </label>
  );
}
