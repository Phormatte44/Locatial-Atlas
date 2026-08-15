# departure-arrival-arc

**Status:** live  
**Id:** `departure-arrival-arc`  
**Duration:** 5.5s  
**Auto-select:** horizontal distance ≥ 500 km

## Intent

A long-range editorial flight. Leave one place, climb, cruise along the geodesic, descend into the next. London → Dubai is the reference case.

## Shape

Three eased phases on one geodesic:

1. **Departure (0–22%)** — climb to apex, heading turns onto the route, pitch settles to 32° cruise.
2. **Cruise (22–78%)** — hold apex altitude, route heading, cruise pitch.
3. **Arrival (78–100%)** — descend to framing altitude, heading eases to the arrival pose, pitch to arrival framing.

Apex altitude is `max(from, to) altitude + min(distance × 0.35, 8_000 km)`.

## Feel

Commit, then resolve. Climb should read as leaving. Descent should read as arriving. Cruise should not fidget.

## Knobs

| Knob | Current |
| --- | --- |
| Duration | 5.5s |
| Distance floor | 500 km |
| Departure phase | 0–22% |
| Arrival phase | 78–100% |
| Cruise pitch | 32° |
| Apex lift | 35% of distance, capped at 8,000 km |

## Not this family

- Shallower long-range move → planned [`low-arc.md`](./low-arc.md)
- Higher, more orbital long-range move → planned [`high-arc.md`](./high-arc.md)
- Mid-range reveal without climb → [`orbit-reveal.md`](./orbit-reveal.md)
