# low-arc

**Status:** planned signpost  
**Id:** none yet  
**Closest live family:** [`departure-arrival-arc`](./departure-arrival-arc.md)

## Intent

A long-range move that stays closer to the ground. Same departure / cruise / arrival phases, lower apex, steeper sense of traveling over terrain rather than leaving it.

## Why it is not live

It is a height-and-pitch retune of `departure-arrival-arc`. Isolating it before the live arc is taste-stable would create two files that drift together.

## When to promote

Promote when a product shot needs “across the country” without “up to cruise altitude,” and Lab can show low-arc vs the current arc as two different sentences.

## Knobs to decide

- Apex lift well below current `distance × 0.35`
- Cruise pitch closer to arrival framing
- Duration (maybe shorter than 5.5s)
- How much terrain should influence altitude once framing is terrain-aware

Do not auto-select this name. Do not add a Lab button until a `.ts` sampler exists.
