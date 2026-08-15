import { useEffect, useMemo } from "react";
import { AtlasEngine, AtlasMapView, LOCATIAL_EDITORIAL_MAP_STYLE_ID } from "../../src";
import { MarkerHoverProbe } from "../controls/MarkerHoverProbe";
import { PlaceSelector } from "../controls/PlaceSelector";
import { TEST_PLACES } from "../presets/places";
import { TEST_WORLD_MARKUP } from "../presets/worldMarkup";

export function App() {
  const engine = useMemo(
    () => new AtlasEngine({ mapStyleId: LOCATIAL_EDITORIAL_MAP_STYLE_ID }),
    []
  );

  useEffect(() => {
    engine.setWorldMarkup(TEST_WORLD_MARKUP);
  }, [engine]);

  return (
    <div className="lab-shell">
      <AtlasMapView engine={engine} className="lab-map" />
      <PlaceSelector engine={engine} places={TEST_PLACES} />
      <MarkerHoverProbe engine={engine} />
    </div>
  );
}
