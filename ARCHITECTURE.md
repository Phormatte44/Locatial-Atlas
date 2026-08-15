# Architecture

Locational Atlas is divided into a reusable engine and an isolated development Lab.

## Engine areas

### `src/contracts`
Public interfaces exposed to applications using Atlas.

### `src/camera`
Camera state, path solving, framing, orientation, lens behavior, transition planning, and interpolation.

### `src/world`
Geographic world model, coordinate transforms, projection helpers, terrain alignment, and world-level utilities.

### `src/rendering`
Renderer integration.

- `maplibre` — geographic map renderer integration
- `three` — custom 3D renderer integration
- `lighting` — environment and directional lighting
- `materials` — physical material definitions
- `shadows` — world and contact shadow systems

### `src/layers`
Boundaries, labels, roads, buildings, satellite imagery, terrain visualization, and other map/world layers.

### `src/interaction`
Pointer hit testing, hover, selection detection, screen-to-world and world-to-screen translation.

### `src/geometry`
World-space lines, circles, polygons, labels, and other geographic geometry used by Atlas.

### `src/data`
Adapters for external map, terrain, imagery, boundary, model, and geographic providers.

### `src/engine`
Composition layer that brings the subsystems together behind Atlas's public API.

## Lab areas

### `lab/app`
Development application shell.

### `lab/scenes`
Repeatable geographic scenes such as London, Dubai, Manhattan, mountains, and long-distance transitions.

### `lab/tests`
Focused experiments and visual/technical tests.

### `lab/controls`
Temporary developer controls.

### `lab/presets`
Camera, lighting, material, and map-style presets.

### `lab/reference`
Reference screenshots and visual targets.

## Dependency direction

`lab` may import from `src`.

Subsystems in `src` may depend on lower-level shared contracts and utilities where appropriate.

`src` must never import from `lab`.

External applications should consume Atlas through `src/contracts` and the engine entry point rather than renderer internals.

## Product consumers

Creator Studio is the first live product consumer.

- Studio repo: sibling `Documents/GitHub/Locatial-Creator-Studio`
- Link: `"locational-atlas": "file:../Locatial-Atlas"` plus a Vite alias to this `src/`
- Studio Director map: `AtlasEngine` + `AtlasMapView` only
- Studio translates its Place and markup types at its boundary; Atlas receives `AtlasPlace` and `WorldMarkup`
- Two git repos; commits do not cross. Edits in `src/` show in Studio while its dev server is running

Studio must not import `lab/` or `src/rendering/maplibre/*` / `src/rendering/three/*`. Capabilities that still live in Studio/Spatial (markup drawing, story globe overlay, aesthetic rail, Spatial playback) stay there until Atlas grows an explicit public API for them.
