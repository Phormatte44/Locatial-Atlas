import { useEffect, useRef } from "react";
import type { AtlasEngine } from "../engine/AtlasEngine";

interface AtlasMapViewProps {
  engine: AtlasEngine;
  className?: string;
}

/** Renders the Atlas map surface and attaches it to an engine instance. */
export function AtlasMapView({ engine, className }: AtlasMapViewProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = localRef.current;
    if (!container) {
      return;
    }

    engine.attach(container);

    return () => {
      engine.detach();
    };
  }, [engine]);

  useEffect(() => {
    const container = localRef.current;
    if (!container) {
      return;
    }

    const updateHover = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      engine.updateGeoHover(clientX - rect.left, clientY - rect.top);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        updateHover(event.clientX, event.clientY);
        rafRef.current = null;
      });
    };

    const onPointerLeave = () => {
      engine.clearGeoHover();
    };

    const onPointerUp = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      engine.selectGeoAt(event.clientX - rect.left, event.clientY - rect.top);
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerup", onPointerUp);

    return () => {
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("pointerup", onPointerUp);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [engine]);

  return (
    <div
      ref={localRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
