# orbit-reveal

**Status:** live  
**Id:** `orbit-reveal`  
**Duration:** 3s  
**Auto-select:** 3 km – 500 km

## Intent

A regional move that shows the destination rather than sliding straight at it. City-to-city, metro-to-metro, coast-to-inland inside a country.

## Shape

Geodesic progress with a lateral offset to the right of the route. Offset peaks at mid-move (`sin(πt)`), scaled to ~18% of distance, clamped 2–90 km. Slight altitude lift at mid-move. Heading follows the route plus a ~40° sweep, then eases into the arrival heading after 85% progress.

## Feel

Reveal. The destination comes into view as if the camera stepped aside, not as if it teleported along a line.

## Knobs

| Knob | Current |
| --- | --- |
| Duration | 3s |
| Distance band | 3–500 km |
| Lateral offset | 18% of distance, 2–90 km |
| Altitude lift | 12% of max(from, to) altitude × sin(πt) |
| Heading sweep | 40° |
| Heading settle | last 15% of progress |

## Not this family

- Short neighborhood moves → [`local-glide.md`](./local-glide.md)
- Intercontinental climb/cruise/descend → [`departure-arrival-arc.md`](./departure-arrival-arc.md)
- Following an authored polyline → planned [`route.md`](./route.md)
