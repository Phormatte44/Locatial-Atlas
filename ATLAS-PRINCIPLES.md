# Atlas Principles

## 1. Atlas is a reusable engine

Do not build Atlas as a one-off map page. Core behavior must be reusable by future Locational products.

## 2. The Lab is disposable

Experiment aggressively in `lab`. Keep experimental UI, temporary controls, hard-coded demo scenes, and visual tests out of engine code.

## 3. Geographic truth stays geographic

Use longitude, latitude, altitude, bounds, geometry, and stable geographic identifiers at system boundaries. Avoid leaking renderer-specific coordinates into product contracts.

## 4. Camera is a first-class system

Camera behavior is not a collection of ad hoc `flyTo` calls. Movement, orientation, framing, lens behavior, altitude, and timing belong to a coherent camera system.

## 5. Renderers are implementation details

Other Locational products should not need to know how MapLibre, Three.js, GSAP, shaders, terrain, or lighting are implemented internally.

## 6. Providers should be replaceable

Tile, terrain, imagery, boundary, and model providers should sit behind adapters where practical.

## 7. Visual quality matters

Atlas should support the premium, restrained, cinematic visual language required by Locational without hard-coding one demo scene into the engine.

## 8. No silent architectural changes

If an agent changes a public contract, geographic coordinate convention, renderer boundary, or camera model, document the decision in `DECISIONS.md`.
