# linear

**Status:** planned signpost  
**Id:** none yet  
**Closest live family:** [`local-glide`](./local-glide.md)

## Intent

A local move that feels like a dolly or track: the shortest readable path between two nearby poses. Less “along the Earth,” more “through the shot.”

## Why it is not live

`local-glide` already covers the &lt; 3 km band, but it still follows a geodesic and lerps heading. Linear would be a distinct sampler: local tangent / ENU interpolation, optional heading lock, no geographic flourish.

## When to promote

Promote to a `CameraPathFamily` id when we need a move that must not follow Earth curvature, or when Lab needs a button that is not `local-glide`.

## Knobs to decide

- Distance ceiling (likely still neighborhood-scale)
- ENU vs geodesic position
- Whether heading stays locked on the target
- Duration vs `local-glide` 1.2s

Do not auto-select this name. Do not add a Lab button until a `.ts` sampler exists.
