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

## Materials

Materials should be defined centrally rather than repeatedly inside scenes.

## Provider independence

Do not embed provider-specific assumptions deep inside rendering systems when an adapter can isolate them.
