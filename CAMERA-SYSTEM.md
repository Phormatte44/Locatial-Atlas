# Camera System

The Atlas camera system owns how the viewer moves through geographic space.

## Canonical camera properties

- longitude
- latitude
- altitude
- heading
- pitch
- roll
- field of view
- target longitude
- target latitude
- target altitude
- transition progress

## Movement model

A transition should separate:

1. The shape of the camera path through space.
2. The camera's movement along that path.
3. The orientation and lens behavior while moving.
4. Arrival framing.

## Path families

Initial useful path families may include:

- local glide
- departure arc
- long-distance geographic arc
- descent/arrival arc
- direct dolly-like movement
- orbit/reveal movement
- bird's-eye transition

Do not implement these as unrelated animation hacks. They should share a common camera-state output.

## Distance-aware behavior

Camera duration, apex altitude, pitch, and arrival behavior should respond to geographic distance.

## Long-range transitions

Prefer geographic/geodesic logic for long-range motion. Local movement can use a local tangent/ENU-style approximation where appropriate.

## Renderer rule

The camera system produces canonical camera state.

MapLibre and Three.js adapters consume that state.

The camera system should not be written as direct renderer commands scattered through UI code.
