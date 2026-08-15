# Spatial Contract

This document defines the boundary between Locational Atlas and applications that consume it.

The contract should remain small and renderer-agnostic.

## Core geographic camera state

Atlas should support a canonical camera state based on geographic values:

- longitude
- latitude
- altitude in meters
- heading in degrees
- pitch in degrees
- roll in degrees
- field of view
- optional geographic look-at target

## Core application requests

Applications should be able to ask Atlas to:

- set or update camera state
- frame a geographic place or bounds
- play a transition between camera states
- render or update world-space geometry
- highlight a geographic feature or place
- clear highlights
- project a geographic position to screen space
- unproject a screen position to geographic space
- report geographic hover/selection results

## Core events Atlas may report

Atlas may report:

- hovered geographic feature
- selected geographic feature
- camera state changes
- transition started
- transition completed
- renderer/data readiness changes
- recoverable data/rendering errors

## Prohibited coupling

Applications should not directly control:

- MapLibre internal layers
- Three.js scene objects
- GSAP timelines
- shader uniforms
- camera implementation internals
- terrain internals

Those belong behind Atlas.
