# high-arc

**Status:** planned signpost  
**Id:** none yet  
**Closest live family:** [`departure-arrival-arc`](./departure-arrival-arc.md)

## Intent

The same long-range climb / cruise / descend grammar, with a higher apex and a more orbital read. Use when the story is the distance itself — continents, oceans, “we are leaving the neighborhood of the planet.”

## Why it is not live

`departure-arrival-arc` already owns ≥ 500 km. High-arc should be a retuned (or forked) sampler of that family, not a MapLibre `flyTo` variant. Until the live arc has been aged in Lab, a second long-range id would only split attention.

## When to promote

Promote when we can tell high-arc and the current departure-arrival arc apart in a side-by-side Lab run, and a product needs to request the higher move instead of auto-select.

## Knobs to decide

- Apex multiplier vs current `distance × 0.35` cap
- Cruise pitch (likely flatter than 32°)
- Duration (likely longer than 5.5s)
- Whether heading can roll slightly at apex

Do not auto-select this name. Do not add a Lab button until a `.ts` sampler exists.
