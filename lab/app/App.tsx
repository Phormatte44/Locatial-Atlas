import { useEffect, useMemo } from "react";
import { AtlasEngine, AtlasMapView, LOCATIAL_EDITORIAL_MAP_STYLE_ID } from "../../src";
import { MarkerHoverProbe } from "../controls/MarkerHoverProbe";
import { PlaceSelector } from "../controls/PlaceSelector";
import { defaultScene } from "../scenes/defaultScene";

export function App() {
  const engine = useMemo(
    () => new AtlasEngine({ mapStyleId: LOCATIAL_EDITORIAL_MAP_STYLE_ID }),
    []
  );

  useEffect(() => {
    engine.setWorldMarkup(defaultScene.worldMarkup);
  }, [engine]);

  return (
    <div className="lab-shell">
      <AtlasMapView engine={engine} className="lab-map" />
      <PlaceSelector engine={engine} places={defaultScene.places} />
      <MarkerHoverProbe engine={engine} />
    </div>
  );
}
