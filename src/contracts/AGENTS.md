# Contract Agent Instructions

Changes in this folder can affect every product that consumes Locational Atlas.

## Rules

- Keep contracts small.
- Prefer geographic concepts over renderer-specific concepts.
- Do not expose MapLibre objects, Three.js objects, GSAP timelines, shaders, or provider response types.
- Avoid breaking changes unless necessary.
- Document every meaningful public-contract change in `DECISIONS.md`.
- If a capability can remain internal to Atlas, keep it internal.
