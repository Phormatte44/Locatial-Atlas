# Agent Instructions — Locational Atlas

You are working inside Locational Atlas, the standalone spatial/map engine.

## Scope

Atlas owns geographic rendering, camera systems, world-space interaction, terrain, boundaries, renderer integration, geographic geometry, and related spatial infrastructure.

Atlas does not own Creator Studio UX, consumer product UX, search query resolution, content editing, publishing, or unrelated application logic.

Creator Studio’s Director map is a live sibling consumer of this repo’s public API (`AtlasEngine`, `AtlasMapView`, `src/index.ts`). Studio owns UX; Atlas owns map/globe rendering, camera, terrain, markup display, hover/select, and events. Do not import Studio into Atlas. Do not ask Studio to import `lab/` or renderer internals.

## Mandatory rules

1. Keep reusable engine code in `src`.
2. Keep experiments, temporary controls, hard-coded demo scenes, and visual tests in `lab`.
3. `src` must never import from `lab`.
4. Do not hard-code demo locations into reusable engine systems.
5. Do not expose MapLibre, Three.js, GSAP, or provider internals through public application contracts unless explicitly approved. Studio must keep using the public API only; a type shim in Studio exists because Atlas MapLibre 5 types collide with Studio MapLibre 6.
6. Do not silently change geographic coordinate conventions.
7. Do not silently change the camera contract.
8. Do not replace core libraries without documenting the reason.
9. Prefer adapters around external providers.
10. Record meaningful architectural changes in `DECISIONS.md`.
11. Preserve TypeScript type safety.
12. Never commit secrets, API tokens, or private credentials.
13. Treat `src/index.ts`, `AtlasEngine`, and `AtlasMapView` as a live product contract. Studio is linked to this `src/` via Vite; public-API and camera-contract changes land in Studio immediately.
14. Do not add a markup draw API, Terra Draw, or Studio-specific UX into Atlas unless explicitly tasked. Display markup with `setWorldMarkup`; Studio owns markup state and authoring.
15. If `public/map-styles/locatial-editorial.json` changes, note that Studio copies that file and must recopy it.

## Before changing architecture

Read:

- `ARCHITECTURE.md`
- `SPATIAL-CONTRACT.md`
- the nearest folder-specific `AGENTS.md`
- `DECISIONS.md`
- Camera work: `src/camera/CAMERA-SYSTEM.md` and `src/camera/paths/`

## Definition of done

A change is not complete if it only works in one Lab scene through hard-coded values. Reusable behavior must live behind an appropriate engine or subsystem boundary.
