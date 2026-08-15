import { useEffect, useState } from "react";
import type { AtlasEngine } from "../../src";

interface TerrainSourceSelectorProps {
  engine: AtlasEngine;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #d0d0d0",
  borderRadius: 6,
  padding: "8px 10px",
  background: "#fff",
  fontSize: 14,
  minWidth: 180
};

export function TerrainSourceSelector({ engine }: TerrainSourceSelectorProps) {
  const sources = engine.listTerrainSources();
  const [selectedId, setSelectedId] = useState(engine.getTerrainSourceId());
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (sourceId: string) => {
    setSelectedId(sourceId);
    setIsLoading(true);

    void engine
      .setTerrainSource(sourceId)
      .catch((error: unknown) => {
        console.error(error);
        setSelectedId(engine.getTerrainSourceId());
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setSelectedId(engine.getTerrainSourceId());
  }, [engine]);

  return (
    <div style={rowStyle}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        Terrain source
        <select
          style={selectStyle}
          value={selectedId}
          disabled={isLoading}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
