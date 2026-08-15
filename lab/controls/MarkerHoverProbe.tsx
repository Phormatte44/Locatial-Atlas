import { useEffect, useState } from "react";
import type { AtlasEngine, CameraPathFamily, CameraTransitionEvent } from "../../src";
import { TEST_PLACES } from "../presets/places";

interface MarkerHoverProbeProps {
  engine: AtlasEngine;
}

const readoutStyle: React.CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: 16,
  zIndex: 1,
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(20, 20, 20, 0.88)",
  color: "#f5f5f5",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  minWidth: 240,
  pointerEvents: "none"
};

function describeFeatureId(featureId: string | null): string {
  if (!featureId) {
    return "none";
  }

  if (featureId.endsWith("-label")) {
    const placeId = featureId.slice(0, -"-label".length);
    const place = TEST_PLACES.find((candidate) => candidate.id === placeId);
    return place ? `${place.name} label` : featureId;
  }

  if (featureId.endsWith("-core")) {
    const placeId = featureId.slice(0, -"-core".length);
    const place = TEST_PLACES.find((candidate) => candidate.id === placeId);
    return place ? `${place.name} core` : featureId;
  }

  if (featureId.endsWith("-area")) {
    const placeId = featureId.slice(0, -"-area".length);
    const place = TEST_PLACES.find((candidate) => candidate.id === placeId);
    return place ? `${place.name} area` : featureId;
  }

  const place = TEST_PLACES.find((candidate) => candidate.id === featureId);
  if (place) {
    return place.name;
  }

  if (featureId === "london-dubai-route") {
    return "London–Dubai route";
  }

  return featureId;
}

export function MarkerHoverProbe({ engine }: MarkerHoverProbeProps) {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [cursorGeo, setCursorGeo] = useState<{
    lng: number;
    lat: number;
    altitudeMeters?: number;
  } | null>(null);
  const [pathFamily, setPathFamily] = useState<CameraPathFamily | "idle">("idle");
  const [transitionPhase, setTransitionPhase] = useState<string>("idle");
  const [mapReady, setMapReady] = useState<string>("waiting");
  const [mapError, setMapError] = useState<string>("none");
  const [cameraChange, setCameraChange] = useState<string>("waiting");
  const [highlightedFeatureId, setHighlightedFeatureId] = useState<string>("none");
  const [transitionRunning, setTransitionRunning] = useState(false);
  const [viewMode, setViewMode] = useState(engine.getViewMode());
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(engine.getAtmosphereSettings().enabled);
  const [lightingEnabled, setLightingEnabled] = useState(engine.getLightingSettings().enabled);
  const [shadowEnabled, setShadowEnabled] = useState(engine.getLightingSettings().shadowEnabled);
  const [queryElevation, setQueryElevation] = useState<string>("—");

  useEffect(() => {
    return engine.onGeoHover((event) => {
      setHoveredMarkerId(event.featureId);
      setCursorGeo(
        event.geo
          ? { lng: event.geo.lng, lat: event.geo.lat, altitudeMeters: event.geo.altitudeMeters }
          : null
      );

      if (event.geo) {
        const elevation = engine.queryGroundElevation(event.geo.lng, event.geo.lat);
        setQueryElevation(elevation === null ? "n/a" : `${Math.round(elevation)} m`);
      } else {
        setQueryElevation("—");
      }
    });
  }, [engine]);

  useEffect(() => {
    return engine.onGeoSelect((event) => {
      setSelectedFeatureId(event.featureId);
    });
  }, [engine]);

  useEffect(() => {
    return engine.onMapReady((event) => {
      setMapReady(event.ready ? event.reason : "detached");
    });
  }, [engine]);

  useEffect(() => {
    return engine.onMapError((event) => {
      setMapError(`${event.kind}${event.recoverable ? "" : " (fatal)"}: ${event.message}`);
    });
  }, [engine]);

  useEffect(() => {
    const syncHighlight = () => {
      setHighlightedFeatureId(engine.getHighlightedFeatureId() ?? "none");
    };

    const unsubHover = engine.onGeoHover(() => {
      syncHighlight();
    });
    const unsubSelect = engine.onGeoSelect(() => {
      syncHighlight();
    });

    syncHighlight();

    return () => {
      unsubHover();
      unsubSelect();
    };
  }, [engine]);

  useEffect(() => {
    return engine.onCameraChange((event) => {
      const progress =
        event.state.transitionProgress !== undefined
          ? ` · ${Math.round(event.state.transitionProgress * 100)}%`
          : "";
      setCameraChange(
        `${event.reason} · ${event.state.lat.toFixed(2)}, ${event.state.lng.toFixed(2)} · ${Math.round(event.state.altitudeMeters)} m${progress}`
      );

      if (event.reason === "transition") {
        setTransitionRunning(engine.isTransitionRunning());
      }
    });
  }, [engine]);

  useEffect(() => {
    return engine.onViewModeChange((event) => {
      setViewMode(event.viewMode);
    });
  }, [engine]);

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

  useEffect(() => {
    return engine.onCameraTransition((event: CameraTransitionEvent) => {
      setPathFamily(event.pathFamily);
      setTransitionPhase(event.phase);
      setTransitionRunning(event.phase === "started");

      if (event.phase === "completed" || event.phase === "cancelled") {
        setTransitionRunning(false);
        window.setTimeout(() => {
          setTransitionPhase("idle");
        }, 800);
      }
    });
  }, [engine]);

  return (
    <div style={readoutStyle}>
      <div>Foundation 36 — globe overlay alignment</div>
      <div>View: {viewMode}{viewMode === "globe" ? " · globe matrices" : " · mercator matrices"}</div>
      <div>Atmosphere: {atmosphereEnabled ? "on" : "off"}</div>
      <div>Lighting: {lightingEnabled ? "on" : "off"}</div>
      <div>Shadows: {shadowEnabled ? "on" : "off"}</div>
      <div>Query elev: {queryElevation}</div>
      <div>Highlight: {describeFeatureId(highlightedFeatureId === "none" ? null : highlightedFeatureId)}</div>
      <div>Camera: {cameraChange}</div>
      <div>Map: {mapReady}</div>
      <div>Error: {mapError}</div>
      <div>Hover: {describeFeatureId(hoveredMarkerId)}</div>
      <div>Selected: {describeFeatureId(selectedFeatureId)}</div>
      <div>
        Cursor:{" "}
        {cursorGeo
          ? `${cursorGeo.lat.toFixed(4)}, ${cursorGeo.lng.toFixed(4)}`
          : "off map"}
      </div>
      <div>
        Ground:{" "}
        {cursorGeo?.altitudeMeters !== undefined
          ? `${Math.round(cursorGeo.altitudeMeters)} m`
          : "flat"}
      </div>
      <div>Path: {pathFamily}</div>
      <div>Transition: {transitionPhase}</div>
      <div>Running: {transitionRunning ? "yes" : "no"}</div>
    </div>
  );
}
