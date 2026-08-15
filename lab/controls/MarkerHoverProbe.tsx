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

  if (featureId.startsWith("poi:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts.slice(2).join(":");

    if (featureKey.startsWith("cluster:")) {
      return `POI cluster (${layerId})`;
    }

    if (layerId === "lab-london-pois") {
      if (featureKey === "tower-bridge") return "Tower Bridge POI";
      if (featureKey === "shard") return "The Shard POI";
    }

    if (layerId === "lab-dubai-pois") {
      if (featureKey === "burj-khalifa") return "Burj Khalifa POI";
    }

    if (layerId === "paris-pois-url") {
      if (featureKey === "eiffel") return "Eiffel Tower POI (URL)";
    }

    return featureKey || layerId || featureId;
  }

  if (featureId.startsWith("building:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts[2];
    if (layerId === "lab-london-buildings") {
      if (featureKey === "london-shard") {
        return "Shard block";
      }
      if (featureKey === "london-guildhall") {
        return "Guildhall block";
      }
      if (featureKey === "london-canary") {
        return "Canary Wharf block";
      }
    }
    if (layerId === "lab-dubai-buildings") {
      if (featureKey === "dubai-burj") {
        return "Burj block";
      }
      if (featureKey === "dubai-marina") {
        return "Marina tower";
      }
      if (featureKey === "dubai-opera") {
        return "Opera block";
      }
    }
    return featureKey ?? layerId ?? featureId;
  }

  if (featureId.startsWith("tileset3d:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts.slice(2).join(":");
    if (featureKey.startsWith("mf:")) {
      return `3D tile feature ${featureKey.slice(3).split("@")[0]} (${layerId})`;
    }
    if (featureKey.startsWith("batch:")) {
      return `3D tile batch ${featureKey.slice(6).split("@")[0]} (${layerId})`;
    }
    return layerId ? `3D tile mesh (${layerId})` : "3D tile mesh";
  }

  if (featureId.startsWith("area:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts[2];
    if (layerId === "lab-london-park" || featureKey === "london-park") {
      return "London park area";
    }
    if (layerId === "lab-dubai-zone" || featureKey === "dubai-zone") {
      return "Dubai business zone";
    }
    return featureKey ?? layerId ?? featureId;
  }

  if (featureId.startsWith("road:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts[2];
    if (layerId === "lab-london-dubai-route" || featureKey === "london-dubai-route") {
      return "London–Dubai corridor";
    }
    return featureKey ?? layerId ?? featureId;
  }

  if (featureId.startsWith("label:")) {
    const parts = featureId.split(":");
    const layerId = parts[1];
    const featureKey = parts[2];
    if (layerId === "lab-city-labels") {
      if (featureKey === "london") {
        return "London map label";
      }
      if (featureKey === "dubai") {
        return "Dubai map label";
      }
    }
    return featureKey ?? layerId ?? featureId;
  }

  if (featureId.startsWith("boundary:")) {
    const layerId = featureId.split(":")[1];
    if (layerId === "london-metro") {
      return "London metro boundary";
    }
    if (layerId === "dubai-metro") {
      return "Dubai metro boundary";
    }
    if (layerId === "paris-metro-url") {
      return "Paris metro boundary (URL)";
    }
    return layerId ?? featureId;
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

function formatTilesetProperties(properties: Record<string, unknown> | null | undefined): string {
  if (!properties || Object.keys(properties).length === 0) {
    return "none";
  }

  const entries = Object.entries(properties).slice(0, 4);
  const summary = entries
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");

  if (Object.keys(properties).length > entries.length) {
    return `${summary}, …`;
  }

  return summary;
}

export function MarkerHoverProbe({ engine }: MarkerHoverProbeProps) {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [hoveredTilesetProperties, setHoveredTilesetProperties] = useState<string>("none");
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
  const [layerLoadSummary, setLayerLoadSummary] = useState<string>("none");
  const [cameraChange, setCameraChange] = useState<string>("waiting");
  const [highlightedFeatureId, setHighlightedFeatureId] = useState<string>("none");
  const [transitionRunning, setTransitionRunning] = useState(false);
  const [viewMode, setViewMode] = useState(engine.getViewMode());
  const [viewModeBlend, setViewModeBlend] = useState<string>("idle");
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(engine.getAtmosphereSettings().enabled);
  const [lightingEnabled, setLightingEnabled] = useState(engine.getLightingSettings().enabled);
  const [shadowEnabled, setShadowEnabled] = useState(engine.getLightingSettings().shadowEnabled);
  const [queryElevation, setQueryElevation] = useState<string>("—");

  useEffect(() => {
    return engine.onGeoHover((event) => {
      setHoveredMarkerId(event.featureId);
      setHoveredTilesetProperties(formatTilesetProperties(event.tilesetFeatureProperties));
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
    const summarize = () => {
      const states = engine.getLayerLoadStates();
      if (states.length === 0) {
        setLayerLoadSummary("none");
        return;
      }

      setLayerLoadSummary(
        states.map((state) => `${state.layerId}:${state.status}`).join(", ")
      );
    };

    summarize();
    return engine.onLayerLoadChange(() => {
      summarize();
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
      setViewModeBlend(
        event.transitionProgress !== undefined
          ? `${Math.round(event.transitionProgress * 100)}%`
          : "settled"
      );
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
      <div>Foundation 53 — view-mode atmosphere polish</div>
      <div>
        View: {viewMode}
        {viewMode === "globe" || viewModeBlend !== "settled"
          ? " · globe matrices"
          : " · mercator matrices"}
      </div>
      <div>Projection blend: {viewModeBlend}</div>
      <div>Atmosphere: {atmosphereEnabled ? "on" : "off"}</div>
      <div>Lighting: {lightingEnabled ? "on" : "off"}</div>
      <div>Shadows: {shadowEnabled ? "on" : "off"}</div>
      <div>Query elev: {queryElevation}</div>
      <div>Highlight: {describeFeatureId(highlightedFeatureId === "none" ? null : highlightedFeatureId)}</div>
      <div>Camera: {cameraChange}</div>
      <div>Map: {mapReady}</div>
      <div>Layer load: {layerLoadSummary}</div>
      <div>Error: {mapError}</div>
      <div>Hover: {describeFeatureId(hoveredMarkerId)}</div>
      <div>Tileset props: {hoveredTilesetProperties}</div>
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
