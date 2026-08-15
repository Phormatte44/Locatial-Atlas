# Rendering System

Atlas currently assumes a hybrid geographic and custom 3D renderer.

## MapLibre responsibilities

Use MapLibre primarily for:

- map projection
- globe/geographic rendering
- vector tiles
- labels
- roads
- map layers
- terrain integration
- geographic feature interaction where appropriate

## Three.js responsibilities

Use Three.js primarily for:

- custom 3D geometry
- physical materials
- custom lighting
- custom shadows
- atmosphere
- world-space markup rendering
- imported 3D assets
- rendering techniques not available through the base map renderer

## Shared alignment

MapLibre and Three.js must remain spatially aligned throughout:

- camera motion
- projection changes
- zoom/altitude changes
- pitch and bearing changes
- terrain/elevation changes

## Lighting

Initial target:

- neutral environment/IBL support
- directional sun
- soft daylight behavior
- controllable atmospheric contribution

## Shadows

Support a path toward:

- directional world shadows
- cascaded shadow mapping where justified
- terrain/world shadow receivers
- restrained contact detail

Avoid screen-space tricks that break geographic/world consistency unless explicitly isolated as optional effects.

### Overlay shadow foundation (F35)

Lit mesh markup (`sphere`, `polygon`, `circle`) renders in a shared Three.js overlay scene with directional shadow maps configured in `src/rendering/lighting/overlayShadowConfig.ts`. Spheres cast; polygons and circles receive; each anchor may include a local `ShadowMaterial` ground receiver for contact detail.

**Limitations (current foundation):**

- MapLibre terrain and basemap tiles are not shadow receivers yet — shadows appear on overlay geometry and ground receivers only.
- Lines and labels do not participate in the shadow pass.
- Shadow frustum is fitted to visible lit anchors; very wide multi-city markup spreads may need cascaded shadow work later.
- Globe view mode uses MapLibre `getMatrixForModel` for overlay anchor transforms and shadow frustum alignment (Foundation 36).
- During MapLibre projection blend (`projectionTransition` between 0 and 1), overlay matrices refresh each custom-layer frame so markup and shadows stay aligned (Foundation 37).

### Boundary layers (F38)

Registered boundary layers render as MapLibre fill + line GeoJSON layers inserted below symbol layers and below the Three.js overlay. Style tokens map to paint properties; hover/selection highlight uses feature-state. Applications register definitions through the public API; no demo boundaries live in `src`.

## Materials

Materials should be defined centrally rather than repeatedly inside scenes.

## Provider independence

Do not embed provider-specific assumptions deep inside rendering systems when an adapter can isolate them.
