# Locational Atlas

Locational Atlas is the standalone spatial/map engine for Locational.

It exists to develop, test, and eventually expose the geographic world system used by other Locational products.

## Atlas owns

- Globe and map rendering
- Geographic projection and coordinates
- Camera state, movement, framing, and transitions
- Terrain and elevation
- Boundaries and geographic layers
- MapLibre integration
- Three.js integration
- Lighting, materials, shadows, and atmosphere
- Geographic hit testing and hover/selection detection
- World-space geometry and spatial markup rendering
- Data-provider adapters for tiles, terrain, boundaries, and related geographic sources

## Atlas does not own

- Creator Studio UI
- Consumer application UI
- Search interface or query resolver
- Content editing
- Story structure
- Publishing
- Timeline authoring
- Markup authoring UI
- Business logic belonging to another Locational product

## Repository rule

The `lab` exists to develop and test Atlas.

The `lab` may depend on `src`.

`src` must never depend on `lab`.

## Initial stack

- TypeScript
- React
- Vite
- MapLibre GL JS
- Three.js
- GSAP
- Turf

## First milestone

Prove that:

1. The world renders correctly.
2. The camera contract works.
3. Atlas can move between two geographic places.
4. MapLibre and Three.js remain aligned throughout movement.
5. The Lab controls Atlas through public contracts rather than reaching directly into renderer internals.
