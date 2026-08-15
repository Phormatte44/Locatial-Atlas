# Contract Agent Instructions

Changes in this folder can affect every product that consumes Locational Atlas.

Creator Studio’s Director map is a live sibling consumer of `AtlasEngine`, `AtlasMapView`, and `src/index.ts`. Public-contract edits land in Studio immediately.

## Rules

- Keep contracts small.
- Prefer geographic concepts over renderer-specific concepts.
- Do not expose MapLibre objects, Three.js objects, GSAP timelines, shaders, or provider response types.
- Avoid breaking changes unless necessary.
- Document every meaningful public-contract change in `DECISIONS.md`.
- If a capability can remain internal to Atlas, keep it internal.
- Do not add Studio-only types, MapLibre objects, or a draw/Terra Draw API to this contract unless explicitly tasked.
- Studio keeps a `.d.ts` shim so its `tsc` does not load Atlas MapLibre 5 types against Studio MapLibre 6. New public methods must be exportable from `src/index.ts` without pulling renderer types.
