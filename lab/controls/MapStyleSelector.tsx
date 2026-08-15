import { useEffect, useState } from "react";
import type { AtlasEngine } from "../../src";

interface MapStyleSelectorProps {
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

export function MapStyleSelector({ engine }: MapStyleSelectorProps) {
  const styles = engine.listMapStyles();
  const [selectedId, setSelectedId] = useState(engine.getMapStyleId());
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (styleId: string) => {
    setSelectedId(styleId);
    setIsLoading(true);

    void engine
      .setMapStyle(styleId)
      .catch((error: unknown) => {
        console.error(error);
        setSelectedId(engine.getMapStyleId());
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setSelectedId(engine.getMapStyleId());
  }, [engine]);

  return (
    <div style={rowStyle}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        Map style
        <select
          style={selectStyle}
          value={selectedId}
          disabled={isLoading}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
        >
          {styles.map((style) => (
            <option key={style.id} value={style.id}>
              {style.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
