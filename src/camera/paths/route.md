# route

**Status:** planned signpost  
**Id:** none yet  
**Closest live family:** [`orbit-reveal`](./orbit-reveal.md)

## Intent

The camera follows an authored geographic path — a road, a geodesic polyline already in world markup, a story route — rather than the origin–destination great circle. Progress is along the route’s measured length.

## Why it is not live

Live families only know `from` and `to` camera states. Route needs an extra input (a geographic linestring) and a contract for who owns that path. Studio markup is display-only in Atlas today; Atlas must not grow a draw API to feed this.

## When to promote

Promote when Atlas can accept an optional route polyline on a transition request without leaking MapLibre or Studio types, and Lab has a scene that supplies that polyline through the public API.

## Knobs to decide

- Input: `WorldLineMarkup` vs a dedicated `GeographicPath`
- Height: drape on terrain vs a low offset
- Heading: tangent to the route vs look-at a moving target
- What happens if the route is shorter than the framing move

Do not auto-select this name. Do not add a Lab button until a `.ts` sampler exists.
