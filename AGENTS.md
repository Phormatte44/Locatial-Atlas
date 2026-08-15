# Agent Instructions — Locational Atlas

You are working inside Locational Atlas, the standalone spatial/map engine.

## Scope

Atlas owns geographic rendering, camera systems, world-space interaction, terrain, boundaries, renderer integration, geographic geometry, and related spatial infrastructure.

Atlas does not own Creator Studio UX, consumer product UX, search query resolution, content editing, publishing, or unrelated application logic.

## Mandatory rules

1. Keep reusable engine code in `src`.
2. Keep experiments, temporary controls, hard-coded demo scenes, and visual tests in `lab`.
3. `src` must never import from `lab`.
4. Do not hard-code demo locations into reusable engine systems.
5. Do not expose MapLibre, Three.js, GSAP, or provider internals through public application contracts unless explicitly approved.
6. Do not silently change geographic coordinate conventions.
7. Do not silently change the camera contract.
8. Do not replace core libraries without documenting the reason.
9. Prefer adapters around external providers.
10. Record meaningful architectural changes in `DECISIONS.md`.
11. Preserve TypeScript type safety.
12. Never commit secrets, API tokens, or private credentials.

## Before changing architecture

Read:

- `ARCHITECTURE.md`
- `SPATIAL-CONTRACT.md`
- the nearest folder-specific `AGENTS.md`
- `DECISIONS.md`

## Definition of done

A change is not complete if it only works in one Lab scene through hard-coded values. Reusable behavior must live behind an appropriate engine or subsystem boundary.
