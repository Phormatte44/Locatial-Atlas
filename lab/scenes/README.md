# Lab scenes

Scenes bundle the geographic content a Lab run exercises: places, world markup, and (later) camera or lighting presets. They sit above `lab/presets/`, which holds reusable building blocks.

Camera path families live in `src/camera/paths/`. Future Lab buttons should target a live path family id (`local-glide`, `orbit-reveal`, `departure-arrival-arc`), not a markdown file.

## Pattern

Each scene file exports:

- `{name}Places` — `AtlasPlace[]` for `PlaceSelector` and camera framing
- `{name}WorldMarkup` — `WorldMarkup[]` passed to `AtlasEngine.setWorldMarkup`
- `{name}Scene` — a single object with `id`, `name`, `places`, and `worldMarkup`

`lab/app/App.tsx` picks one scene and wires it into the Lab shell. Swap scenes by changing the import; do not hard-code demo geography in `App.tsx`.

## Presets vs scenes

| Layer | Role |
| --- | --- |
| `lab/presets/` | Shared fragments: place lists, markup recipes, geo bounds helpers |
| `lab/scenes/` | Named compositions used for repeatable visual and camera tests |

Scenes may import from presets. Presets must not import from scenes.

## Current scenes

- **`defaultScene`** — London and Dubai with spheres, labels, core circles, area polygons, and a geodesic route line. Used by the default Lab app today.
- **`longRangeScene`** — Stub for long-distance transition work. Empty until that arc starts.

## Adding a scene

1. Create `lab/scenes/myScene.ts` following the exports above.
2. Reuse or extend presets rather than duplicating coordinates.
3. Import the scene in `lab/app/App.tsx` (or a future scene switcher control).
4. Keep engine behavior in `src/`; scenes only supply data the public API accepts.
