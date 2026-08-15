# local-glide

**Status:** live  
**Id:** `local-glide`  
**Duration:** 1.2s  
**Auto-select:** horizontal distance &lt; 3 km

## Intent

A short, calm move between nearby places. Neighborhood, campus, or same-district framing. No climb, no orbit, no route heading takeover.

## Shape

Geodesic interpolation of longitude/latitude. Altitude, heading, pitch, roll, and FOV lerp from current pose to the framing target.

## Feel

Glide. Precise. No flourish. The subject should feel like it was already almost in frame.

## Knobs

| Knob | Current |
| --- | --- |
| Duration | 1.2s |
| Distance ceiling | 3 km |
| Apex lift | none |
| Heading | lerp from/to |

## Not this family

- Straighter-than-geodesic local moves → see planned [`linear.md`](./linear.md)
- Mid-range city-to-city with a reveal → [`orbit-reveal.md`](./orbit-reveal.md)
